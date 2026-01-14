import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  HeadingLevel,
  BorderStyle,
} from "docx";
import * as XLSX from "xlsx";
import { format } from "date-fns";

// Types
export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  title: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  filename: string;
  subtitle?: string;
}

// Helper to get cell value
function getCellValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// ============ PDF EXPORT ============
export function exportToPDF(options: ExportOptions): void {
  const { title, columns, data, filename, subtitle } = options;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "PPP p")}`, 14, subtitle ? 38 : 30);

  // Table
  const tableData = data.map((row) =>
    columns.map((col) => getCellValue(row, col.key))
  );

  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: tableData,
    startY: subtitle ? 45 : 37,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}

// ============ DOCX EXPORT ============
export async function exportToDocx(options: ExportOptions): Promise<void> {
  const { title, columns, data, filename, subtitle } = options;

  // Create table rows
  const headerRow = new TableRow({
    children: columns.map(
      (col) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: col.header, bold: true })],
            }),
          ],
          shading: { fill: "3b82f6" },
        })
    ),
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: columns.map(
          (col) =>
            new TableCell({
              children: [new Paragraph(getCellValue(row, col.key))],
            })
        ),
      })
  );

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          ...(subtitle
            ? [
                new Paragraph({
                  children: [new TextRun({ text: subtitle, italics: true })],
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${format(new Date(), "PPP p")}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

// ============ EXCEL EXPORT ============
export function exportToExcel(
  options: ExportOptions,
  format: "xlsx" | "xls" | "csv" = "xlsx"
): void {
  const { title, columns, data, filename } = options;

  // Create worksheet data
  const wsData = [
    [title],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    columns.map((col) => col.header),
    ...data.map((row) => columns.map((col) => getCellValue(row, col.key))),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // Export based on format
  const bookType =
    format === "csv" ? "csv" : format === "xls" ? "biff8" : "xlsx";
  XLSX.writeFile(wb, `${filename}.${format}`, { bookType });
}

// ============ CSV EXPORT ============
export function exportToCSV(options: ExportOptions): void {
  const { columns, data, filename } = options;

  const headers = columns.map((col) => col.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = getCellValue(row, col.key);
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(",") || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

// ============ IMPORT FUNCTIONS ============
export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
}

export async function importFromExcel<T>(
  file: File,
  columnMapping: Record<string, string>
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map columns
        const mappedData = jsonData.map((row: Record<string, unknown>) => {
          const mappedRow: Record<string, unknown> = {};
          Object.entries(columnMapping).forEach(([fileCol, appCol]) => {
            // Case-insensitive column matching
            const matchingKey = Object.keys(row).find(
              (k) => k.toLowerCase() === fileCol.toLowerCase()
            );
            if (matchingKey) {
              mappedRow[appCol] = row[matchingKey];
            }
          });
          return mappedRow as T;
        });

        resolve({ success: true, data: mappedData, errors: [] });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [(error as Error).message],
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, data: [], errors: ["Failed to read file"] });
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function importFromCSV<T>(
  file: File,
  columnMapping: Record<string, string>
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length === 0) {
          resolve({ success: false, data: [], errors: ["File is empty"] });
          return;
        }

        // Parse headers
        const headers = parseCSVLine(lines[0]);

        // Parse data rows
        const data: T[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i]);
            const row: Record<string, unknown> = {};

            headers.forEach((header, index) => {
              const mappedCol = Object.entries(columnMapping).find(
                ([fileCol]) => fileCol.toLowerCase() === header.toLowerCase()
              )?.[1];

              if (mappedCol) {
                row[mappedCol] = values[index] || "";
              }
            });

            data.push(row as T);
          } catch {
            errors.push(`Error parsing row ${i + 1}`);
          }
        }

        resolve({ success: true, data, errors });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [(error as Error).message],
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, data: [], errors: ["Failed to read file"] });
    };

    reader.readAsText(file);
  });
}

// Helper to parse CSV line respecting quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Helper to download blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ============ BUSINESS-SPECIFIC EXPORTS ============
export interface BusinessData {
  name: string;
  tin: string;
  business_type: string;
  address: string | null;
  turnover: number | null;
  tax_types: string[] | null;
  is_informal: boolean | null;
}

export const BUSINESS_COLUMNS: ExportColumn[] = [
  { header: "Business Name", key: "name", width: 25 },
  { header: "TIN", key: "tin", width: 15 },
  { header: "Business Type", key: "business_type", width: 20 },
  { header: "Address", key: "address", width: 30 },
  { header: "Annual Turnover (UGX)", key: "turnover", width: 20 },
  { header: "Tax Types", key: "tax_types_str", width: 25 },
  { header: "Is Informal", key: "is_informal", width: 12 },
];

export const BUSINESS_IMPORT_MAPPING: Record<string, string> = {
  "Business Name": "name",
  Name: "name",
  TIN: "tin",
  "Tax ID": "tin",
  "Business Type": "business_type",
  Type: "business_type",
  Address: "address",
  "Annual Turnover (UGX)": "turnover",
  Turnover: "turnover",
  "Tax Types": "tax_types",
  "Is Informal": "is_informal",
  Informal: "is_informal",
};

// ============ TAX FORM EXPORTS ============
export const TAX_FORM_COLUMNS: ExportColumn[] = [
  { header: "Business", key: "business_name", width: 25 },
  { header: "Tax Type", key: "tax_type_label", width: 15 },
  { header: "Tax Period", key: "tax_period", width: 15 },
  { header: "Status", key: "status", width: 12 },
  { header: "Calculated Tax", key: "calculated_tax", width: 18 },
  { header: "Created At", key: "created_at_formatted", width: 20 },
  { header: "Submitted At", key: "submitted_at_formatted", width: 20 },
];

// ============ AUDIT LOG EXPORTS ============
export const AUDIT_LOG_COLUMNS: ExportColumn[] = [
  { header: "Date & Time", key: "created_at_formatted", width: 20 },
  { header: "User", key: "user_name", width: 20 },
  { header: "Email", key: "user_email", width: 25 },
  { header: "Business", key: "business_name", width: 20 },
  { header: "Action", key: "action_label", width: 20 },
  { header: "IP Address", key: "ip_address", width: 15 },
  { header: "Details", key: "details_str", width: 30 },
];

// Sample template generators for imports
export function generateBusinessTemplate(): void {
  const sampleData = [
    {
      name: "Sample Business Ltd",
      tin: "1000000001",
      business_type: "limited_company",
      address: "Kampala, Uganda",
      turnover: 50000000,
      tax_types_str: "paye, vat",
      is_informal: false,
    },
  ];

  exportToExcel({
    title: "Business Import Template",
    columns: BUSINESS_COLUMNS,
    data: sampleData,
    filename: "business_import_template",
    subtitle:
      "Fill in your business data below. Business Type options: sole_proprietorship, partnership, limited_company, ngo, cooperative, other. Tax Types: paye, income, presumptive, vat (comma-separated)",
  });
}
