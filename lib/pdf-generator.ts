// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";

import { Part } from "@/lib/types";

// ----------------------
// Types
// ----------------------
export type SaleItem = {
  sale: {
    quantity: number;
    totalAmount: string | number;
  };
  part: Part | null;
  user: { name: string } | null;
};

export interface InvoiceData {
  customer: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  sales: SaleItem[];
  issueId: number;
  createdAt: Date;
  createdBy: string;
}

// ----------------------
// Theme Colors
// ----------------------
const DARK_GRAY: [number, number, number] = [45, 45, 45];
const DARK_RED: [number, number, number] = [139, 0, 0];
const LIGHT_GRAY: [number, number, number] = [240, 240, 240];
const TEXT_COLOR: [number, number, number] = [50, 50, 50];

// ----------------------
// Load Persian font
// ----------------------
const loadFontBase64 = async (): Promise<string> => {
  try {
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Vazirmatn-Regular.ttf"
    );
    const fontBuffer = await fs.readFile(fontPath);
    return fontBuffer.toString("base64");
  } catch {
    console.warn("⚠️ Persian font not found, fallback to default.");
    return "";
  }
};

// ----------------------
// Load logo and watermark
// ----------------------
const loadImageBase64 = async (filename: string): Promise<string> => {
  try {
    const filePath = path.join(process.cwd(), "public", filename);
    const buffer = await fs.readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    console.warn(`⚠️ ${filename} missing`);
    return "";
  }
};

// ----------------------
// Generate Invoice PDF
// ----------------------
export async function generateInvoicePDF(
  data: InvoiceData
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = 120;

  // Load font
  const fontBase64 = await loadFontBase64();
  let fontLoaded = false;
  if (fontBase64) {
    try {
      doc.addFileToVFS("vazirmatn.ttf", fontBase64);
      doc.addFont("vazirmatn.ttf", "vazirmatn", "normal");
      fontLoaded = true;
    } catch (err) {
      console.warn("Failed to load font", err);
    }
  }

  // Load images
  const logoBase64 = await loadImageBase64("logo.png");
  const watermarkBase64 = await loadImageBase64("watermark.png");

  // ----------------------
  // WATERMARK background
  // ----------------------
  if (watermarkBase64) {
    const wmSize = 300;
    const gs = doc.GState({ opacity: 0.1 });
    doc.setGState(gs);

    doc.addImage(
      watermarkBase64,
      "PNG",
      (pageWidth - wmSize) / 2,
      (pageHeight - wmSize) / 2,
      wmSize,
      wmSize,
      "",
      "FAST"
    );

    const gsReset = doc.GState({ opacity: 1 });
    doc.setGState(gsReset);
  }

  // ----------------------
  // HEADER
  // ----------------------
  doc.setFillColor(...DARK_GRAY);
  doc.rect(0, 0, pageWidth, 120, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 40, 15, 70, 70);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text("Diplomasi Ltd", pageWidth / 2, 40, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Kabul - Afghanistan | Main Road | Shop #12", pageWidth / 2, 60, {
    align: "center",
  });

  if (fontLoaded) {
    doc.setFont("vazirmatn", "normal");
    doc.setFontSize(14);
    doc.text("بل پرزه جات وسایط", pageWidth / 2, 80, { align: "center" });

    doc.setFontSize(12);
    doc.text(
      "کابل - افغانستان | سرک عمومی | دکان شماره ۱۲",
      pageWidth / 2,
      100,
      { align: "center" }
    );
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice ID: INV-${String(data.issueId).padStart(4, "0")}`, 40, 90);
  doc.text(`Date: ${format(data.createdAt, "PPP")}`, pageWidth - 40, 90, {
    align: "right",
  });

  y += 60;

  // ----------------------
  // TABLE HEADER
  // ----------------------
  const colWidth = (pageWidth - 80) / 6;
  doc.setFillColor(...DARK_RED);
  doc.rect(40, y, pageWidth - 80, 25, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("#", 45, y + 17);
  doc.text("Part No.", 45 + colWidth, y + 17);
  doc.text("Name", 45 + colWidth * 2, y + 17);
  doc.text("Qty", 45 + colWidth * 3, y + 17);
  doc.text("Unit Price", 45 + colWidth * 4, y + 17);
  doc.text("Total", 45 + colWidth * 5, y + 17);

  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);

  // ----------------------
  // TABLE ROWS
  // ----------------------
  let totalAmount = 0;

  data.sales.forEach((s, idx) => {
    if (y > pageHeight - 140) {
      doc.addPage();
      y = 80;

      if (watermarkBase64) {
        const wmSize2 = 300;
        const gs = doc.GState({ opacity: 0.1 });
        doc.setGState(gs);

        doc.addImage(
          watermarkBase64,
          "PNG",
          (pageWidth - wmSize2) / 2,
          (pageHeight - wmSize2) / 2,
          wmSize2,
          wmSize2,
          "",
          "FAST"
        );

        const gsReset = doc.GState({ opacity: 1 });
        doc.setGState(gsReset);
      }
    }

    const totalValue =
      typeof s.sale.totalAmount === "string"
        ? parseFloat(s.sale.totalAmount)
        : s.sale.totalAmount;
    const qty = s.sale.quantity;
    const unitPrice = qty ? totalValue / qty : 0;
    totalAmount += totalValue;

    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(40, y, pageWidth - 80, 20, "F");

    doc.text(String(idx + 1), 45, y + 14);
    doc.text(s.part?.partNumber || "N/A", 45 + colWidth, y + 14);
    doc.text(s.part?.name || "N/A", 45 + colWidth * 2, y + 14);
    doc.text(String(qty), 45 + colWidth * 3, y + 14);
    doc.text(unitPrice.toFixed(2), 45 + colWidth * 4, y + 14);
    doc.text(totalValue.toFixed(2), 45 + colWidth * 5, y + 14);

    y += 20;
  });

  // ----------------------
  // TOTAL BOX
  // ----------------------
  y += 30;
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(pageWidth - 200, y, 160, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_RED);
  doc.text("Total:", pageWidth - 180, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${totalAmount.toFixed(2)} AFN`, pageWidth - 180, y + 35);

  // ----------------------
  // SIGNATURE AREA
  // ----------------------
  y += 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_COLOR);
  doc.text("Authorized Signature", 40, y);
  doc.text("Company Stamp", pageWidth - 200, y);

  if (fontLoaded) {
    doc.setFont("vazirmatn", "normal");
    doc.text("امضاء مسئول", 40, y + 20);
    doc.text("مهر شرکت", pageWidth - 200, y + 20);
  }

  // ----------------------
  // FOOTER
  // ----------------------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This invoice is system-generated and requires no signature.",
    pageWidth / 2,
    pageHeight - 30,
    { align: "center" }
  );

  if (fontLoaded) {
    doc.setFont("vazirmatn", "normal");
    doc.text(
      "این فاکتور توسط سیستم تولید شده و نیاز به امضاء ندارد.",
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
  }

  // ----------------------
  // OUTPUT
  // ----------------------
  const buffer = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buffer);
}

// ----------------------
// Helpers for Blob/Base64
// ----------------------
export async function generateInvoiceBlob(data: InvoiceData): Promise<Blob> {
  const uint8 = await generateInvoicePDF(data);
  const arrayBuffer = uint8.slice().buffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

export async function generateInvoiceBase64(
  data: InvoiceData
): Promise<string> {
  const uint8 = await generateInvoicePDF(data);
  return Buffer.from(uint8).toString("base64");
}

export async function generateInvoiceDataURL(
  data: InvoiceData
): Promise<string> {
  const base64 = await generateInvoiceBase64(data);
  return `data:application/pdf;base64,${base64}`;
}
