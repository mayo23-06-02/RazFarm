import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toCsv } from "@/lib/csv";

export interface ExportSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
}

export interface ExportReportInput {
  title: string;
  subtitle: string;
  sections: ExportSection[];
  fileNameBase: string;
}

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function exportReportPdf({ title, subtitle, sections, fileNameBase }: ExportReportInput) {
  const doc = new jsPDF() as JsPdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, 14, 25);
  doc.setTextColor(20);

  let cursorY = 34;
  for (const section of sections) {
    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFontSize(11);
    doc.text(section.heading, 14, cursorY);

    autoTable(doc, {
      startY: cursorY + 4,
      head: [section.columns],
      body: section.rows,
      foot: section.totalRow ? [section.totalRow] : undefined,
      showFoot: section.totalRow ? "lastPage" : undefined,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 77, 51] },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      tableWidth: pageWidth - 28,
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 14;
  }

  doc.save(`${fileNameBase}.pdf`);
}

export interface ExportReportCsvInput {
  rows: string[][];
  fileNameBase: string;
}

export function exportReportCsv({ rows, fileNameBase }: ExportReportCsvInput) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNameBase}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
