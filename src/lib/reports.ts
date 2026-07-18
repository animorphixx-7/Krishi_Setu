import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Row = Record<string, string | number | null | undefined>;

// Neutralize spreadsheet formula injection: prefix risky leading chars with `'`
// so Excel/Sheets/Numbers treat the cell as text rather than a formula/command.
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;
function sanitizeCell(v: Row[string]): Row[string] {
  if (typeof v !== "string") return v;
  return FORMULA_TRIGGERS.test(v) ? `'${v}` : v;
}
function sanitizeRows(rows: Row[]): Row[] {
  return rows.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[k] = sanitizeCell(r[k]);
    return out;
  });
}

export function downloadCSV(filename: string, rows: Row[]) {
  const csv = Papa.unparse(sanitizeRows(rows));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadXLSX(filename: string, rows: Row[], sheetName = "Report") {
  const ws = XLSX.utils.json_to_sheet(sanitizeRows(rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function downloadPDF(
  filename: string,
  title: string,
  meta: string[],
  rows: Row[],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  meta.forEach((m, i) => doc.text(m, 14, 22 + i * 5));
  const startY = 22 + meta.length * 5 + 4;

  if (rows.length === 0) {
    doc.setTextColor(0);
    doc.text("No records match the selected filters.", 14, startY + 6);
  } else {
    const head = [Object.keys(rows[0])];
    const body = rows.map((r) => head[0].map((k) => String(r[k] ?? "")));
    autoTable(doc, {
      head, body, startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 101, 52] },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Krishi Setu AI — Generated ${new Date().toLocaleString()} — Page ${data.pageNumber}`,
          14,
          pageHeight - 6,
        );
      },
    });
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
