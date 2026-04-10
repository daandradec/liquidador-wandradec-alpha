import { LABOR_YEAR_DAYS, VACATION_FACTOR_DAYS } from "./constants.js"
import { addDays, calculateDaysWorked360, diffDaysInclusive, parseDate, roundCOP } from "./utils.js"

function calculateDismissalCompensation({ employee, baseMonthlySalary, annualParameters, daysWorked }) {
  if (!employee.endDate) return 0

  const salaryDaily = baseMonthlySalary / 30

  if (employee.contractType === "FIXED_TERM") {
    const fixedTermEnd = parseDate(employee.fixedTermEndDate)
    const endDate = parseDate(employee.endDate)
    if (!fixedTermEnd || !endDate) return 0
    const remainingDays = diffDaysInclusive(addDays(endDate, 1), fixedTermEnd)
    return roundCOP(Math.max(0, remainingDays) * salaryDaily)
  }

  if (employee.contractType === "PROJECT") {
    const estimateRemainingDays = employee.fixedTermEndDate
      ? diffDaysInclusive(addDays(employee.endDate, 1), employee.fixedTermEndDate)
      : 15
    return roundCOP(Math.max(salaryDaily * 15, salaryDaily * Math.max(estimateRemainingDays, 0)))
  }

  if (employee.contractType === "INDEFINITE") {
    const belowTenSmmlv = baseMonthlySalary < annualParameters.smlmv * 10
    const baseDays = belowTenSmmlv ? 30 : 20
    const perAdditionalYearDays = belowTenSmmlv ? 20 : 15

    if (daysWorked <= LABOR_YEAR_DAYS) {
      return roundCOP(baseDays * salaryDaily)
    }

    const additionalDaysWorked = daysWorked - LABOR_YEAR_DAYS
    const completedYears = Math.floor(additionalDaysWorked / LABOR_YEAR_DAYS)
    const remainingDays = additionalDaysWorked % LABOR_YEAR_DAYS
    const proportionalDays = (remainingDays / LABOR_YEAR_DAYS) * perAdditionalYearDays
    const indemnizacionDias = baseDays + completedYears * perAdditionalYearDays + proportionalDays
    return roundCOP(indemnizacionDias * salaryDaily)
  }

  return 0
}

function calculateMoratoryCompensation({ employee, baseMonthlySalary, liquidationDate, litigationMode, trace }) {
  if (!litigationMode || !employee.endDate) return 0

  const daysDelay = diffDaysInclusive(addDays(employee.endDate, 1), liquidationDate)
  if (daysDelay <= 0) return 0

  const moratoryDays = Math.min(daysDelay, 24 * 30)
  const value = roundCOP((baseMonthlySalary / 30) * moratoryDays)

  if (daysDelay > 24 * 30) {
    trace.push("Mora mayor a 24 meses: el excedente debe tratarse como intereses moratorios en análisis judicial.")
  }

  return value
}

function calculateLateSeveranceFundPenalty({ employee, baseMonthlySalary, liquidationDate }) {
  if (employee.salaryMode === "INTEGRAL") return 0

  const liquidation = parseDate(liquidationDate)
  if (!liquidation) return 0

  const cutoff = new Date(`${liquidation.getFullYear()}-02-15T00:00:00`)
  if (liquidation <= cutoff) return 0

  const daysLate = diffDaysInclusive(addDays(cutoff, 1), liquidation)
  return roundCOP((baseMonthlySalary / 30) * daysLate)
}

export function calculateLaborAccruals({ employee, bases, liquidationDate, litigationMode, annualParameters }) {
  const trace = []

  const effectiveEnd = employee.endDate && parseDate(employee.endDate) <= parseDate(liquidationDate) ? employee.endDate : liquidationDate
  const daysWorked = calculateDaysWorked360(employee.startDate, effectiveEnd)

  let cesantias = 0
  let interesesCesantias = 0
  let primaServicios = 0

  if (employee.salaryMode !== "INTEGRAL") {
    cesantias = roundCOP(bases.severanceBase * (daysWorked / LABOR_YEAR_DAYS))
    interesesCesantias = roundCOP(cesantias * 0.12 * (daysWorked / LABOR_YEAR_DAYS))
    primaServicios = roundCOP(bases.serviceBonusBase * (daysWorked / LABOR_YEAR_DAYS))
  }

  const vacaciones = roundCOP(bases.vacationBase * (daysWorked / VACATION_FACTOR_DAYS))

  let indemnizacionDespido = 0
  let indemnizacionMoratoria = 0
  let sancionCesantiasFondo = 0

  if (employee.applyIndemnizacion) {
    indemnizacionDespido = calculateDismissalCompensation({
      employee,
      baseMonthlySalary: bases.dismissalCompensationBase,
      annualParameters,
      daysWorked,
    })

    indemnizacionMoratoria = calculateMoratoryCompensation({
      employee,
      baseMonthlySalary: bases.dismissalCompensationBase,
      liquidationDate,
      litigationMode,
      trace,
    })

    sancionCesantiasFondo = calculateLateSeveranceFundPenalty({
      employee,
      baseMonthlySalary: bases.severanceBase,
      liquidationDate,
    })

    if (!employee.endDate) {
      trace.push("No hay fecha de retiro: la indemnización por despido queda en 0 hasta que exista terminación.")
    }
  } else {
    trace.push("Indemnización desactivada en la configuración del empleado.")
  }

  return {
    values: {
      cesantias,
      interesesCesantias,
      primaServicios,
      vacaciones,
      indemnizacionDespido,
      indemnizacionMoratoria,
      sancionCesantiasFondo,
      daysWorked,
    },
    trace,
  }
}
