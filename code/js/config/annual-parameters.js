export const ANNUAL_PARAMETERS = {
  2025: {
    year: 2025,
    smlmv: 1423500,
    transportAllowance: 200000,
    uvt: 49799,
    nightShiftStartsAt: "19:00",
    dayShiftStartsAt: "06:00",
    sundayHolidaySurchargePercent: 0.8,
    healthEmployeeRate: 0.04,
    healthEmployerRate: 0.085,
    pensionEmployeeRate: 0.04,
    pensionEmployerRate: 0.12,
    arlRates: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 },
    integralSalaryIBCPercent: 0.7,
  },
  2026: {
    year: 2026,
    smlmv: 1560000,
    transportAllowance: 220000,
    uvt: 52374,
    nightShiftStartsAt: "19:00",
    dayShiftStartsAt: "06:00",
    sundayHolidaySurchargePercent: 0.9,
    healthEmployeeRate: 0.04,
    healthEmployerRate: 0.085,
    pensionEmployeeRate: 0.04,
    pensionEmployerRate: 0.12,
    arlRates: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 },
    integralSalaryIBCPercent: 0.7,
  },
  2027: {
    year: 2027,
    smlmv: 1700000,
    transportAllowance: 240000,
    uvt: 54800,
    nightShiftStartsAt: "19:00",
    dayShiftStartsAt: "06:00",
    sundayHolidaySurchargePercent: 1,
    healthEmployeeRate: 0.04,
    healthEmployerRate: 0.085,
    pensionEmployeeRate: 0.04,
    pensionEmployerRate: 0.12,
    arlRates: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 },
    integralSalaryIBCPercent: 0.7,
  },
}

export function getSundayHolidaySurchargePercent(dateInput) {
  const date = typeof dateInput === "string" ? new Date(`${dateInput}T00:00:00`) : dateInput
  if (date >= new Date("2027-07-01T00:00:00")) return 1
  if (date >= new Date("2026-07-01T00:00:00")) return 0.9
  if (date >= new Date("2025-07-01T00:00:00")) return 0.8
  return 0.75
}

export function getAnnualParameters(year) {
  const normalizedYear = Number(year)
  if (ANNUAL_PARAMETERS[normalizedYear]) {
    return structuredClone(ANNUAL_PARAMETERS[normalizedYear])
  }

  const years = Object.keys(ANNUAL_PARAMETERS)
    .map(Number)
    .sort((a, b) => a - b)

  const fallbackYear = years[years.length - 1]
  const fallback = structuredClone(ANNUAL_PARAMETERS[fallbackYear])
  fallback.year = normalizedYear
  return fallback
}

export function getAvailableYears() {
  return Object.keys(ANNUAL_PARAMETERS)
    .map(Number)
    .sort((a, b) => a - b)
}
