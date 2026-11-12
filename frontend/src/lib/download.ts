import Papa from "papaparse";

/** Serializes rows to CSV and triggers a browser download. */
export function downloadCsv(filename: string, rows: object[]): void {
  const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
