// lib/excel-utils.ts
import * as XLSX from "xlsx";

export interface ExcelPart {
  part_number: string;
  name: string;
  section: string;
  min_stock: number;
  current_stock: number;
  deficit: number;
  requested_quantity: number;
  cost_price: string;
  total_cost: number;
}

// Export to Excel with formatting
export const exportToExcel = (data: ExcelPart[]) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data for Excel
  const excelData = data.map((item) => ({
    "شماره قطعه": item.part_number,
    "نام قطعه": item.name,
    بخش: item.section,
    "حداقل موجودی": item.min_stock,
    "موجودی فعلی": item.current_stock,
    کمبود: item.deficit,
    "مقدار درخواستی": item.requested_quantity,
    "قیمت واحد (افغانی)": parseFloat(item.cost_price || "0"),
    "مجموع هزینه (افغانی)": item.total_cost,
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // شماره قطعه
    { wch: 30 }, // نام قطعه
    { wch: 10 }, // بخش
    { wch: 12 }, // حداقل موجودی
    { wch: 12 }, // موجودی فعلی
    { wch: 10 }, // کمبود
    { wch: 15 }, // مقدار درخواستی
    { wch: 15 }, // قیمت واحد
    { wch: 15 }, // مجموع هزینه
  ];
  ws["!cols"] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "اقدامات اولویت دار");

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `priority-actions-${timestamp}.xlsx`;

  // Export to file
  XLSX.writeFile(wb, filename);
};

// Import from Excel
export const importFromExcel = (file: File): Promise<ExcelPart[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first worksheet
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel data to our format
        const importedData: ExcelPart[] = jsonData.map((row: any) => ({
          part_number: row["شماره قطعه"] || row["part_number"],
          name: row["نام قطعه"] || row["name"],
          section: row["بخش"] || row["section"],
          min_stock: Number(row["حداقل موجودی"] || row["min_stock"] || 0),
          current_stock: Number(
            row["موجودی فعلی"] || row["current_stock"] || 0
          ),
          deficit: Number(row["کمبود"] || row["deficit"] || 0),
          requested_quantity: Number(
            row["مقدار درخواستی"] || row["requested_quantity"] || 0
          ),
          cost_price: String(
            row["قیمت واحد (افغانی)"] || row["cost_price"] || "0"
          ),
          total_cost: Number(
            row["مجموع هزینه (افغانی)"] || row["total_cost"] || 0
          ),
        }));

        resolve(importedData);
      } catch (error) {
        reject(new Error("خطا در خواندن فایل اکسل"));
      }
    };

    reader.onerror = () => reject(new Error("خطا در بارگذاری فایل"));
    reader.readAsArrayBuffer(file);
  });
};

// Generate Excel template for import
export const generateExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  const templateData = [
    {
      "شماره قطعه": "EXAMPLE-001",
      "نام قطعه": "نام قطعه نمونه",
      بخش: "E",
      "حداقل موجودی": 10,
      "موجودی فعلی": 5,
      کمبود: 5,
      "مقدار درخواستی": 10,
      "قیمت واحد (افغانی)": 1500,
      "مجموع هزینه (افغانی)": 15000,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const colWidths = [
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "قالب وارد کردن داده");
  XLSX.writeFile(wb, "template-priority-actions.xlsx");
};
