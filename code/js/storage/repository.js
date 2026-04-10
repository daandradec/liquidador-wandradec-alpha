import { createDefaultState } from "../domain/defaults.js"

const STORAGE_KEY = "liquidador_laboral_colombia_v1"

let memoryState = createDefaultState()

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function deepClone(value) {
  return structuredClone(value)
}

export function loadState() {
  if (!canUseLocalStorage()) return deepClone(memoryState)

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return createDefaultState()

  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.employees) || !Array.isArray(parsed.liquidations)) {
      return createDefaultState()
    }
    return parsed
  } catch {
    return createDefaultState()
  }
}

export function saveState(state) {
  const normalized = {
    ...state,
    version: 1,
    updatedAt: new Date().toISOString(),
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } else {
    memoryState = deepClone(normalized)
  }

  return normalized
}

export function exportStateAsJSON(state) {
  return JSON.stringify({ ...state, version: 1 }, null, 2)
}

export function importStateFromJSON(raw) {
  const parsed = JSON.parse(raw)
  if (parsed?.version !== 1 || !Array.isArray(parsed.employees) || !Array.isArray(parsed.liquidations)) {
    throw new Error("Formato de respaldo no soportado. Se esperaba versión 1.")
  }
  return saveState(parsed)
}
