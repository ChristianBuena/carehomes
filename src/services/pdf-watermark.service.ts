import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

/** SOW 11.2: drafts (any rebuttal document not yet approved). */
export const DRAFT_MARK = "FOR ATTORNEY REVIEW ONLY";
/** The stored copy of an approved rebuttal's document. */
export const PUBLIC_COPY_MARK = "PUBLIC REDACTED VERSION";

/**
 * Applies a diagonal watermark (default "PUBLIC REDACTED VERSION") to every
 * page of a PDF. Returns the watermarked PDF as a Buffer.
 * The draft mark also gets a solid banner at the top of every page so it
 * stays readable when printed or photocopied.
 */
export async function applyWatermark(pdfBuffer: Buffer, text: string = PUBLIC_COPY_MARK): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
        const { width, height } = page.getSize();
        // Fit the diagonal text inside the page (long marks on small pages).
        const fontSize = Math.min(40, (Math.hypot(width, height) * 0.8) / Math.max(1, font.widthOfTextAtSize(text, 1)));
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        // Draw watermark diagonally across the center of each page
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: fontSize,
            font,
            color: rgb(0.75, 0.75, 0.75),
            opacity: 0.3,
            rotate: degrees(45),
        });

        if (text === DRAFT_MARK) {
            const bannerSize = Math.min(14, (width * 0.9) / Math.max(1, font.widthOfTextAtSize(text, 1)));
            const bannerWidth = font.widthOfTextAtSize(text, bannerSize);
            page.drawRectangle({ x: 0, y: height - bannerSize * 2.2, width, height: bannerSize * 2.2, color: rgb(1, 1, 1), opacity: 0.85 });
            page.drawText(text, {
                x: (width - bannerWidth) / 2,
                y: height - bannerSize * 1.6,
                size: bannerSize,
                font,
                color: rgb(0.7, 0.1, 0.1),
            });
        }
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
}

export type MarkableKind = "pdf" | "png" | "jpeg";

/** Identifies a document by its bytes (never by name or claimed type). */
export function detectMarkableKind(bytes: Uint8Array): MarkableKind | null {
    const b = Buffer.from(bytes.subarray(0, 8));
    if (b.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
    if (b.length >= 8 && b.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
    return null;
}

/**
 * Returns a PDF with `text` stamped on every page. PNG and JPEG images are
 * placed on a page of their own first. Throws for anything it cannot mark
 * (Word files, encrypted or corrupt PDFs): callers must then NOT serve the
 * unmarked original.
 */
export async function markDocument(bytes: Uint8Array, text: string): Promise<Buffer> {
    const kind = detectMarkableKind(bytes);
    if (kind === "pdf") return applyWatermark(Buffer.from(bytes), text);
    if (kind === "png" || kind === "jpeg") {
        const doc = await PDFDocument.create();
        const image = kind === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const w = Math.max(200, image.width * scale);
        const h = Math.max(200, image.height * scale);
        doc.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h });
        return applyWatermark(Buffer.from(await doc.save()), text);
    }
    throw new UnmarkableDocumentError();
}

export class UnmarkableDocumentError extends Error {
    constructor() {
        super("This file type cannot be watermarked");
        this.name = "UnmarkableDocumentError";
    }
}

/**
 * Checks if a PDF contains actual text (not just scanned images).
 * Returns true if the PDF has extractable text content.
 */
export async function isPdfTextSearchable(pdfBuffer: Buffer): Promise<boolean> {
    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        // pdf-lib doesn't extract text directly, but we can check
        // if the PDF has content streams with text operators
        // A basic heuristic: check raw bytes for text markers
        const rawBytes = pdfBuffer.toString("binary");
        const hasTextContent = rawBytes.includes("BT") && rawBytes.includes("ET");

        return hasTextContent && pages.length > 0;
    } catch {
        return false;
    }
}

/**
 * Validates that the uploaded file is a real PDF (not a renamed image).
 */
export function isPdfFile(buffer: Buffer): boolean {
    // PDF files start with %PDF-
    const header = buffer.slice(0, 5).toString("ascii");
    return header === "%PDF-";
}
