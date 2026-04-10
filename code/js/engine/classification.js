import { roundCOP, toNumber } from "./utils.js"

export function isExcludedFromVacationBase(conceptCode = "") {
  return /EXTRA|OVERTIME|DOMINICAL|FESTIVO|RECARGO/i.test(conceptCode)
}

export function calculateSalaryClassificationTotals(payConcepts) {
  const salaryConcepts = payConcepts.filter((concept) => concept.isSalary)
  const nonSalaryConcepts = payConcepts.filter((concept) => !concept.isSalary)

  const totalSalaryPayments = roundCOP(
    salaryConcepts
      .filter((concept) => concept.affectsSocialSecurityIBC)
      .reduce((acc, concept) => acc + toNumber(concept.amount), 0)
  )

  const totalNonSalaryPayments = roundCOP(
    nonSalaryConcepts
      .filter((concept) => concept.affectsSocialSecurityIBC)
      .reduce((acc, concept) => acc + toNumber(concept.amount), 0)
  )

  return {
    salaryConcepts,
    nonSalaryConcepts,
    totalSalaryPayments,
    totalNonSalaryPayments,
  }
}

export function sumAdditionalSalaryFactors(payConcepts, selector) {
  return roundCOP(
    payConcepts
      .filter((concept) => concept.isSalary)
      .filter((concept) => selector(concept) === true)
      .reduce((acc, concept) => acc + toNumber(concept.amount), 0)
  )
}
