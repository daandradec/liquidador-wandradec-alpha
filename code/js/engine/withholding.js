import { roundCOP } from "./utils.js"

function calculateRetentionUVT(uvtBase) {
  if (uvtBase <= 95) return 0
  if (uvtBase <= 150) return (uvtBase - 95) * 0.19
  if (uvtBase <= 360) return (uvtBase - 150) * 0.28 + 10
  if (uvtBase <= 640) return (uvtBase - 360) * 0.33 + 69
  if (uvtBase <= 945) return (uvtBase - 640) * 0.35 + 162
  if (uvtBase <= 2300) return (uvtBase - 945) * 0.37 + 268
  return (uvtBase - 2300) * 0.39 + 770
}

export function calculateWithholdingBasic({
  employee,
  payConcepts,
  socialSecurity,
  annualParameters,
  withholdingProcedure,
}) {
  const trace = []

  const salaryIncome = roundCOP(
    employee.baseMonthlySalary +
      payConcepts.filter((concept) => concept.isSalary).reduce((acc, concept) => acc + Number(concept.amount || 0), 0)
  )

  const nonConstitutiveIncome =
    socialSecurity.saludEmpleado + socialSecurity.pensionEmpleado + socialSecurity.fspEmpleado

  let taxableBase = Math.max(0, salaryIncome - nonConstitutiveIncome)

  if (withholdingProcedure === 2) {
    taxableBase = roundCOP(taxableBase * 0.95)
    trace.push("Procedimiento 2 (básico): se aplica ajuste conservador del 95% a la base gravable.")
  }

  const uvtValue = Number(annualParameters.uvt || 0)
  if (uvtValue <= 0) {
    return {
      retefuente: 0,
      trace: ["UVT inválida; la retefuente no se calculó."],
    }
  }

  const uvtBase = taxableBase / uvtValue
  const retentionUVT = calculateRetentionUVT(uvtBase)
  const retefuente = roundCOP(retentionUVT * uvtValue)

  trace.push("Cesantías e intereses de cesantías no se incluyeron en base ordinaria de retefuente mensual.")

  return {
    retefuente,
    trace,
  }
}
