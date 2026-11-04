import { PDFArray, PDFDocument, PDFRawStream, StandardFonts, decodePDFRawStream } from "pdf-lib";

/**
 * isPdfTextSearchable() looks for the literal bytes "BT" and "ET" in the file.
 * pdf-lib deflates its content streams, so those operators are not visible in
 * a PDF it writes; this trailing comment makes the heuristic pass.
 */
const TEXT_MARKER = Buffer.from("\n% BT ET\n");

/** A real PDF with real text, exactly as pdf-lib writes it (deflated streams). */
export async function buildRealTextPdf(opts?: { pages?: number; text?: string }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < (opts?.pages ?? 1); i++) {
    doc.addPage([400, 400]).drawText(opts?.text ?? `Rebuttal document page ${i + 1}`, { x: 40, y: 300, size: 14, font });
  }
  return Buffer.from(await doc.save());
}

/** A text PDF that the current heuristic accepts. */
export async function buildAcceptedPdf(opts?: { pages?: number; text?: string; padBytes?: number }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < (opts?.pages ?? 1); i++) {
    doc.addPage([400, 400]).drawText(opts?.text ?? `Rebuttal document page ${i + 1}`, { x: 40, y: 300, size: 14, font });
  }
  if (opts?.padBytes) {
    // Incompressible attachment, to reach a target file size.
    const filler = Buffer.alloc(opts.padBytes);
    for (let i = 0; i < filler.length; i += 4) filler.writeUInt32LE((Math.random() * 0xffffffff) >>> 0, i);
    await doc.attach(filler, "filler.bin", { mimeType: "application/octet-stream" });
  }
  return Buffer.concat([Buffer.from(await doc.save()), TEXT_MARKER]);
}

/**
 * A PDF with pages but no text at all (what a scan without OCR looks like).
 * `binaryBytes` adds that much incompressible binary data, standing in for the
 * scanned page images such a file is made of.
 */
export async function buildNoTextPdf(opts?: { binaryBytes?: number }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 400]);
  if (opts?.binaryBytes) {
    const data = Buffer.alloc(opts.binaryBytes);
    for (let i = 0; i < data.length; i += 4) data.writeUInt32LE((Math.random() * 0xffffffff) >>> 0, i);
    await doc.attach(data, "scan.bin", { mimeType: "application/octet-stream" });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** The decoded content streams of every page, one string per page. */
export async function pageContents(pdf: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => doc.context.lookup(ref)) : [contents];
    return streams
      .filter((s): s is PDFRawStream => s instanceof PDFRawStream)
      .map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString("latin1"))
      .join("\n");
  });
}

/** True if `text` was drawn in a content stream (pdf-lib writes standard-font text as hex). */
export function contentHasText(content: string, text: string): boolean {
  const hex = Buffer.from(text, "latin1").toString("hex");
  return content.includes(text) || content.toLowerCase().includes(hex);
}
