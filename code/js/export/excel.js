import { buildDetailedExportRows, buildRawJsonForRecord } from "./result-data.js"

export function exportLiquidationsToXLSX(records, fileName = "liquidaciones.xlsx") {
  if (!window.XLSX) {
    throw new Error("SheetJS (XLSX) no está disponible.")
  }

  const detailRows = records.flatMap((record) => buildDetailedExportRows(record))
  if (!detailRows.length) {
    throw new Error("No hay liquidaciones para exportar a Excel.")
  }

  const workbook = window.XLSX.utils.book_new()
  const detailWorksheet = window.XLSX.utils.json_to_sheet(detailRows)
  window.XLSX.utils.book_append_sheet(workbook, detailWorksheet, "Detalle")

  const rawRows = records.map((record) => ({
    registroId: record.id,
    empleadoId: record.employeeId,
    empleadoNombre: record.employeeName,
    fechaLiquidacion: record.liquidationDate,
    json: buildRawJsonForRecord(record),
  }))

  const rawWorksheet = window.XLSX.utils.json_to_sheet(rawRows)
  window.XLSX.utils.book_append_sheet(workbook, rawWorksheet, "RawJSON")

  window.XLSX.writeFile(workbook, fileName)
}
