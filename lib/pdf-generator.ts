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

// Persian/Arabic digits → Latin (for typed invoice numbers)
const persianToLatin = (value: string): string =>
  value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));

// Numbers on the invoice: Latin digits, no decimals, thousands separator
const toEnglishNumber = (value: number | string): string => {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(persianToLatin(String(value)).replace(/,/g, ""));
  if (!Number.isFinite(n)) return persianToLatin(String(value));
  return Math.round(n).toLocaleString("en-US");
};

const toEnglishCurrency = (amount: number): string =>
  `${toEnglishNumber(amount)} افغانی`;

// Solar Hijri date with Latin digits (۱۴۰۵/۷/۲۳ → 1405/7/23)
const toEnglishDate = (date: Date): string =>
  persianToLatin(date.toLocaleDateString("fa-IR"));

// ----------------------
// Types
// ----------------------
export type SaleItem = {
  sale: {
    quantity: number;
    totalAmount: string | number;
    // نام پرزهٔ خارجی (خرید از فروشگاه دیگر) — زمانی که part تهی است
    itemName?: string | null;
    // نام فروشگاه/تأمین‌کننده (فقط پرزه خارجی)
    supplierName?: string | null;
    // بهای خرید هر واحد پرزهٔ خارجی (قابل پرداخت به فروشگاه دیگر)
    itemCost?: string | number | null;
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
  // شماره فاکتور تایپ‌شده هنگام صدور (اختیاری) — خالی = INV-{issueId}
  invoiceNumber?: string | null;
  createdAt: Date;
  createdBy: string;
}

// ----------------------
// Theme Colors (matches the reference bill: red / ink / soft gray)
// ----------------------
const BRAND_RED: [number, number, number] = [192, 0, 32];
const INK: [number, number, number] = [42, 42, 42];
const MUTED: [number, number, number] = [110, 110, 110];
const ROW_ALT: [number, number, number] = [244, 244, 244];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [214, 214, 214];
const LIGHT_GRAY: [number, number, number] = [240, 240, 240];
const DARK_GRAY: [number, number, number] = [64, 64, 64];

// ----------------------
// Cache for static assets
// ----------------------
let cachedFont: string | null = null;
let cachedFontBold: string | null = null;
let cachedFontDisplay: string | null = null;
let cachedLogo: string | null = null;
let cachedSideLogo: string | null = null;
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

    // Load bold weight (bold «مجموع کل» amount) — optional
    try {
      const boldPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Vazirmatn-Bold.ttf",
      );
      cachedFontBold = (await fs.readFile(boldPath)).toString("base64");
    } catch {
      console.warn("⚠️ Vazirmatn-Bold.ttf missing, no bold weight.");
      cachedFontBold = "";
    }

    // Load display weight for the shop name (heavier brand look) — optional
    try {
      const displayPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Vazirmatn-Black.ttf",
      );
      cachedFontDisplay = (await fs.readFile(displayPath)).toString("base64");
    } catch {
      console.warn("⚠️ Vazirmatn-Black.ttf missing, using regular for brand.");
      cachedFontDisplay = "";
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

    // Load side logo (left of the header)
    try {
      const sideLogoPath = path.join(
        process.cwd(),
        "public",
        "right-logo.jpeg",
      );
      const sideLogoBuffer = await fs.readFile(sideLogoPath);
      cachedSideLogo = `data:image/jpeg;base64,${sideLogoBuffer.toString("base64")}`;
    } catch {
      console.warn("⚠️ right-logo.jpeg missing");
      cachedSideLogo = "";
    }

    cacheInitialized = true;
    console.log("✅ PDF assets cached successfully");
  } catch (error) {
    console.error("Error initializing PDF cache:", error);
    // Set empty values to prevent repeated failures
    cachedFont = "";
    cachedLogo = "";
    cachedSideLogo = "";
    cachedWatermark = "";
    cachedFontBold = "";
    cachedFontDisplay = "";
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
    fontBold: cachedFontBold || "",
    fontDisplay: cachedFontDisplay || "",
    logo: cachedLogo || "",
    sideLogo: cachedSideLogo || "",
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
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    const contentW = W - M * 2;

    // Get cached assets
    const {
      font: fontBase64,
      fontBold: fontBoldBase64,
      fontDisplay: fontDisplayBase64,
      logo: logoBase64,
      sideLogo: sideLogoBase64,
      watermark: watermarkBase64,
    } = await getCachedAssets();

    // Load Persian font
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

    // Bold weight of the same family (used for bold amounts)
    let fontBoldLoaded = false;
    if (fontBoldBase64) {
      try {
        doc.addFileToVFS("vazirmatn-bold.ttf", fontBoldBase64);
        doc.addFont("vazirmatn-bold.ttf", "vazirmatn", "bold");
        fontBoldLoaded = true;
      } catch (err) {
        console.warn("Failed to load bold font", err);
      }
    }

    // Heavier display face for the shop name in the header
    const DISPLAY_FONT = "vazirmatn-display";
    let fontDisplayLoaded = false;
    if (fontDisplayBase64) {
      try {
        doc.addFileToVFS("vazirmatn-display.ttf", fontDisplayBase64);
        doc.addFont("vazirmatn-display.ttf", DISPLAY_FONT, "normal");
        fontDisplayLoaded = true;
      } catch (err) {
        console.warn("Failed to load display font", err);
      }
    }

    const FONT = fontLoaded ? "vazirmatn" : "helvetica";
    const FONT_BOLD = fontBoldLoaded ? "vazirmatn" : FONT;
    const FONT_DISPLAY = fontDisplayLoaded ? DISPLAY_FONT : FONT;
    doc.setFont(FONT, "normal");

    // helper: faint centered watermark
    const drawWatermark = () => {
      if (!watermarkBase64) return;
      const wmW = 320;
      const wmH = (320 * 500) / 600; // preserve 600x500 aspect
      const gs = doc.GState({ opacity: 0.06 });
      doc.setGState(gs);
      doc.addImage(
        watermarkBase64,
        "PNG",
        (W - wmW) / 2,
        (H - wmH) / 2,
        wmW,
        wmH,
        "",
        "FAST",
      );
      doc.setGState(doc.GState({ opacity: 1 }));
    };

    drawWatermark();

    // ----------------------
    // HEADER
    // ----------------------
    // top-right banner (dark gray, right-anchored) with a 65° slanted left edge
    const bannerW = 360;
    const bannerH = 96;
    const bannerX = W - bannerW;
    const bannerY = 0;
    const bannerSlant = bannerH / Math.tan((65 * Math.PI) / 180);

    // dark gray banner (trapezoid)
    doc.setFillColor(...DARK_GRAY);
    doc.triangle(
      bannerX + bannerSlant,
      bannerY,
      W,
      bannerY,
      W,
      bannerY + bannerH,
      "F",
    );
    doc.triangle(
      bannerX + bannerSlant,
      bannerY,
      W,
      bannerY + bannerH,
      bannerX,
      bannerY + bannerH,
      "F",
    );

    // centered logo + brand text group on the banner
    const brandText = "دیپلماسی";
    const taglineText = "بل پرزه جات ";
    const brandSize = 34;

    // shop name in the heavier display face, bigger
    doc.setFont(FONT_DISPLAY, "normal");
    doc.setFontSize(brandSize);
    const brandTextW = doc.getTextWidth(brandText);

    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    const taglineTextW = doc.getTextWidth(taglineText);
    const textW = Math.max(brandTextW, taglineTextW);

    const logoW = 74;
    const logoH = Math.round((logoW * 497) / 793);
    const logoGap = 16;
    const groupW = logoW + logoGap + textW;
    const groupX = bannerX + (bannerW - groupW) / 2;
    const textRight = groupX + textW;

    // logo.png (1080x1079 with transparent padding; content 144,293..937,790)
    const logoContentX = textRight + logoGap;
    const logoContentY = bannerY + (bannerH - logoH) / 2;
    const logoScale = logoW / 793;
    if (logoBase64) {
      doc.addImage(
        logoBase64,
        "PNG",
        logoContentX - 144 * logoScale,
        logoContentY - 293 * logoScale,
        1080 * logoScale,
        1079 * logoScale,
      );
    }

    doc.setFont(FONT_DISPLAY, "normal");
    doc.setFontSize(brandSize);
    doc.setTextColor(255, 255, 255);
    doc.text(brandText, textRight, bannerY + 42, { align: "right" });

    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    doc.setTextColor(205, 205, 205);
    doc.text(taglineText, textRight, bannerY + 66, { align: "right" });

    // full-width red divider holding the phone + address (centered) on one line
    const redY = bannerH;
    const redH = 32;
    doc.setFillColor(...BRAND_RED);
    doc.rect(0, redY, W, redH, "F");

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    const phoneLine = "Phone: +93 744 441 079";
    const addrLine = "کابل — بین چهار راهی پروان دوم و سوم، مقابل قصر زرین";
    const phoneW = doc.getTextWidth(phoneLine);
    const addrW = doc.getTextWidth(addrLine);
    const lineGap = 26;
    const lineStart = (W - (phoneW + lineGap + addrW)) / 2;
    const redTextY = redY + redH / 2 + 4;
    doc.text(phoneLine, lineStart, redTextY, { align: "left" });
    doc.text(addrLine, lineStart + phoneW + lineGap, redTextY, {
      align: "left",
    });

    // side logo (right-logo.jpeg), centered in the empty left header area
    if (sideLogoBase64) {
      const slContentH = 58;
      const slContentW = (slContentH * 1129) / 960;
      const slScale = slContentH / 960;
      const slContentX = (bannerX - slContentW) / 2;
      const slContentY = (bannerH - slContentH) / 2;
      doc.addImage(
        sideLogoBase64,
        "JPEG",
        slContentX - 62 * slScale,
        slContentY - 120 * slScale,
        1254 * slScale,
        1254 * slScale,
      );
    }

    // ----------------------
    // INVOICE META
    // ----------------------
    let y = 140;
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(
      `نمبر بل: ${toEnglishNumber(
        data.invoiceNumber && data.invoiceNumber.trim() !== ""
          ? data.invoiceNumber.trim()
          : `INV-${String(data.issueId).padStart(4, "0")}`,
      )}`,
      W - M,
      y,
      { align: "right" },
    );
    doc.text(`تاریخ: ${toEnglishDate(data.createdAt)}`, M, y, {
      align: "left",
    });

    // ----------------------
    // SELLER / BUYER BOXES
    // ----------------------
    const boxY = 158;
    const boxH = 50;
    const gap = 12;
    const boxW = (contentW - gap) / 2;
    const rightBoxX = M + boxW + gap;
    const leftBoxX = M;

    const drawInfoBox = (x: number, label: string, lines: string[]) => {
      doc.setFillColor(...ROW_ALT);
      doc.rect(x, boxY, boxW, boxH, "F");
      doc.setFillColor(...BRAND_RED);
      doc.rect(x + boxW - 3, boxY, 3, boxH, "F");

      doc.setFontSize(10);
      doc.setTextColor(...BRAND_RED);
      doc.text(label, x + boxW - 12, boxY + 18, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(...INK);
      let ly = boxY + 36;
      for (const ln of lines) {
        if (!ln) continue;
        doc.text(ln, x + boxW - 12, ly, { align: "right" });
        ly += 13;
      }
    };

    drawInfoBox(rightBoxX, "فروشنده", ["بصیر آریا"]);
    drawInfoBox(leftBoxX, "خریدار", [data.customer.name]);

    // ----------------------
    // ITEMS TABLE
    // Table columns read right-to-left:
    //   شماره | نام پرزه | تعداد | قیمت واحد | مجموع
    // Page x-boundaries are laid out left-to-right (مجموع ... شماره).
    // ----------------------
    let ty = boxY + boxH + 22;

    const wTotal = 110;
    const wPrice = 105;
    const wQty = 55;
    const wName = 190;
    const wNum = 55;
    const xTotal0 = M;
    const xTotal1 = xTotal0 + wTotal;
    const xPrice0 = xTotal1;
    const xPrice1 = xPrice0 + wPrice;
    const xQty0 = xPrice1;
    const xQty1 = xQty0 + wQty;
    const xName0 = xQty1;
    const xName1 = xName0 + wName;
    const xNum0 = xName1;
    const xNum1 = xNum0 + wNum;

    const drawTableHeader = () => {
      doc.setFillColor(...BRAND_RED);
      doc.rect(M, ty, contentW, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("مجموع", (xTotal0 + xTotal1) / 2, ty + 17, { align: "center" });
      doc.text("قیمت واحد", (xPrice0 + xPrice1) / 2, ty + 17, {
        align: "center",
      });
      doc.text("تعداد", (xQty0 + xQty1) / 2, ty + 17, { align: "center" });
      doc.text("نام پرزه", xName1 - 8, ty + 17, { align: "right" });
      doc.text("نمبر", (xNum0 + xNum1) / 2, ty + 17, { align: "center" });
      ty += 26;
    };

    drawTableHeader();

    let totalAmount = 0;
    // بهای خرید پرزه‌های خارجی — قابل پرداخت به فروشگاه‌های دیگر، نه به مغازه
    let externalPayable = 0;

    data.sales.forEach((s, idx) => {
      if (ty > H - 190) {
        doc.addPage();
        drawWatermark();
        ty = 80;
        drawTableHeader();
      }

      const totalValue =
        typeof s.sale.totalAmount === "string"
          ? parseFloat(s.sale.totalAmount)
          : s.sale.totalAmount;
      const qty = s.sale.quantity;
      const unitPrice = qty ? totalValue / qty : 0;
      totalAmount += totalValue;

      // پرزهٔ خارجی (part تهی): بهای خرید به فروشگاه دیگر تعلق دارد
      if (!s.part) {
        const costUnit = parseFloat(String(s.sale.itemCost ?? "0")) || 0;
        externalPayable += costUnit * qty;
      }

      // zebra row
      doc.setFillColor(...(idx % 2 === 0 ? ROW_ALT : WHITE));
      doc.rect(M, ty, contentW, 22, "F");

      doc.setTextColor(...INK);
      doc.setFontSize(10);

      // # (rightmost)
      doc.text(toEnglishNumber(idx + 1), (xNum0 + xNum1) / 2, ty + 15, {
        align: "center",
      });

      // part name — shrink so it stays on ONE line (never pass maxWidth: jsPDF
      // would wrap the RTL string and scramble the order)
      // external parts: invoice shows the typed part name only (no supplier name)
      const nameText = s.part?.name || s.sale.itemName || "نامشخص";
      let nameSize = 10;
      doc.setFontSize(nameSize);
      const nameColW = wName - 14;
      while (doc.getTextWidth(nameText) > nameColW && nameSize > 6.5) {
        nameSize -= 0.5;
        doc.setFontSize(nameSize);
      }
      doc.text(nameText, xName1 - 8, ty + 15, { align: "right" });
      doc.setFontSize(10);

      // qty
      doc.text(toEnglishNumber(qty), (xQty0 + xQty1) / 2, ty + 15, {
        align: "center",
      });

      // unit price
      doc.text(toEnglishNumber(unitPrice), xPrice1 - 8, ty + 15, {
        align: "right",
      });

      // line total
      doc.text(toEnglishNumber(totalValue), xTotal1 - 8, ty + 15, {
        align: "right",
      });

      ty += 22;
    });

    // ----------------------
    // TOTALS (left side — mirrored from the reference template)
    // «مجموع اقلام» حذف شد؛ فقط «مجموع کل» با مبلغ bold
    // ----------------------
    ty += 16;
    const tbW = 260;
    const tbX = M;
    const hasExternal = externalPayable > 0;
    const netAmount = Math.max(0, totalAmount - externalPayable);
    const tbH = hasExternal ? 92 : 44;

    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(tbX, ty, tbW, tbH, "F");

    if (!hasExternal) {
      doc.setFontSize(13);
      doc.setTextColor(...BRAND_RED);
      doc.text("مجموع کل", tbX + tbW - 14, ty + 29, { align: "right" });
      if (fontBoldLoaded) doc.setFont(FONT_BOLD, "bold");
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text(toEnglishCurrency(totalAmount), tbX + 14, ty + 29, {
        align: "left",
      });
      doc.setFont(FONT, "normal");
    } else {
      // مجموع کل فاکتور
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text("مجموع کل فاکتور", tbX + tbW - 14, ty + 22, { align: "right" });
      doc.text(toEnglishCurrency(totalAmount), tbX + 14, ty + 22, {
        align: "left",
      });

      // منها: بهای خرید پرزه‌های خارجی (قابل پرداخت به فروشگاه‌ها)
      doc.setTextColor(...MUTED);
      doc.text("منها: بهای خرید پرزه‌های خارجی", tbX + tbW - 14, ty + 46, {
        align: "right",
      });
      doc.text(`- ${toEnglishCurrency(externalPayable)}`, tbX + 14, ty + 46, {
        align: "left",
      });

      // جداکننده
      doc.setDrawColor(...BORDER);
      doc.line(tbX + 10, ty + 60, tbX + tbW - 10, ty + 60);

      // خالص قابل پرداخت (سود مغازه + قطعات انبار)
      doc.setFontSize(13);
      doc.setTextColor(...BRAND_RED);
      doc.text("خالص قابل پرداخت", tbX + tbW - 14, ty + 82, {
        align: "right",
      });
      if (fontBoldLoaded) doc.setFont(FONT_BOLD, "bold");
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text(toEnglishCurrency(netAmount), tbX + 14, ty + 82, {
        align: "left",
      });
      doc.setFont(FONT, "normal");
    }

    ty += tbH + 22;

    // ----------------------
    // TERMS & SIGNATURE
    // ----------------------
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("شرایط و ملاحظات:", M, ty, { align: "left" });
    ty += 14;
    doc.setTextColor(...MUTED);
    doc.text(
      "• جنس فروخته شده بعد از 24 ساعت قابل واپس گرفتن نمی باشد.",
      M,
      ty,
      { align: "left" },
    );
    ty += 12;
    doc.text("• لطفاً این رسید را تا زمان تسویه کامل حفظ نمایید.", M, ty, {
      align: "left",
    });

    // signature area pinned near the bottom
    const sigY = Math.max(ty + 46, H - 96);
    doc.setDrawColor(...BORDER);
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("امضاء مسئول", M, sigY, { align: "left" });
    doc.line(M, sigY + 6, M + 150, sigY + 6);
    doc.text("تاپه شرکت", W - M, sigY, { align: "right" });
    doc.line(W - M - 150, sigY + 6, W - M, sigY + 6);

    // ----------------------
    // FOOTER
    // ----------------------
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "دیپلوماسی لمتید — از اعتماد و خرید شما سپاسگزاریم.",
      W / 2,
      H - 40,
      { align: "center" },
    );

    // two-tone footer ribbon: left brand red / right dark gray,
    // divider slanted at 70° (instead of a 90° vertical split)
    const ribbonH = 16;
    const ribbonY = H - ribbonH;
    const splitTop = W * 0.5;
    const splitBottom = splitTop + ribbonH / Math.tan((70 * Math.PI) / 180);

    doc.setFillColor(...DARK_GRAY);
    doc.rect(0, ribbonY, W, ribbonH, "F");

    doc.setFillColor(...BRAND_RED);
    doc.triangle(0, ribbonY, splitTop, ribbonY, splitBottom, H, "F");
    doc.triangle(0, ribbonY, splitBottom, H, 0, H, "F");

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
