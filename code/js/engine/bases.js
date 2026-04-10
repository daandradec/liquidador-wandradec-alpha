import { sumAdditionalSalaryFactors, isExcludedFromVacationBase } from "./classification.js"
import { roundCOP, toNumber } from "./utils.js"

function getVariableBaseAverage({ employee, payConcepts, novelties, includeVacationRestricted }) {
  const conceptsForAverage = payConcepts.filter((concept) => concept.isSalary)

  const conceptSum = conceptsForAverage
    .filter((concept) => (includeVacationRestricted ? !isExcludedFromVacationBase(concept.code) : true))
    .reduce((acc, concept) => acc + toNumber(concept.amount), 0)

  const noveltyAdjustments = (novelties || [])
    .filter((novelty) => novelty.affectsSalaryAverage)
    .reduce((acc, novelty) => acc + toNumber(novelty.amount), 0)

  return roundCOP(employee.baseMonthlySalary + conceptSum + noveltyAdjustments)
}

export function calculateBases({ employee, payConcepts, novelties, annualParameters, ibc }) {
  const trace = []

  if (employee.salaryMode === "INTEGRAL") {
    const vacationBase = roundCOP(employee.baseMonthlySalary)
    trace.push("Salario integral: cesantías, intereses y prima se bloquean en base 0; vacaciones sí se liquidan.")
    return {
      values: {
        severanceBase: 0,
        severanceInterestBase: 0,
        serviceBonusBase: 0,
        vacationBase,
        dismissalCompensationBase: roundCOP(employee.baseMonthlySalary),
        ibc: roundCOP(ibc),
      },
      trace,
    }
  }

  const useAdditional = employee.includeAdditionalSalaryFactors
  const severanceAdditional = useAdditional
    ? sumAdditionalSalaryFactors(payConcepts, (concept) => concept.affectsSeveranceBase)
    : 0
  const bonusAdditional = useAdditional
    ? sumAdditionalSalaryFactors(payConcepts, (concept) => concept.affectsBonusBase)
    : 0
  const vacationAdditional = useAdditional
    ? sumAdditionalSalaryFactors(
        payConcepts,
        (concept) => concept.affectsVacationBase && !isExcludedFromVacationBase(concept.code)
      )
    : 0
  const dismissalAdditional = useAdditional
    ? sumAdditionalSalaryFactors(payConcepts, (concept) => concept.affectsSeveranceBase || concept.affectsBonusBase)
    : 0

  let severanceBase = roundCOP(employee.baseMonthlySalary + severanceAdditional)
  let serviceBonusBase = roundCOP(employee.baseMonthlySalary + bonusAdditional)
  let vacationBase = roundCOP(employee.baseMonthlySalary + vacationAdditional)
  let dismissalCompensationBase = roundCOP(employee.baseMonthlySalary + dismissalAdditional)

  if (employee.variableSalary) {
    severanceBase = getVariableBaseAverage({
      employee,
      payConcepts,
      novelties,
      includeVacationRestricted: false,
    })

    serviceBonusBase = severanceBase

    vacationBase = getVariableBaseAverage({
      employee,
      payConcepts,
      novelties,
      includeVacationRestricted: true,
    })

    dismissalCompensationBase = severanceBase

    trace.push(
      "Salario variable activo: la base se calcula con promedio del devengado + novedades que afectan promedios salariales."
    )
  }

  if (!employee.includeAdditionalSalaryFactors) {
    trace.push("Se desactivó la inclusión de factores salariales adicionales: se usa únicamente salario base parametrizado.")
  }

  if ((payConcepts || []).some((concept) => !concept.isSalary && concept.affectsSocialSecurityIBC)) {
    trace.push("Se detectaron conceptos no salariales que pueden impactar IBC por exceso del 40%.")
  }

  if ((novelties || []).some((novelty) => novelty.affectsIBC)) {
    trace.push("Novedades con impacto IBC aplicadas en cálculo de seguridad social.")
  }

  return {
    values: {
      severanceBase,
      severanceInterestBase: severanceBase,
      serviceBonusBase,
      vacationBase,
      dismissalCompensationBase,
      ibc: roundCOP(ibc),
    },
    trace,
  }
}
