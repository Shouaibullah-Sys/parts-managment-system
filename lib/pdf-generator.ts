// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import fs from "fs/promises";
import path from "path";

import { Part } from "@/lib/types";

// ----------------------
// Persian text for jsPDF
// jsPDF ships a built-in Arabic module (doc.processArabic) that already does
// contextual shaping (isolated/initial/medial/final) AND right-to-left
// reordering. Pass raw logical Persian text straight to doc.text().
//
// Do NOT pre-shape/reorder with bidi-shaper or any reshaper here: the text
// would get reversed a second time by jsPDF, which mirrors it so it reads
// left-to-right, and the pre-substituted presentation forms get spaced with
// the wrong advance widths so the letters no longer join. (jsPDF #3867)
// ----------------------

// ----------------------
// Persian numbers & currency
// ----------------------
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const toPersianNumber = (num: number | string): string =>
  String(num).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);

const toPersianCurrency = (amount: number): string =>
  `${amount.toLocaleString("fa-IR")} افغانی`;

const toPersianDate = (date: Date): string => date.toLocaleDateString("fa-IR");

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
// Cache for static assets
// ----------------------
let cachedFont: string | null = null;
let cachedLogo: string | null = null;
let cachedWatermark: string | null = null;
let cacheInitialized = false;

// ----------------------
// Initialize cache (load all assets once)
// ----------------------
const initializeCache = async (): Promise<void> => {
  if (cacheInitialized) return;

  try {
    // Load font
    try {
      const fontPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Vazirmatn-Regular.ttf",
      );
      const fontBuffer = await fs.readFile(fontPath);
      cachedFont = fontBuffer.toString("base64");
    } catch {
      console.warn("⚠️ Persian font not found, fallback to default.");
      cachedFont = "";
    }

    // Load logo
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBuffer = await fs.readFile(logoPath);
      cachedLogo = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      console.warn("⚠️ logo.png missing");
      cachedLogo = "";
    }

    // Load watermark
    try {
      const watermarkPath = path.join(process.cwd(), "public", "watermark.png");
      const watermarkBuffer = await fs.readFile(watermarkPath);
      cachedWatermark = `data:image/png;base64,${watermarkBuffer.toString("base64")}`;
    } catch {
      console.warn("⚠️ watermark.png missing");
      cachedWatermark = "";
    }

    cacheInitialized = true;
    console.log("✅ PDF assets cached successfully");
  } catch (error) {
    console.error("Error initializing PDF cache:", error);
    // Set empty values to prevent repeated failures
    cachedFont = "";
    cachedLogo = "";
    cachedWatermark = "";
    cacheInitialized = true;
  }
};

// ----------------------
// Get cached assets
// ----------------------
const getCachedAssets = async () => {
  await initializeCache();
  return {
    font: cachedFont || "",
    logo: cachedLogo || "",
    watermark: cachedWatermark || "",
  };
};

// ----------------------
// Generate Invoice PDF
// ----------------------
export async function generateInvoicePDF(
  data: InvoiceData,
): Promise<Uint8Array> {
  try {
    // Validate input data
    if (!data || !data.customer || !data.sales || data.sales.length === 0) {
      throw new Error("Invalid invoice data provided");
    }

    if (!data.customer.name) {
      throw new Error("Customer name is required");
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = 120;

    // Get cached assets
    const {
      font: fontBase64,
      logo: logoBase64,
      watermark: watermarkBase64,
    } = await getCachedAssets();

    // Load font
    let fontLoaded = false;
    if (fontBase64) {
      try {
        doc.addFileToVFS("vazirmatn.ttf", fontBase64);
        doc.addFont("vazirmatn.ttf", "vazirmatn", "normal");
        fontLoaded = true;
      } catch (err) {
        console.warn("Failed to load font, using default", err);
      }
    } else {
      console.warn("No font data available, using default font");
    }

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
        "FAST",
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
    doc.text("Between Parwan Road, Kabul", pageWidth / 2, 60, {
      align: "center",
    });
    doc.text("Phone: +93 744 441 079", pageWidth / 2, 75, { align: "center" });

    if (fontLoaded) {
      doc.setFont("vazirmatn", "normal");
      doc.setFontSize(14);
      doc.text("بل پرزه جات وسایط", pageWidth / 2, 92, { align: "center" });

      doc.setFontSize(11);
      doc.text(
        "کابل — بین چهار راهی پروان دوم و سوم، مقابل قصر زرین",
        pageWidth / 2,
        110,
        { align: "center" },
      );
    }

    // ----------------------
    // INVOICE ID & DATE (Persian)
    // ----------------------
    y = 150;
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);

    if (fontLoaded) {
      doc.setFont("vazirmatn", "normal");
      doc.text(
        `آیدی فاکتور: INV-${toPersianNumber(String(data.issueId).padStart(4, "0"))}`,
        40,
        y,
      );
      doc.text(
        `تاریخ: ${toPersianDate(data.createdAt)}`,
        pageWidth - 40,
        y,
        { align: "right" },
      );
    } else {
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice ID: INV-${String(data.issueId).padStart(4, "0")}`, 40, y);
      doc.text(
        `Date: ${data.createdAt.toLocaleDateString("en-GB")}`,
        pageWidth - 40,
        y,
        { align: "right" },
      );
    }

    y += 30;

    // ----------------------
    // TABLE HEADER (Persian)
    // ----------------------
    const colWidth = (pageWidth - 80) / 5;
    doc.setFillColor(...DARK_RED);
    doc.rect(40, y, pageWidth - 80, 25, "F");

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);

    if (fontLoaded) {
      doc.setFont("vazirmatn", "normal");
    } else {
      doc.setFont("helvetica", "bold");
    }

    const headers = ["#", "نام", "مقدار", "قیمت واحد", "مجموع"];
    headers.forEach((h, i) => {
      doc.text(h, 45 + colWidth * i, y + 17);
    });

    y += 30;
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
            "FAST",
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

      // Alternating row colors
      if (idx % 2 === 0) {
        doc.setFillColor(...LIGHT_GRAY);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(40, y, pageWidth - 80, 20, "F");

      // Row number (Persian)
      doc.setFont("vazirmatn", "normal");
      doc.text(toPersianNumber(idx + 1), 45, y + 14);

      // Part name — right-aligned Persian; shrink font so it fits on ONE line.
      // Never pass maxWidth here: jsPDF would wrap the string and re-process
      // each line, scrambling the RTL order.
      const nameText = s.part?.name || "نامشخص";
      const nameColW = colWidth - 8;
      let nameSize = 10;
      doc.setFontSize(nameSize);
      while (doc.getTextWidth(nameText) > nameColW && nameSize > 6) {
        nameSize -= 0.5;
        doc.setFontSize(nameSize);
      }
      doc.text(nameText, 45 + colWidth * 2 - 4, y + 14, { align: "right" });
      doc.setFontSize(10);

      // Qty, unit price, total (Persian numerals)
      doc.text(toPersianNumber(qty), 45 + colWidth * 2, y + 14);
      doc.text(toPersianNumber(unitPrice.toFixed(2)), 45 + colWidth * 3, y + 14);
      doc.text(toPersianNumber(totalValue.toFixed(2)), 45 + colWidth * 4, y + 14);

      y += 20;
    });

    // ----------------------
    // TOTAL BOX (Persian)
    // ----------------------
    y += 30;
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(pageWidth - 200, y, 160, 40, "F");
    doc.setTextColor(...DARK_RED);
    doc.text("مجموع کل:", pageWidth - 180, y + 15);

    doc.setTextColor(...TEXT_COLOR);
    doc.text(toPersianCurrency(totalAmount), pageWidth - 180, y + 35);

    // ----------------------
    // SIGNATURE AREA (Persian)
    // ----------------------
    y += 100;
    doc.setFontSize(12);
    doc.setTextColor(...TEXT_COLOR);
    doc.text("امضاء مسئول", 40, y);
    doc.text("مهر شرکت", pageWidth - 200, y);

    // ----------------------
    // FOOTER (Persian)
    // ----------------------
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "جنس فروخته شده بعد از ۲۴ ساعت قابل واپس گرفتن نیست.",
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" },
    );

    // ----------------------
    // OUTPUT
    // ----------------------
    const buffer = doc.output("arraybuffer") as ArrayBuffer;
    return new Uint8Array(buffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
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
  data: InvoiceData,
): Promise<string> {
  const uint8 = await generateInvoicePDF(data);
  return Buffer.from(uint8).toString("base64");
}

export async function generateInvoiceDataURL(
  data: InvoiceData,
): Promise<string> {
  const base64 = await generateInvoiceBase64(data);
  return `data:application/pdf;base64,${base64}`;
}
