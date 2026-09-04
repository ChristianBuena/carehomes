import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type AgreementPdfInput = {
  title: string;
  version: string;
  content: string;
  signedName: string;
  email: string;
  signedAt: Date;
  ipAddress?: string | null;
};

export async function generateMembershipAgreementPdf({
  title,
  version,
  content,
  signedName,
  email,
  signedAt,
  ipAddress,
}: AgreementPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const titleSize = 16;
  const bodySize = 10;
  const lineHeight = 15;

  const addPageIfNeeded = (requiredHeight: number) => {
    if (y - requiredHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawWrappedText = (
    text: string,
    font = regularFont,
    size = bodySize,
    color = rgb(0, 0, 0)
  ) => {
    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);

      if (width > contentWidth && line) {
        addPageIfNeeded(lineHeight);

        page.drawText(line, {
          x: margin,
          y,
          size,
          font,
          color,
        });

        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      addPageIfNeeded(lineHeight);

      page.drawText(line, {
        x: margin,
        y,
        size,
        font,
        color,
      });

      y -= lineHeight;
    }
  };

  // Title
  drawWrappedText(title, boldFont, titleSize);
  y -= 8;

  // Agreement metadata
  drawWrappedText(`Agreement Version: ${version}`, boldFont);
  drawWrappedText(
    `Signed By: ${signedName}`,
    regularFont
  );
  drawWrappedText(`Email: ${email}`, regularFont);
  drawWrappedText(
    `Signed At: ${signedAt.toISOString()}`,
    regularFont
  );

  if (ipAddress) {
    drawWrappedText(`IP Address: ${ipAddress}`, regularFont);
  }

  y -= 15;

  // Agreement content
  for (const paragraph of content.split(/\n+/)) {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      y -= lineHeight;
      continue;
    }

    drawWrappedText(trimmed);
    y -= 5;
  }

  // Signature section
  addPageIfNeeded(100);

  y -= 15;

  page.drawText("Electronic Signature", {
    x: margin,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 25;

  page.drawText(signedName, {
    x: margin,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 15;

  page.drawText("Electronic signature accepted", {
    x: margin,
    y,
    size: 9,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  return pdfDoc.save();
}