import { normalizeRequest } from "./normalize.js"
import { calculateSalaryClassificationTotals } from "./classification.js"
import { calculateBases } from "./bases.js"
import { calculateIBC, calculateSocialSecurity, zeroSocialSecurity } from "./social-security.js"
import { calculateLaborAccruals } from "./accruals.js"
import { calculateWithholdingBasic } from "./withholding.js"
import { roundCOP } from "./utils.js"

export function liquidateEmployee(request) {
  const normalized = normalizeRequest(request)
  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors,
      warnings: normalized.warnings,
      trace: normalized.trace,
    }
  }

  const trace = [...normalized.trace]
  const warnings = [...normalized.warnings]

  const { employee, payConcepts, novelties, annualParameters, liquidationDate } = normalized.value

  const salaryTotals = calculateSalaryClassificationTotals(payConcepts)

  const ibcResult = calculateIBC({
    employee,
    salaryTotals,
    novelties,
    annualParameters,
  })

  trace.push(...ibcResult.trace)

  const basesResult = calculateBases({
    employee,
    payConcepts,
    novelties,
    annualParameters,
    ibc: ibcResult.values.ibc,
  })

  trace.push(...basesResult.trace)

  const accrualsResult = calculateLaborAccruals({
    employee,
    bases: basesResult.values,
    liquidationDate,
    litigationMode: normalized.value.litigationMode,
    annualParameters,
  })

  trace.push(...accrualsResult.trace)

  const socialSecurity = normalized.value.calculateSocialSecurity
    ? calculateSocialSecurity({
        ibc: ibcResult.values.ibc,
        riskClass: employee.riskClass,
        annualParameters,
      })
    : zeroSocialSecurity()

  if (!normalized.value.calculateSocialSecurity) {
    trace.push("Módulo de seguridad social desactivado por configuración de la liquidación.")
  }

  const tax = normalized.value.calculateWithholdingTax
    ? calculateWithholdingBasic({
        employee,
        payConcepts,
        socialSecurity,
        annualParameters,
        withholdingProcedure: normalized.value.withholdingProcedure,
      })
    : { retefuente: 0, trace: ["Módulo de retefuente desactivado."] }

  trace.push(...tax.trace)

  const totalDevengado = roundCOP(
    Object.entries(accrualsResult.values)
      .filter(([key]) => key !== "daysWorked")
      .reduce((acc, [, value]) => acc + Number(value || 0), 0)
  )

  const totalDeduccionesEmpleado = roundCOP(
    socialSecurity.saludEmpleado + socialSecurity.pensionEmpleado + socialSecurity.fspEmpleado + tax.retefuente
  )

  const netoPagar = roundCOP(totalDevengado - totalDeduccionesEmpleado)
  const costoTotalEmpleador = roundCOP(
    totalDevengado +
      socialSecurity.saludEmpleador +
      socialSecurity.pensionEmpleador +
      socialSecurity.arlEmpleador +
      socialSecurity.fspEmpleado
  )

  warnings.push(
    "Advertencia legal: este cálculo es apoyo técnico y no reemplaza análisis jurídico/tributario especializado."
  )

  return {
    ok: true,
    errors: [],
    warnings,
    bases: basesResult.values,
    accruals: {
      cesantias: accrualsResult.values.cesantias,
      interesesCesantias: accrualsResult.values.interesesCesantias,
      primaServicios: accrualsResult.values.primaServicios,
      vacaciones: accrualsResult.values.vacaciones,
      indemnizacionDespido: accrualsResult.values.indemnizacionDespido,
      indemnizacionMoratoria: accrualsResult.values.indemnizacionMoratoria,
      sancionCesantiasFondo: accrualsResult.values.sancionCesantiasFondo,
    },
    socialSecurity,
    tax: {
      retefuente: tax.retefuente,
    },
    totals: {
      totalDevengado,
      totalDeduccionesEmpleado,
      netoPagar,
      costoTotalEmpleador,
    },
    trace,
    meta: {
      daysWorked: accrualsResult.values.daysWorked,
      ibcInput: ibcResult.values,
      liquidationDate,
    },
  }
}
