import assert from "node:assert/strict"
import { liquidateEmployee } from "../js/engine/liquidate.js"
import { getAnnualParameters } from "../js/config/annual-parameters.js"

const params = getAnnualParameters(2026)

function createBaseEmployee(overrides = {}) {
  return {
    id: "emp-test",
    identification: "123",
    name: "Empleado Test",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    salaryMode: "ORDINARY",
    contractType: "INDEFINITE",
    baseMonthlySalary: 2000000,
    variableSalary: false,
    transportAllowance: 0,
    riskClass: 1,
    includeAdditionalSalaryFactors: true,
    fixedTermEndDate: "",
    projectDescription: "",
    ...overrides,
  }
}

function run(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`fail - ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

run("Caso 1: salario fijo ordinario", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({ baseMonthlySalary: 2000000 }),
    payConcepts: [],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-12-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.meta.daysWorked, 360)
  assert.equal(result.accruals.cesantias, 2000000)
  assert.equal(result.accruals.interesesCesantias, 240000)
  assert.equal(result.accruals.primaServicios, 2000000)
  assert.equal(result.accruals.vacaciones, 1000000)
})

run("Caso 2: salario variable", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({
      startDate: "2025-01-01",
      endDate: "2025-08-31",
      baseMonthlySalary: 0,
      variableSalary: true,
    }),
    payConcepts: [
      {
        id: "c1",
        code: "COMISION",
        description: "Comisión",
        amount: 2500000,
        isSalary: true,
        isHabitual: true,
        affectsSeveranceBase: true,
        affectsBonusBase: true,
        affectsVacationBase: true,
        affectsSocialSecurityIBC: true,
      },
    ],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-08-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.meta.daysWorked, 240)
  assert.equal(result.accruals.cesantias, 1666667)
  assert.equal(result.accruals.interesesCesantias, 133333)
})

run("Caso 3: salario integral", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({
      salaryMode: "INTEGRAL",
      baseMonthlySalary: 15000000,
    }),
    payConcepts: [],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-12-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.meta.daysWorked, 360)
  assert.equal(result.accruals.cesantias, 0)
  assert.equal(result.accruals.interesesCesantias, 0)
  assert.equal(result.accruals.primaServicios, 0)
  assert.equal(result.accruals.vacaciones, 7500000)
})

run("Caso 4: IBC con exceso no salarial", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({
      baseMonthlySalary: 0,
      endDate: "2025-01-31",
    }),
    payConcepts: [
      {
        id: "s1",
        code: "SALARIO",
        description: "Salario variable",
        amount: 5000000,
        isSalary: true,
        isHabitual: true,
        affectsSeveranceBase: true,
        affectsBonusBase: true,
        affectsVacationBase: true,
        affectsSocialSecurityIBC: true,
      },
      {
        id: "n1",
        code: "BONO_NO_SAL",
        description: "Bono no salarial",
        amount: 4000000,
        isSalary: false,
        isHabitual: true,
        affectsSeveranceBase: false,
        affectsBonusBase: false,
        affectsVacationBase: false,
        affectsSocialSecurityIBC: true,
      },
    ],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-01-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.bases.ibc, 5400000)
})

run("Caso 5: indemnización indefinido < 10 SMLMV", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({
      startDate: "2023-01-01",
      endDate: "2025-12-31",
      baseMonthlySalary: 3000000,
      contractType: "INDEFINITE",
    }),
    payConcepts: [],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-12-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.meta.daysWorked, 1080)
  assert.equal(result.accruals.indemnizacionDespido, 7000000)
})

run("Caso 6: indemnización indefinido >= 10 SMLMV", () => {
  const result = liquidateEmployee({
    employee: createBaseEmployee({
      startDate: "2023-01-01",
      endDate: "2025-12-31",
      baseMonthlySalary: 18000000,
      contractType: "INDEFINITE",
    }),
    payConcepts: [],
    novelties: [],
    annualParameters: params,
    liquidationDate: "2025-12-31",
    calculateSocialSecurity: false,
    calculateWithholdingTax: false,
    litigationMode: false,
    withholdingProcedure: 1,
  })

  assert.equal(result.ok, true)
  assert.equal(result.meta.daysWorked, 1080)
  assert.equal(result.accruals.indemnizacionDespido, 30000000)
})

if (process.exitCode) {
  process.exit(process.exitCode)
}
