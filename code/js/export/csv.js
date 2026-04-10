import { downloadBlob, flattenLiquidationRecord } from "./common.js"

function toCsvCell(value) {
  if (value == null) return ""
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function exportLiquidationsToCSV(records, fileName = "liquidaciones.csv") {
  const rows = records.map(flattenLiquidationRecord)
  if (!rows.length) {
    throw new Error("No hay liquidaciones para exportar a CSV.")
  }

  const headers = Object.keys(rows[0])
  const csvLines = [headers.join(",")]

  for (const row of rows) {
    csvLines.push(headers.map((header) => toCsvCell(row[header])).join(","))
  }

  downloadBlob(csvLines.join("\n"), fileName, "text/csv;charset=utf-8")
}
