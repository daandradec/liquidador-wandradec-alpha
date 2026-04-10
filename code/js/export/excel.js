import { flattenLiquidationRecord } from "./common.js"

export function exportLiquidationsToXLSX(records, fileName = "liquidaciones.xlsx") {
  if (!window.XLSX) {
    throw new Error("SheetJS (XLSX) no está disponible.")
  }

  const rows = records.map(flattenLiquidationRecord)
  if (!rows.length) {
    throw new Error("No hay liquidaciones para exportar a Excel.")
  }

  const workbook = window.XLSX.utils.book_new()
  const worksheet = window.XLSX.utils.json_to_sheet(rows)

  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Liquidaciones")
  window.XLSX.writeFile(workbook, fileName)
}
