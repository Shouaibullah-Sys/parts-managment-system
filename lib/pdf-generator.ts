// lib/pdf-generator.ts
import PDFDocument from "pdfkit";
import { customers, parts, user } from "@/db/schema";

interface SaleItem {
  sale: any;
  part: typeof parts.$inferSelect | null;
  user: typeof user.$inferSelect | null;
}

interface InvoiceData {
  customer: typeof customers.$inferSelect;
  sales: SaleItem[];
  issueId: number;
  createdAt: Date;
  createdBy: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${data.issueId}`,
          Author: "Parts Management System",
          Subject: `Invoice for ${data.customer.name}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Use default font (no external font loading)
      // PDFKit will use its built-in fonts

      // Header
      doc.fontSize(20).text("Parts Invoice", { align: "center" }).moveDown(0.5);

      // Invoice info
      doc
        .fontSize(12)
        .text(`Invoice ID: ${data.issueId}`, { align: "right" })
        .text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, {
          align: "right",
        })
        .text(`Created by: ${data.createdBy}`, { align: "right" })
        .moveDown(1);

      // Customer info
      doc
        .fontSize(14)
        .text("Customer Information:", { align: "right" })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .text(`Customer Name: ${data.customer.name}`, { align: "right" });

      if (data.customer.phone) {
        doc.text(`Phone: ${data.customer.phone}`, { align: "right" });
      }

      if (data.customer.address) {
        doc.text(`Address: ${data.customer.address}`, { align: "right" });
      }

      doc.moveDown(1);

      // Items table header
      const tableTop = doc.y + 20;
      doc
        .fontSize(10)
        .text("Item #", 50, tableTop)
        .text("Part Number", 100, tableTop)
        .text("Part Name", 200, tableTop)
        .text("Qty", 350, tableTop)
        .text("Unit Price", 400, tableTop)
        .text("Total", 480, tableTop);

      // Draw line under header
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Items
      let y = tableTop + 25;
      let totalAmount = 0;

      data.sales.forEach((saleItem, index) => {
        if (y > 700) {
          // New page if needed
          doc.addPage();
          y = 50;
        }

        const quantity = saleItem.sale.quantity;
        const unitPrice = parseFloat(saleItem.sale.totalAmount) / quantity;
        const itemTotal = parseFloat(saleItem.sale.totalAmount);

        totalAmount += itemTotal;

        doc
          .text((index + 1).toString(), 50, y)
          .text(saleItem.part?.partNumber || "Unknown", 100, y)
          .text(saleItem.part?.name || "Unknown", 200, y, { width: 140 })
          .text(quantity.toString(), 350, y)
          .text(unitPrice.toLocaleString(), 400, y)
          .text(itemTotal.toLocaleString(), 480, y);

        y += 20;
      });

      // Total
      const totalY = y + 10;
      doc.moveTo(350, totalY).lineTo(550, totalY).stroke();

      doc
        .fontSize(12)
        .text("Total Amount:", 350, totalY + 10)
        .text(totalAmount.toLocaleString() + " AFN", 480, totalY + 10, {
          align: "right",
        });

      // Footer
      const footerY = 750;
      doc
        .fontSize(8)
        .text("This document was generated automatically", 50, footerY, {
          align: "center",
        })
        .text(new Date().toLocaleDateString(), 50, footerY + 12, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      console.error("Error in PDF generation:", error);
      reject(error);
    }
  });
}
