import { flattenLiquidationRecord } from "./common.js"

export function exportLiquidationsToPDF(records, fileName = "liquidaciones.pdf") {
  const JsPDF = window.jspdf?.jsPDF
  if (!JsPDF) {
    throw new Error("jsPDF no está disponible.")
  }

  const rows = records.map(flattenLiquidationRecord)
  if (!rows.length) {
    throw new Error("No hay liquidaciones para exportar a PDF.")
  }

  const doc = new JsPDF({ unit: "pt", format: "a4" })
  const marginX = 36
  let currentY = 36

  doc.setFontSize(13)
  doc.text("Liquidaciones Laborales - Reporte", marginX, currentY)
  currentY += 20

  doc.setFontSize(9)
  rows.forEach((row, rowIndex) => {
    const lines = [
      `#${rowIndex + 1} ${row.empleadoNombre} (${row.empleadoId}) - ${row.fechaLiquidacion}`,
      `Neto: ${row.netoPagar.toLocaleString("es-CO")} | Devengado: ${row.totalDevengado.toLocaleString("es-CO")}`,
      `Cesantías: ${row.cesantias.toLocaleString("es-CO")}, Prima: ${row.primaServicios.toLocaleString("es-CO")}, Vacaciones: ${row.vacaciones.toLocaleString("es-CO")}`,
      `IBC: ${row.ibc.toLocaleString("es-CO")}, Salud Emp: ${row.saludEmpleado.toLocaleString("es-CO")}, Pensión Emp: ${row.pensionEmpleado.toLocaleString("es-CO")}`,
    ]

    for (const line of lines) {
      if (currentY > 780) {
        doc.addPage()
        currentY = 36
      }
      doc.text(line, marginX, currentY)
      currentY += 13
    }

    currentY += 7
  })

  doc.save(fileName)
}
