import { LABOR_YEAR_DAYS } from "./constants.js"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function roundCOP(value) {
  return Math.round(toNumber(value, 0))
}

export function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = parseDate(value)
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}

export function addDays(dateInput, days) {
  const date = parseDate(dateInput)
  if (!date) return null
  const output = new Date(date)
  output.setDate(output.getDate() + days)
  return output
}

export function diffDaysInclusive(startInput, endInput) {
  const start = parseDate(startInput)
  const end = parseDate(endInput)
  if (!start || !end || end < start) return 0
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
}

export function calculateDaysWorked360(startInput, endInput) {
  const start = parseDate(startInput)
  const end = parseDate(endInput)
  if (!start || !end || end < start) return 0
  if (start.getTime() === end.getTime()) return 1

  let startDay = start.getDate()
  let endDay = end.getDate()

  // Convención 30/360 (US) para mantener consistencia en liquidaciones laborales.
  if (startDay === 31) startDay = 30
  if (endDay === 31 && (startDay === 30 || startDay === 31)) endDay = 30

  const startMonth = start.getMonth() + 1
  const endMonth = end.getMonth() + 1
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  const days360 =
    (endYear - startYear) * LABOR_YEAR_DAYS +
    (endMonth - startMonth) * 30 +
    (endDay - startDay)

  return Math.max(0, days360)
}

export function safeMaxDate(...values) {
  const parsed = values.map(parseDate).filter(Boolean)
  if (!parsed.length) return null
  return new Date(Math.max(...parsed.map((date) => date.getTime())))
}

export function safeMinDate(...values) {
  const parsed = values.map(parseDate).filter(Boolean)
  if (!parsed.length) return null
  return new Date(Math.min(...parsed.map((date) => date.getTime())))
}

export function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "on"
}
