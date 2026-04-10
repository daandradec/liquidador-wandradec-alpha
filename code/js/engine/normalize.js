import { validateEmployee, validateLiquidationRequest } from "../domain/validators.js"
import { formatDate, isTruthy, parseDate, toNumber } from "./utils.js"

function normalizeConcept(concept) {
  return {
    id: concept.id,
    code: `${concept.code || ""}`.trim().toUpperCase(),
    description: `${concept.description || ""}`.trim(),
    amount: toNumber(concept.amount),
    isSalary: isTruthy(concept.isSalary),
    isHabitual: isTruthy(concept.isHabitual),
    affectsSeveranceBase: isTruthy(concept.affectsSeveranceBase),
    affectsBonusBase: isTruthy(concept.affectsBonusBase),
    affectsVacationBase: isTruthy(concept.affectsVacationBase),
    affectsSocialSecurityIBC: isTruthy(concept.affectsSocialSecurityIBC),
    effectiveDate: concept.effectiveDate ? formatDate(concept.effectiveDate) : "",
    classificationBasis: `${concept.classificationBasis || ""}`.trim(),
    classificationChangedBy: `${concept.classificationChangedBy || "sistema"}`.trim(),
    classificationChangedAt: concept.classificationChangedAt || new Date().toISOString(),
  }
}

function normalizeNovelty(novelty) {
  return {
    id: novelty.id,
    code: `${novelty.code || ""}`.trim().toUpperCase(),
    description: `${novelty.description || ""}`.trim(),
    amount: toNumber(novelty.amount),
    affectsIBC: isTruthy(novelty.affectsIBC),
    affectsSalaryAverage: isTruthy(novelty.affectsSalaryAverage),
    startDate: formatDate(novelty.startDate),
    endDate: formatDate(novelty.endDate),
  }
}

export function normalizeRequest(rawRequest) {
  const validation = validateLiquidationRequest(rawRequest)
  if (validation.errors.length) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: [],
      trace: ["La solicitud no pasó validaciones mínimas."],
    }
  }

  const employee = {
    ...rawRequest.employee,
    identification: `${rawRequest.employee.identification || ""}`.trim(),
    name: `${rawRequest.employee.name || ""}`.trim(),
    startDate: formatDate(rawRequest.employee.startDate),
    endDate: formatDate(rawRequest.employee.endDate),
    salaryMode: rawRequest.employee.salaryMode || "ORDINARY",
    contractType: rawRequest.employee.contractType || "INDEFINITE",
    baseMonthlySalary: toNumber(rawRequest.employee.baseMonthlySalary),
    variableSalary: isTruthy(rawRequest.employee.variableSalary),
    transportAllowance: toNumber(rawRequest.employee.transportAllowance),
    riskClass: Number(rawRequest.employee.riskClass || 1),
    includeAdditionalSalaryFactors: isTruthy(rawRequest.employee.includeAdditionalSalaryFactors),
    fixedTermEndDate: formatDate(rawRequest.employee.fixedTermEndDate),
    projectDescription: `${rawRequest.employee.projectDescription || ""}`.trim(),
  }

  const employeeValidation = validateEmployee(employee, rawRequest.annualParameters)
  if (employeeValidation.errors.length) {
    return {
      ok: false,
      errors: employeeValidation.errors,
      warnings: employeeValidation.warnings,
      trace: ["El empleado no pasó validaciones de negocio."],
    }
  }

  const liquidationDate = formatDate(rawRequest.liquidationDate)
  if (!parseDate(liquidationDate)) {
    return {
      ok: false,
      errors: ["La fecha de liquidación no es válida."],
      warnings: employeeValidation.warnings,
      trace: [],
    }
  }

  return {
    ok: true,
    errors: [],
    warnings: employeeValidation.warnings,
    trace: ["Solicitud normalizada correctamente."],
    value: {
      employee,
      payConcepts: (rawRequest.payConcepts || []).map(normalizeConcept),
      novelties: (rawRequest.novelties || []).map(normalizeNovelty),
      annualParameters: { ...rawRequest.annualParameters },
      liquidationDate,
      calculateSocialSecurity: isTruthy(rawRequest.calculateSocialSecurity),
      calculateWithholdingTax: isTruthy(rawRequest.calculateWithholdingTax),
      litigationMode: isTruthy(rawRequest.litigationMode),
      withholdingProcedure: Number(rawRequest.withholdingProcedure || 1) === 2 ? 2 : 1,
    },
  }
}
