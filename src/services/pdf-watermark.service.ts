import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

/**
 * Applies a diagonal "Public Redacted Version" watermark to every page of a PDF.
 * Returns the watermarked PDF as a Buffer.
 */
export async function applyWatermark(pdfBuffer: Buffer): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
        const { width, height } = page.getSize();
        const text = "PUBLIC REDACTED VERSION";
        const fontSize = 40;
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
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
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
