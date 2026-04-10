export function formatCOP(value) {
  return Number(value || 0).toLocaleString("es-CO")
}

export function formatContractType(type) {
  const map = {
    INDEFINITE: "Indefinido",
    FIXED_TERM: "Término fijo",
    PROJECT: "Obra/labor",
    OCCASIONAL: "Ocasional",
  }
  return map[type] || type
}

export function formatSalaryMode(mode) {
  return mode === "INTEGRAL" ? "Integral" : "Ordinario"
}
