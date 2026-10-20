import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import zlib from "node:zlib";

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
 * Returns true if the PDF has extractable text content or font definitions.
 */
export async function isPdfTextSearchable(pdfBuffer: Buffer): Promise<boolean> {
    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        if (pages.length === 0) return false;

        const rawString = pdfBuffer.toString("latin1");

        // 1. Direct check: Check for uncompressed text markers or Font dictionary references
        if (rawString.includes("/Font") || (rawString.includes("BT") && rawString.includes("ET"))) {
            return true;
        }

        // 2. Compressed stream check: Extract and decompress streams to find text operators
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let match;

        while ((match = streamRegex.exec(rawString)) !== null) {
            try {
                const streamBytes = Buffer.from(match[1], "latin1");
                const decompressed = zlib.inflateSync(streamBytes).toString("latin1");
                
                if (decompressed.includes("BT") && decompressed.includes("ET")) {
                    return true;
                }
            } catch {
                // Not all streams are Flate compressed or text streams; continue checking
                continue;
            }
        }

        return false;
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
