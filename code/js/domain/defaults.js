const randomId = () => crypto.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`

export const CONTRACT_TYPES = ["INDEFINITE", "FIXED_TERM", "PROJECT", "OCCASIONAL"]
export const SALARY_MODES = ["ORDINARY", "INTEGRAL"]

export function createEmptyEmployee() {
  return {
    id: randomId(),
    identification: "",
    name: "",
    startDate: "",
    endDate: "",
    salaryMode: "ORDINARY",
    contractType: "INDEFINITE",
    baseMonthlySalary: 0,
    variableSalary: false,
    transportAllowance: 0,
    riskClass: 1,
    includeAdditionalSalaryFactors: true,
    fixedTermEndDate: "",
    projectDescription: "",
    payConcepts: [],
    novelties: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createEmptyConcept() {
  return {
    id: randomId(),
    code: "",
    description: "",
    amount: 0,
    isSalary: true,
    isHabitual: true,
    affectsSeveranceBase: true,
    affectsBonusBase: true,
    affectsVacationBase: true,
    affectsSocialSecurityIBC: true,
    effectiveDate: "",
    classificationBasis: "",
    classificationChangedBy: "",
    classificationChangedAt: new Date().toISOString(),
  }
}

export function createEmptyNovelty() {
  return {
    id: randomId(),
    code: "",
    description: "",
    amount: 0,
    affectsIBC: true,
    affectsSalaryAverage: true,
    startDate: "",
    endDate: "",
  }
}

export function createDefaultState() {
  return {
    version: 1,
    employees: [],
    liquidations: [],
    selectedEmployeeId: null,
    updatedAt: new Date().toISOString(),
  }
}
