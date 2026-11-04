import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { v2 as cloudinary } from "cloudinary";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Serving stored files without handing out storage URLs (SOW 11.3).
 *
 * Member files live in UploadThing; rebuttal documents in Cloudinary. The
 * browser never receives either provider's URL: authenticated routes check
 * access on every request, fetch the bytes server-side with a short-lived
 * signed URL, and stream them back. Revoking a share link therefore stops
 * downloads immediately.
 *
 * Provider settings still matter for files uploaded before this change (their
 * public URLs may already have been seen). See docs/MIGRATION_RUNBOOK.md.
 */

const SIGNED_URL_TTL_SECONDS = 60;

// Types we let the browser render in place. Everything else (SVG, HTML,
// DOCX, unknown) is forced to download so it can never run on our origin.
const INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

export class StoredFileUnavailableError extends Error {
  constructor(message = "Stored file could not be retrieved") {
    super(message);
    this.name = "StoredFileUnavailableError";
  }
}

let utapi: UTApi | null = null;
function getUtapi(): UTApi {
  utapi ??= new UTApi();
  return utapi;
}

/** True when new member uploads should be private at UploadThing. */
export function uploadThingPrivateFiles(): boolean {
  return process.env.UPLOADTHING_PRIVATE_FILES === "true";
}

/**
 * Server-side fetch URL for a member file. A signed URL works for private
 * and public files alike; if signing is not possible (e.g. misconfigured
 * token), fall back to the stored URL, which only works for public files.
 */
export async function memberFileFetchUrl(file: { fileKey: string; fileUrl: string }): Promise<string> {
  try {
    const { ufsUrl } = await getUtapi().generateSignedURL(file.fileKey, { expiresIn: SIGNED_URL_TTL_SECONDS });
    return ufsUrl;
  } catch (err) {
    console.error("[storage] Could not sign UploadThing URL:", err instanceof Error ? err.message : err);
    return file.fileUrl;
  }
}

const CLOUDINARY_URL =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|raw|video)\/(upload|authenticated|private)\/(?:s--[^/]+--\/)?(?:v(\d+)\/)?(.+)$/;

/**
 * Server-side fetch URL for a rebuttal document stored in Cloudinary.
 * Documents uploaded as `authenticated` (all new uploads) need a signed URL;
 * older `upload` (public) documents are fetched directly.
 */
export function rebuttalDocumentFetchUrl(documentUrl: string): string {
  const m = CLOUDINARY_URL.exec(documentUrl);
  if (!m || m[3] === "upload") return documentUrl;
  const [, cloudName, resourceType, type, version, rest] = m;
  // Image/video public ids carry no extension (it is the format); raw ids do.
  let publicId = rest;
  let format: string | undefined;
  if (resourceType !== "raw") {
    const dot = rest.lastIndexOf(".");
    if (dot > 0) {
      publicId = rest.slice(0, dot);
      format = rest.slice(dot + 1);
    }
  }
  return cloudinary.url(publicId, {
    cloud_name: cloudName,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    resource_type: resourceType,
    type,
    version,
    format,
    sign_url: true,
    secure: true,
    urlAnalytics: false,
  });
}

/** Reads a stored file's bytes. Data URLs (stored watermarked copies) are decoded locally. */
export async function readStoredBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma < 0 || !url.slice(0, comma).endsWith(";base64")) throw new StoredFileUnavailableError();
    return new Uint8Array(Buffer.from(url.slice(comma + 1), "base64"));
  }
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", redirect: "follow" });
  } catch {
    throw new StoredFileUnavailableError();
  }
  if (!res.ok) throw new StoredFileUnavailableError(`Storage answered ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function contentDisposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "file";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Response for a file download. The content type comes from our database,
 * never from the storage provider, and the response is locked down so an
 * uploaded file cannot script our origin.
 */
export function fileResponse(
  bytes: Uint8Array,
  opts: { filename: string; mimeType: string; download?: boolean }
): NextResponse {
  const mimeType = opts.mimeType || "application/octet-stream";
  const inline = !opts.download && INLINE_TYPES.has(mimeType);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", opts.filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // `sandbox` stops Chrome's PDF viewer, so inline PDFs get the strict
      // policy without it (a PDF cannot run script on our origin anyway).
      "Content-Security-Policy":
        inline && mimeType === "application/pdf"
          ? "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'"
          : "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * Opaque, per-link reference for a shared file, so the public share page and
 * API never reveal internal file ids. Derived (not stored): HMAC of the link
 * id and file id under the server secret.
 */
export function shareFileRef(linkId: string, fileId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return createHmac("sha256", secret).update(`share-file:${linkId}:${fileId}`).digest("base64url").slice(0, 32);
}

export function shareFileRefMatches(ref: string, linkId: string, fileId: string): boolean {
  const expected = Buffer.from(shareFileRef(linkId, fileId));
  const given = Buffer.from(ref);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function shareFileDownloadPath(token: string, linkId: string, fileId: string): string {
  return `/api/share/${encodeURIComponent(token)}/files/${shareFileRef(linkId, fileId)}`;
}

export function storageErrorResponse(): NextResponse {
  return NextResponse.json({ error: "The file could not be retrieved. Please try again later." }, { status: 502 });
}
