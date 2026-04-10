import { roundCOP, toNumber } from "./utils.js"

function calculateFsp(ibc, smlmv) {
  let fspRate = 0
  if (ibc >= smlmv * 4) fspRate += 0.01
  if (ibc >= smlmv * 16 && ibc < smlmv * 17) fspRate += 0.002
  if (ibc >= smlmv * 17 && ibc < smlmv * 18) fspRate += 0.004
  if (ibc >= smlmv * 18 && ibc < smlmv * 19) fspRate += 0.006
  if (ibc >= smlmv * 19 && ibc < smlmv * 20) fspRate += 0.008
  if (ibc >= smlmv * 20) fspRate += 0.01
  return roundCOP(ibc * fspRate)
}

export function calculateIBC({ employee, salaryTotals, novelties, annualParameters }) {
  const trace = []

  const noveltyIBC = roundCOP(
    (novelties || []).filter((novelty) => novelty.affectsIBC).reduce((acc, novelty) => acc + toNumber(novelty.amount), 0)
  )

  const integralBase =
    employee.salaryMode === "INTEGRAL"
      ? roundCOP(employee.baseMonthlySalary * toNumber(annualParameters.integralSalaryIBCPercent, 0.7))
      : 0

  const totalSalaryPayments =
    employee.salaryMode === "INTEGRAL"
      ? integralBase + salaryTotals.totalSalaryPayments
      : roundCOP(employee.baseMonthlySalary + salaryTotals.totalSalaryPayments)

  const totalNonSalaryPayments = salaryTotals.totalNonSalaryPayments
  const totalRemuneration = roundCOP(totalSalaryPayments + totalNonSalaryPayments)
  const nonSalaryLimit = roundCOP(totalRemuneration * 0.4)
  const nonSalaryExcess = Math.max(0, totalNonSalaryPayments - nonSalaryLimit)

  let ibc = roundCOP(totalSalaryPayments + nonSalaryExcess + noveltyIBC)

  const minIbc = toNumber(annualParameters.smlmv)
  const maxIbc = roundCOP(toNumber(annualParameters.smlmv) * 25)

  if (ibc < minIbc) {
    trace.push(`IBC ajustado al piso legal: ${minIbc.toLocaleString("es-CO")}.`)
    ibc = minIbc
  }

  if (ibc > maxIbc) {
    trace.push(`IBC ajustado al tope legal: ${maxIbc.toLocaleString("es-CO")}.`)
    ibc = maxIbc
  }

  if (employee.salaryMode === "INTEGRAL") {
    trace.push("IBC integral calculado con porcentaje parametrizable del salario integral.")
  }

  return {
    values: {
      ibc,
      totalSalaryPayments,
      totalNonSalaryPayments,
      nonSalaryExcess,
      noveltyIBC,
    },
    trace,
  }
}

export function calculateSocialSecurity({ ibc, riskClass, annualParameters }) {
  const healthEmployee = roundCOP(ibc * toNumber(annualParameters.healthEmployeeRate, 0.04))
  const healthEmployer = roundCOP(ibc * toNumber(annualParameters.healthEmployerRate, 0.085))
  const pensionEmployee = roundCOP(ibc * toNumber(annualParameters.pensionEmployeeRate, 0.04))
  const pensionEmployer = roundCOP(ibc * toNumber(annualParameters.pensionEmployerRate, 0.12))
  const arlRate = toNumber(annualParameters.arlRates?.[Number(riskClass)] ?? annualParameters.arlRates?.[1], 0.00522)
  const arlEmployer = roundCOP(ibc * arlRate)
  const fspEmployee = calculateFsp(ibc, annualParameters.smlmv)

  return {
    saludEmpleado: healthEmployee,
    saludEmpleador: healthEmployer,
    pensionEmpleado: pensionEmployee,
    pensionEmpleador: pensionEmployer,
    arlEmpleador: arlEmployer,
    fspEmpleado: fspEmployee,
  }
}

export function zeroSocialSecurity() {
  return {
    saludEmpleado: 0,
    saludEmpleador: 0,
    pensionEmpleado: 0,
    pensionEmpleador: 0,
    arlEmpleador: 0,
    fspEmpleado: 0,
  }
}
