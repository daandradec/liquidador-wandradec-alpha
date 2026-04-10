export function flattenLiquidationRecord(record) {
  const result = record.result
  return {
    id: record.id,
    fechaLiquidacion: record.liquidationDate,
    empleadoId: record.employeeId,
    empleadoNombre: record.employeeName,
    baseCesantias: result.bases.severanceBase,
    basePrima: result.bases.serviceBonusBase,
    baseVacaciones: result.bases.vacationBase,
    ibc: result.bases.ibc,
    cesantias: result.accruals.cesantias,
    interesesCesantias: result.accruals.interesesCesantias,
    primaServicios: result.accruals.primaServicios,
    vacaciones: result.accruals.vacaciones,
    indemnizacionDespido: result.accruals.indemnizacionDespido,
    indemnizacionMoratoria: result.accruals.indemnizacionMoratoria,
    sancionCesantiasFondo: result.accruals.sancionCesantiasFondo,
    saludEmpleado: result.socialSecurity.saludEmpleado,
    pensionEmpleado: result.socialSecurity.pensionEmpleado,
    fspEmpleado: result.socialSecurity.fspEmpleado,
    retefuente: result.tax.retefuente,
    totalDevengado: result.totals.totalDevengado,
    totalDeduccionesEmpleado: result.totals.totalDeduccionesEmpleado,
    netoPagar: result.totals.netoPagar,
    costoTotalEmpleador: result.totals.costoTotalEmpleador,
  }
}

export function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
