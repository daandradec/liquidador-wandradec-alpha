import { CONTRACT_TYPES, SALARY_MODES } from "./defaults.js"

const asDate = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function validateEmployee(employee, annualParameters) {
  const errors = []
  const warnings = []

  if (!employee.identification?.trim()) errors.push("La identificación del empleado es obligatoria.")
  if (!employee.name?.trim()) errors.push("El nombre del empleado es obligatorio.")
  if (!asDate(employee.startDate)) errors.push("La fecha de inicio del contrato es obligatoria.")

  if (!CONTRACT_TYPES.includes(employee.contractType)) {
    errors.push("Tipo de contrato inválido.")
  }

  if (!SALARY_MODES.includes(employee.salaryMode)) {
    errors.push("Modo salarial inválido.")
  }

  if (employee.contractType === "FIXED_TERM" && !asDate(employee.fixedTermEndDate)) {
    errors.push("El contrato a término fijo requiere fecha final.")
  }

  if (employee.contractType === "PROJECT" && !employee.projectDescription?.trim()) {
    errors.push("El contrato por obra/labor requiere descripción de la obra.")
  }

  const startDate = asDate(employee.startDate)
  const endDate = asDate(employee.endDate)
  if (startDate && endDate && endDate < startDate) {
    errors.push("La fecha de retiro no puede ser anterior a la fecha de inicio.")
  }

  if (employee.baseMonthlySalary < 0) {
    errors.push("El salario base no puede ser negativo.")
  }

  if (employee.salaryMode === "INTEGRAL" && annualParameters?.smlmv) {
    const legalIntegralThreshold = annualParameters.smlmv * 13
    if (employee.baseMonthlySalary < legalIntegralThreshold) {
      warnings.push(
        `El salario integral debería ser al menos ${Math.round(legalIntegralThreshold).toLocaleString("es-CO")} COP para la vigencia seleccionada.`
      )
    }
  }

  const riskClass = Number(employee.riskClass)
  if (!Number.isFinite(riskClass) || riskClass < 1 || riskClass > 5) {
    errors.push("La clase de riesgo ARL debe estar entre 1 y 5.")
  }

  return { errors, warnings }
}

export function validateConcept(concept) {
  const errors = []
  if (!concept.code?.trim()) errors.push("El código del concepto es obligatorio.")
  if (!concept.description?.trim()) errors.push("La descripción del concepto es obligatoria.")
  if (!Number.isFinite(Number(concept.amount)) || Number(concept.amount) < 0) {
    errors.push("El monto del concepto debe ser un número mayor o igual a 0.")
  }
  return { errors }
}

export function validateNovelty(novelty) {
  const errors = []
  if (!novelty.code?.trim()) errors.push("El código de la novedad es obligatorio.")
  if (!novelty.description?.trim()) errors.push("La descripción de la novedad es obligatoria.")
  if (!asDate(novelty.startDate) || !asDate(novelty.endDate)) {
    errors.push("La novedad requiere fecha inicio y fin válidas.")
  }

  const start = asDate(novelty.startDate)
  const end = asDate(novelty.endDate)
  if (start && end && end < start) {
    errors.push("La fecha final de novedad no puede ser menor que la inicial.")
  }

  if (!Number.isFinite(Number(novelty.amount)) || Number(novelty.amount) < 0) {
    errors.push("El monto de la novedad debe ser un número mayor o igual a 0.")
  }

  return { errors }
}

export function validateLiquidationRequest(req) {
  const errors = []

  if (!req.employee) {
    errors.push("No hay empleado seleccionado para liquidar.")
  }

  if (!req.liquidationDate) {
    errors.push("La fecha de liquidación es obligatoria.")
  }

  if (!req.annualParameters || !Number.isFinite(Number(req.annualParameters.smlmv))) {
    errors.push("No hay parámetros anuales válidos para la vigencia seleccionada.")
  }

  return { errors }
}
