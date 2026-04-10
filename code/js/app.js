import { getAnnualParameters, getAvailableYears } from "./config/annual-parameters.js"
import { createEmptyConcept, createEmptyEmployee, createEmptyNovelty } from "./domain/defaults.js"
import { validateConcept, validateEmployee, validateNovelty } from "./domain/validators.js"
import { liquidateEmployee } from "./engine/liquidate.js"
import { exportLiquidationsToCSV } from "./export/csv.js"
import { exportLiquidationsToPDF } from "./export/pdf.js"
import { exportLiquidationsToXLSX } from "./export/excel.js"
import { exportStateAsJSON, importStateFromJSON, loadState, saveState } from "./storage/repository.js"
import { formatContractType, formatCOP, formatSalaryMode } from "./ui/format.js"

const today = new Date().toISOString().slice(0, 10)

const refs = {
  employeeForm: document.querySelector("#employee-form"),
  conceptForm: document.querySelector("#concept-form"),
  noveltyForm: document.querySelector("#novelty-form"),
  liquidationForm: document.querySelector("#liquidation-form"),
  employeeFormReset: document.querySelector("#employee-form-reset"),
  conceptFormReset: document.querySelector("#concept-form-reset"),
  conceptsEnabledToggle: document.querySelector("#concepts-enabled-toggle"),
  conceptsEntryContainer: document.querySelector("#concepts-entry-container"),
  conceptsSkipContainer: document.querySelector("#concepts-skip-container"),
  conceptsContinueBtn: document.querySelector("#concepts-continue-btn"),
  noveltyFormReset: document.querySelector("#novelty-form-reset"),
  annualYear: document.querySelector("#annual-year"),
  liquidationDate: document.querySelector("#liquidation-date"),
  employeesTableBody: document.querySelector("#employees-table-body"),
  conceptsTableBody: document.querySelector("#concepts-table-body"),
  noveltiesTableBody: document.querySelector("#novelties-table-body"),
  liquidationsTableBody: document.querySelector("#liquidations-table-body"),
  resultOutput: document.querySelector("#result-output"),
  selectedEmployeeLabel: document.querySelector("#selected-employee-label"),
  employeesCount: document.querySelector("#employees-count"),
  liquidationsCount: document.querySelector("#liquidations-count"),
  backupJson: document.querySelector("#backup-json"),
  importJson: document.querySelector("#import-json"),
  exportCsv: document.querySelector("#export-csv"),
  exportXlsx: document.querySelector("#export-xlsx"),
  exportPdf: document.querySelector("#export-pdf"),
  toast: document.querySelector("#toast"),
  tabButtons: [...document.querySelectorAll("[role='tab'][data-step]")],
  tabPanels: [...document.querySelectorAll("[role='tabpanel'][data-step-panel]")],
}

const TAB_ORDER = ["employee", "concepts", "novelties", "liquidation", "history"]

let state = loadState()
let currentResultRecord = null
let activeTab = TAB_ORDER[0]
let pendingConceptsToggle = false

function getInputValue(id) {
  return document.querySelector(`#${id}`).value
}

function getInputChecked(id) {
  return document.querySelector(`#${id}`).checked
}

function findEmployee(employeeId) {
  return state.employees.find((employee) => employee.id === employeeId)
}

function getSelectedEmployee() {
  return state.selectedEmployeeId ? findEmployee(state.selectedEmployeeId) : null
}

function areConceptsEnabled(employee) {
  return Boolean(employee?.hasCommissionOrIncapacityInConcepts)
}

function makeId() {
  return crypto.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function showToast(message, isError = false) {
  refs.toast.textContent = message
  refs.toast.classList.add("show")
  refs.toast.classList.toggle("error", isError)
  setTimeout(() => refs.toast.classList.remove("show"), 2800)
}

function persist() {
  state = saveState(state)
  updateHeader()
}

function setActiveTab(step, options = {}) {
  const { focus = false } = options
  if (!TAB_ORDER.includes(step)) return

  activeTab = step

  refs.tabButtons.forEach((button) => {
    const isActive = button.dataset.step === step
    button.setAttribute("aria-selected", String(isActive))
    button.tabIndex = isActive ? 0 : -1
    if (isActive && focus) button.focus()
  })

  refs.tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.stepPanel !== step
  })
}

function getNextTabStep(currentStep, direction) {
  const currentIndex = TAB_ORDER.indexOf(currentStep)
  if (currentIndex < 0) return TAB_ORDER[0]

  if (direction === "first") return TAB_ORDER[0]
  if (direction === "last") return TAB_ORDER[TAB_ORDER.length - 1]

  const nextIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length
  return TAB_ORDER[nextIndex]
}

function setupTabs() {
  refs.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.step, { focus: true })
    })

    button.addEventListener("keydown", (event) => {
      let nextStep = null

      if (event.key === "ArrowRight") nextStep = getNextTabStep(button.dataset.step, 1)
      if (event.key === "ArrowLeft") nextStep = getNextTabStep(button.dataset.step, -1)
      if (event.key === "Home") nextStep = getNextTabStep(button.dataset.step, "first")
      if (event.key === "End") nextStep = getNextTabStep(button.dataset.step, "last")
      if (event.key === "Enter" || event.key === " ") nextStep = button.dataset.step

      if (!nextStep) return
      event.preventDefault()
      setActiveTab(nextStep, { focus: true })
    })
  })

  setActiveTab(activeTab)
}

function updateHeader() {
  const selected = getSelectedEmployee()
  refs.selectedEmployeeLabel.textContent = selected ? `${selected.name} (${selected.identification})` : "Ninguno"
  refs.employeesCount.textContent = `${state.employees.length}`
  refs.liquidationsCount.textContent = `${state.liquidations.length}`
}

function fillYearSelect() {
  const years = getAvailableYears()
  refs.annualYear.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("")

  const fallbackYear = years.includes(new Date().getFullYear())
    ? new Date().getFullYear()
    : years[years.length - 1]
  refs.annualYear.value = String(fallbackYear)
}

function resetEmployeeForm() {
  const empty = createEmptyEmployee()
  document.querySelector("#employee-id").value = ""
  document.querySelector("#employee-identification").value = empty.identification
  document.querySelector("#employee-name").value = empty.name
  document.querySelector("#employee-start-date").value = empty.startDate
  document.querySelector("#employee-end-date").value = empty.endDate
  document.querySelector("#employee-contract-type").value = empty.contractType
  document.querySelector("#employee-salary-mode").value = empty.salaryMode
  document.querySelector("#employee-base-salary").value = String(empty.baseMonthlySalary)
  document.querySelector("#employee-transport-allowance").value = String(empty.transportAllowance)
  document.querySelector("#employee-risk-class").value = String(empty.riskClass)
  document.querySelector("#employee-fixed-term-end-date").value = empty.fixedTermEndDate
  document.querySelector("#employee-project-description").value = empty.projectDescription
  document.querySelector("#employee-variable-salary").checked = empty.variableSalary
  document.querySelector("#employee-include-factors").checked = empty.includeAdditionalSalaryFactors
}

function resetConceptForm() {
  const empty = createEmptyConcept()
  document.querySelector("#concept-id").value = ""
  document.querySelector("#concept-code").value = empty.code
  document.querySelector("#concept-description").value = empty.description
  document.querySelector("#concept-amount").value = String(empty.amount)
  document.querySelector("#concept-effective-date").value = today
  document.querySelector("#concept-is-salary").checked = empty.isSalary
  document.querySelector("#concept-is-habitual").checked = empty.isHabitual
  document.querySelector("#concept-affects-severance").checked = empty.affectsSeveranceBase
  document.querySelector("#concept-affects-bonus").checked = empty.affectsBonusBase
  document.querySelector("#concept-affects-vacation").checked = empty.affectsVacationBase
  document.querySelector("#concept-affects-ibc").checked = empty.affectsSocialSecurityIBC
  document.querySelector("#concept-classification-basis").value = empty.classificationBasis
  document.querySelector("#concept-changed-by").value = empty.classificationChangedBy
}

function resetNoveltyForm() {
  const empty = createEmptyNovelty()
  document.querySelector("#novelty-id").value = ""
  document.querySelector("#novelty-code").value = empty.code
  document.querySelector("#novelty-description").value = empty.description
  document.querySelector("#novelty-amount").value = String(empty.amount)
  document.querySelector("#novelty-start-date").value = today
  document.querySelector("#novelty-end-date").value = today
  document.querySelector("#novelty-affects-ibc").checked = empty.affectsIBC
  document.querySelector("#novelty-affects-average").checked = empty.affectsSalaryAverage
}

function renderEmployeesTable() {
  if (!state.employees.length) {
    refs.employeesTableBody.innerHTML = `<tr><td colspan="5">No hay empleados registrados.</td></tr>`
    return
  }

  refs.employeesTableBody.innerHTML = state.employees
    .map(
      (employee) => `
      <tr>
        <td>${employee.identification}</td>
        <td>${employee.name}</td>
        <td>${formatContractType(employee.contractType)} · ${formatSalaryMode(employee.salaryMode)}</td>
        <td>${formatCOP(employee.baseMonthlySalary)}</td>
        <td>
          <button class="secondary" data-employee-action="select" data-id="${employee.id}">Seleccionar</button>
          <button class="secondary" data-employee-action="edit" data-id="${employee.id}">Editar</button>
          <button class="secondary" data-employee-action="delete" data-id="${employee.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("")
}

function renderConceptsTable() {
  const employee = getSelectedEmployee()
  if (!employee) {
    refs.conceptsTableBody.innerHTML = `<tr><td colspan="6">Selecciona un empleado para gestionar conceptos.</td></tr>`
    return
  }

  if (!employee.payConcepts.length) {
    refs.conceptsTableBody.innerHTML = `<tr><td colspan="6">No hay conceptos registrados.</td></tr>`
    return
  }

  refs.conceptsTableBody.innerHTML = employee.payConcepts
    .map(
      (concept) => `
      <tr>
        <td>${concept.code}</td>
        <td>${concept.description}</td>
        <td>${formatCOP(concept.amount)}</td>
        <td><span class="badge">${concept.isSalary ? "Salarial" : "No salarial"}</span></td>
        <td>${concept.classificationChangedBy || "sin usuario"}<br />${new Date(concept.classificationChangedAt).toLocaleString("es-CO")}</td>
        <td>
          <button class="secondary" data-concept-action="edit" data-id="${concept.id}">Editar</button>
          <button class="secondary" data-concept-action="delete" data-id="${concept.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("")
}

function renderNoveltiesTable() {
  const employee = getSelectedEmployee()
  if (!employee) {
    refs.noveltiesTableBody.innerHTML = `<tr><td colspan="5">Selecciona un empleado para gestionar novedades.</td></tr>`
    return
  }

  if (!employee.novelties.length) {
    refs.noveltiesTableBody.innerHTML = `<tr><td colspan="5">No hay novedades registradas.</td></tr>`
    return
  }

  refs.noveltiesTableBody.innerHTML = employee.novelties
    .map(
      (novelty) => `
      <tr>
        <td>${novelty.code}</td>
        <td>${formatCOP(novelty.amount)}</td>
        <td>${novelty.startDate} a ${novelty.endDate}</td>
        <td>${novelty.affectsIBC ? "Afecta IBC" : "Sin impacto IBC"} · ${novelty.affectsSalaryAverage ? "Afecta promedio" : "Sin promedio"}</td>
        <td>
          <button class="secondary" data-novelty-action="edit" data-id="${novelty.id}">Editar</button>
          <button class="secondary" data-novelty-action="delete" data-id="${novelty.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("")
}

function syncConceptsOptionalUI() {
  const employee = getSelectedEmployee()
  const enabled = employee ? areConceptsEnabled(employee) : pendingConceptsToggle

  if (!refs.conceptsEnabledToggle) return

  refs.conceptsEnabledToggle.checked = enabled
  refs.conceptsEntryContainer.hidden = !employee || !enabled
  refs.conceptsSkipContainer.hidden = !employee || enabled
}

function renderLiquidationsTable() {
  if (!state.liquidations.length) {
    refs.liquidationsTableBody.innerHTML = `<tr><td colspan="4">No hay liquidaciones guardadas.</td></tr>`
    return
  }

  refs.liquidationsTableBody.innerHTML = [...state.liquidations]
    .reverse()
    .map(
      (record) => `
      <tr>
        <td>${record.liquidationDate}</td>
        <td>${record.employeeName}</td>
        <td>${formatCOP(record.result.totals.netoPagar)}</td>
        <td>
          <button class="secondary" data-liquidation-action="view" data-id="${record.id}">Ver</button>
          <button class="secondary" data-liquidation-action="delete" data-id="${record.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("")
}

function renderAll() {
  renderEmployeesTable()
  renderConceptsTable()
  syncConceptsOptionalUI()
  renderNoveltiesTable()
  renderLiquidationsTable()
  updateHeader()
}

function setSelectedEmployee(employeeId) {
  state.selectedEmployeeId = employeeId
  persist()
  renderAll()
}

function upsertEmployee(employeeData) {
  const index = state.employees.findIndex((employee) => employee.id === employeeData.id)
  if (index >= 0) {
    state.employees[index] = {
      ...state.employees[index],
      ...employeeData,
      hasCommissionOrIncapacityInConcepts: Boolean(employeeData.hasCommissionOrIncapacityInConcepts),
      updatedAt: new Date().toISOString(),
    }
  } else {
    state.employees.push({
      ...employeeData,
      hasCommissionOrIncapacityInConcepts: Boolean(employeeData.hasCommissionOrIncapacityInConcepts),
      payConcepts: employeeData.payConcepts || [],
      novelties: employeeData.novelties || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

function collectEmployeeFormData() {
  const existing = findEmployee(getInputValue("employee-id"))

  return {
    id: getInputValue("employee-id") || makeId(),
    identification: getInputValue("employee-identification").trim(),
    name: getInputValue("employee-name").trim(),
    startDate: getInputValue("employee-start-date"),
    endDate: getInputValue("employee-end-date"),
    salaryMode: getInputValue("employee-salary-mode"),
    contractType: getInputValue("employee-contract-type"),
    baseMonthlySalary: Number(getInputValue("employee-base-salary") || 0),
    variableSalary: getInputChecked("employee-variable-salary"),
    transportAllowance: Number(getInputValue("employee-transport-allowance") || 0),
    riskClass: Number(getInputValue("employee-risk-class") || 1),
    includeAdditionalSalaryFactors: getInputChecked("employee-include-factors"),
    hasCommissionOrIncapacityInConcepts:
      existing?.hasCommissionOrIncapacityInConcepts ?? pendingConceptsToggle,
    fixedTermEndDate: getInputValue("employee-fixed-term-end-date"),
    projectDescription: getInputValue("employee-project-description").trim(),
    payConcepts: existing?.payConcepts || [],
    novelties: existing?.novelties || [],
  }
}

function collectConceptFormData() {
  return {
    id: getInputValue("concept-id") || makeId(),
    code: getInputValue("concept-code").trim().toUpperCase(),
    description: getInputValue("concept-description").trim(),
    amount: Number(getInputValue("concept-amount") || 0),
    isSalary: getInputChecked("concept-is-salary"),
    isHabitual: getInputChecked("concept-is-habitual"),
    affectsSeveranceBase: getInputChecked("concept-affects-severance"),
    affectsBonusBase: getInputChecked("concept-affects-bonus"),
    affectsVacationBase: getInputChecked("concept-affects-vacation"),
    affectsSocialSecurityIBC: getInputChecked("concept-affects-ibc"),
    effectiveDate: getInputValue("concept-effective-date") || today,
    classificationBasis: getInputValue("concept-classification-basis").trim(),
    classificationChangedBy: getInputValue("concept-changed-by").trim() || "usuario.web",
    classificationChangedAt: new Date().toISOString(),
  }
}

function collectNoveltyFormData() {
  return {
    id: getInputValue("novelty-id") || makeId(),
    code: getInputValue("novelty-code").trim().toUpperCase(),
    description: getInputValue("novelty-description").trim(),
    amount: Number(getInputValue("novelty-amount") || 0),
    affectsIBC: getInputChecked("novelty-affects-ibc"),
    affectsSalaryAverage: getInputChecked("novelty-affects-average"),
    startDate: getInputValue("novelty-start-date"),
    endDate: getInputValue("novelty-end-date"),
  }
}

function fillEmployeeForm(employee) {
  document.querySelector("#employee-id").value = employee.id
  document.querySelector("#employee-identification").value = employee.identification
  document.querySelector("#employee-name").value = employee.name
  document.querySelector("#employee-start-date").value = employee.startDate
  document.querySelector("#employee-end-date").value = employee.endDate || ""
  document.querySelector("#employee-contract-type").value = employee.contractType
  document.querySelector("#employee-salary-mode").value = employee.salaryMode
  document.querySelector("#employee-base-salary").value = String(employee.baseMonthlySalary)
  document.querySelector("#employee-transport-allowance").value = String(employee.transportAllowance || 0)
  document.querySelector("#employee-risk-class").value = String(employee.riskClass)
  document.querySelector("#employee-fixed-term-end-date").value = employee.fixedTermEndDate || ""
  document.querySelector("#employee-project-description").value = employee.projectDescription || ""
  document.querySelector("#employee-variable-salary").checked = !!employee.variableSalary
  document.querySelector("#employee-include-factors").checked = !!employee.includeAdditionalSalaryFactors
}

function fillConceptForm(concept) {
  document.querySelector("#concept-id").value = concept.id
  document.querySelector("#concept-code").value = concept.code
  document.querySelector("#concept-description").value = concept.description
  document.querySelector("#concept-amount").value = String(concept.amount)
  document.querySelector("#concept-effective-date").value = concept.effectiveDate || today
  document.querySelector("#concept-is-salary").checked = !!concept.isSalary
  document.querySelector("#concept-is-habitual").checked = !!concept.isHabitual
  document.querySelector("#concept-affects-severance").checked = !!concept.affectsSeveranceBase
  document.querySelector("#concept-affects-bonus").checked = !!concept.affectsBonusBase
  document.querySelector("#concept-affects-vacation").checked = !!concept.affectsVacationBase
  document.querySelector("#concept-affects-ibc").checked = !!concept.affectsSocialSecurityIBC
  document.querySelector("#concept-classification-basis").value = concept.classificationBasis || ""
  document.querySelector("#concept-changed-by").value = concept.classificationChangedBy || ""
}

function fillNoveltyForm(novelty) {
  document.querySelector("#novelty-id").value = novelty.id
  document.querySelector("#novelty-code").value = novelty.code
  document.querySelector("#novelty-description").value = novelty.description
  document.querySelector("#novelty-amount").value = String(novelty.amount)
  document.querySelector("#novelty-start-date").value = novelty.startDate
  document.querySelector("#novelty-end-date").value = novelty.endDate
  document.querySelector("#novelty-affects-ibc").checked = !!novelty.affectsIBC
  document.querySelector("#novelty-affects-average").checked = !!novelty.affectsSalaryAverage
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase())
}

function formatResultValue(value) {
  if (typeof value === "number") return value.toLocaleString("es-CO")
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (value == null || value === "") return "-"
  return String(value)
}

function flattenObjectEntries(data, parentKey = "") {
  const entries = []

  Object.entries(data || {}).forEach(([key, value]) => {
    const currentKey = parentKey ? `${parentKey} / ${key}` : key
    const isPlainObject = value && typeof value === "object" && !Array.isArray(value)

    if (isPlainObject) {
      entries.push(...flattenObjectEntries(value, currentKey))
      return
    }

    entries.push([currentKey, value])
  })

  return entries
}

function buildResultTableRows(data) {
  return flattenObjectEntries(data)
    .map(([key, value]) => {
      return `<tr><th>${escapeHtml(humanizeKey(key))}</th><td>${escapeHtml(formatResultValue(value))}</td></tr>`
    })
    .join("")
}

function buildResultSection(title, data) {
  return `
    <section class="result-section">
      <h3 class="result-section-title">${escapeHtml(title)}</h3>
      <table class="result-table">
        <tbody>
          ${buildResultTableRows(data)}
        </tbody>
      </table>
    </section>
  `
}

function buildTextListSection(title, items) {
  if (!items?.length) return ""

  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
  return `
    <section class="result-section">
      <h3 class="result-section-title">${escapeHtml(title)}</h3>
      <ul class="result-list">${listItems}</ul>
    </section>
  `
}

function renderResultAsTable(result) {
  const sections = [
    buildResultSection("Bases", result.bases || {}),
    buildResultSection("Prestaciones e indemnizaciones", result.accruals || {}),
    buildResultSection("Seguridad social", result.socialSecurity || {}),
    buildResultSection("Retefuente", result.tax || {}),
    buildResultSection("Totales", result.totals || {}),
    buildResultSection("Meta", result.meta || {}),
    buildTextListSection("Trazabilidad", result.trace || []),
    buildTextListSection("Advertencias", result.warnings || []),
  ]

  refs.resultOutput.innerHTML = sections.filter(Boolean).join("")
}

function renderResult(record) {
  currentResultRecord = record
  renderResultAsTable(record.result)
}

function runLiquidation() {
  const employee = getSelectedEmployee()
  if (!employee) {
    showToast("Selecciona un empleado antes de liquidar.", true)
    return
  }

  const annualParameters = getAnnualParameters(Number(getInputValue("annual-year")))
  const request = {
    employee,
    payConcepts: areConceptsEnabled(employee) ? employee.payConcepts : [],
    novelties: employee.novelties,
    annualParameters,
    liquidationDate: getInputValue("liquidation-date"),
    calculateSocialSecurity: getInputChecked("calculate-social-security"),
    calculateWithholdingTax: getInputChecked("calculate-withholding"),
    withholdingProcedure: Number(getInputValue("withholding-procedure") || 1),
    litigationMode: getInputChecked("litigation-mode"),
  }

  const result = liquidateEmployee(request)
  if (!result.ok) {
    showToast(result.errors.join(" | "), true)
    return
  }

  const record = {
    id: makeId(),
    employeeId: employee.id,
    employeeName: employee.name,
    liquidationDate: request.liquidationDate,
    annualYear: annualParameters.year,
    createdAt: new Date().toISOString(),
    result,
  }

  state.liquidations.push(record)
  persist()
  renderLiquidationsTable()
  renderResult(record)
  setActiveTab("liquidation")

  if (result.warnings.length) {
    showToast(result.warnings[0])
  } else {
    showToast("Liquidación calculada y guardada.")
  }
}

function downloadJsonBackup() {
  const content = exportStateAsJSON(state)
  const blob = new Blob([content], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `respaldo_liquidador_${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function importJsonBackup(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      state = importStateFromJSON(reader.result)
      currentResultRecord = null
      refs.resultOutput.textContent = "Respaldo cargado. Selecciona una liquidación del historial para visualizar detalle."
      renderAll()
      showToast("Respaldo importado correctamente.")
    } catch (error) {
      showToast(error.message, true)
    }
  }
  reader.readAsText(file)
}

function getRecordById(recordId) {
  return state.liquidations.find((record) => record.id === recordId)
}

function exportCurrentRecord(type) {
  if (!currentResultRecord) {
    showToast("No hay resultado seleccionado para exportar.", true)
    return
  }

  const list = [currentResultRecord]
  try {
    if (type === "csv") {
      exportLiquidationsToCSV(list, `liquidacion_${currentResultRecord.employeeId}_${currentResultRecord.liquidationDate}.csv`)
    }
    if (type === "xlsx") {
      exportLiquidationsToXLSX(list, `liquidacion_${currentResultRecord.employeeId}_${currentResultRecord.liquidationDate}.xlsx`)
    }
    if (type === "pdf") {
      exportLiquidationsToPDF(list, `liquidacion_${currentResultRecord.employeeId}_${currentResultRecord.liquidationDate}.pdf`)
    }
    showToast("Exportación completada.")
  } catch (error) {
    showToast(error.message, true)
  }
}

function attachEvents() {
  refs.employeeForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const employee = collectEmployeeFormData()
    const annualParameters = getAnnualParameters(Number(getInputValue("annual-year")))
    const validation = validateEmployee(employee, annualParameters)

    if (validation.errors.length) {
      showToast(validation.errors.join(" | "), true)
      return
    }

    upsertEmployee(employee)
    setSelectedEmployee(employee.id)
    persist()
    renderAll()
    setActiveTab("concepts")
    showToast("Empleado guardado correctamente.")
    if (validation.warnings.length) {
      showToast(validation.warnings[0])
    }
  })

  refs.employeeFormReset.addEventListener("click", () => {
    resetEmployeeForm()
    showToast("Formulario de empleado limpiado.")
  })

  refs.employeesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return

    const employeeId = button.dataset.id
    const action = button.dataset.employeeAction
    const employee = findEmployee(employeeId)
    if (!employee) return

    if (action === "select") {
      setSelectedEmployee(employee.id)
      showToast(`Empleado seleccionado: ${employee.name}.`)
      return
    }

    if (action === "edit") {
      setSelectedEmployee(employee.id)
      fillEmployeeForm(employee)
      showToast(`Editando empleado: ${employee.name}.`)
      return
    }

    if (action === "delete") {
      state.employees = state.employees.filter((item) => item.id !== employee.id)
      state.liquidations = state.liquidations.filter((item) => item.employeeId !== employee.id)
      if (state.selectedEmployeeId === employee.id) {
        state.selectedEmployeeId = null
      }
      persist()
      renderAll()
      refs.resultOutput.textContent = "Sin resultados todavía."
      currentResultRecord = null
      showToast("Empleado y liquidaciones asociadas eliminados.")
    }
  })

  refs.conceptForm.addEventListener("submit", (event) => {
    event.preventDefault()
    const employee = getSelectedEmployee()
    if (!employee) {
      showToast("Selecciona un empleado antes de crear conceptos.", true)
      return
    }

    if (!areConceptsEnabled(employee)) {
      showToast("Activa la opción de Comisión/Incapacidad para registrar conceptos.", true)
      return
    }

    const concept = collectConceptFormData()
    const validation = validateConcept(concept)
    if (validation.errors.length) {
      showToast(validation.errors.join(" | "), true)
      return
    }

    const index = employee.payConcepts.findIndex((item) => item.id === concept.id)
    if (index >= 0) {
      employee.payConcepts[index] = concept
    } else {
      employee.payConcepts.push(concept)
    }

    persist()
    renderConceptsTable()
    resetConceptForm()
    setActiveTab("novelties")
    showToast("Concepto guardado.")
  })

  refs.conceptsEnabledToggle.addEventListener("change", (event) => {
    const employee = getSelectedEmployee()
    pendingConceptsToggle = event.target.checked

    if (!employee) {
      syncConceptsOptionalUI()
      return
    }

    employee.hasCommissionOrIncapacityInConcepts = event.target.checked
    if (!employee.hasCommissionOrIncapacityInConcepts) {
      resetConceptForm()
      document.querySelector("#concept-id").value = ""
    }

    persist()
    renderConceptsTable()
    syncConceptsOptionalUI()
  })

  refs.conceptsContinueBtn.addEventListener("click", () => {
    setActiveTab("novelties")
  })

  refs.conceptFormReset.addEventListener("click", () => {
    resetConceptForm()
    showToast("Formulario de concepto limpiado.")
  })

  refs.conceptsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return

    const employee = getSelectedEmployee()
    if (!employee) return

    const concept = employee.payConcepts.find((item) => item.id === button.dataset.id)
    if (!concept) return

    const action = button.dataset.conceptAction
    if (action === "edit") {
      fillConceptForm(concept)
      return
    }

    if (action === "delete") {
      employee.payConcepts = employee.payConcepts.filter((item) => item.id !== concept.id)
      persist()
      renderConceptsTable()
      showToast("Concepto eliminado.")
    }
  })

  refs.noveltyForm.addEventListener("submit", (event) => {
    event.preventDefault()
    const employee = getSelectedEmployee()
    if (!employee) {
      showToast("Selecciona un empleado antes de crear novedades.", true)
      return
    }

    const novelty = collectNoveltyFormData()
    const validation = validateNovelty(novelty)
    if (validation.errors.length) {
      showToast(validation.errors.join(" | "), true)
      return
    }

    const index = employee.novelties.findIndex((item) => item.id === novelty.id)
    if (index >= 0) {
      employee.novelties[index] = novelty
    } else {
      employee.novelties.push(novelty)
    }

    persist()
    renderNoveltiesTable()
    resetNoveltyForm()
    setActiveTab("liquidation")
    showToast("Novedad guardada.")
  })

  refs.noveltyFormReset.addEventListener("click", () => {
    resetNoveltyForm()
    showToast("Formulario de novedad limpiado.")
  })

  refs.noveltiesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return

    const employee = getSelectedEmployee()
    if (!employee) return

    const novelty = employee.novelties.find((item) => item.id === button.dataset.id)
    if (!novelty) return

    const action = button.dataset.noveltyAction
    if (action === "edit") {
      fillNoveltyForm(novelty)
      return
    }

    if (action === "delete") {
      employee.novelties = employee.novelties.filter((item) => item.id !== novelty.id)
      persist()
      renderNoveltiesTable()
      showToast("Novedad eliminada.")
    }
  })

  refs.liquidationForm.addEventListener("submit", (event) => {
    event.preventDefault()
    runLiquidation()
  })

  refs.liquidationsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return

    const record = getRecordById(button.dataset.id)
    if (!record) return

    const action = button.dataset.liquidationAction
    if (action === "view") {
      renderResult(record)
      setActiveTab("history")
      showToast("Liquidación cargada en pantalla.")
      return
    }

    if (action === "delete") {
      state.liquidations = state.liquidations.filter((item) => item.id !== record.id)
      persist()
      renderLiquidationsTable()
      if (currentResultRecord?.id === record.id) {
        currentResultRecord = null
        refs.resultOutput.textContent = "Sin resultados todavía."
      }
      showToast("Liquidación eliminada.")
    }
  })

  refs.exportCsv.addEventListener("click", () => exportCurrentRecord("csv"))
  refs.exportXlsx.addEventListener("click", () => exportCurrentRecord("xlsx"))
  refs.exportPdf.addEventListener("click", () => exportCurrentRecord("pdf"))

  refs.backupJson.addEventListener("click", () => downloadJsonBackup())
  refs.importJson.addEventListener("change", (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    importJsonBackup(file)
    event.target.value = ""
  })
}

function bootstrap() {
  setupTabs()
  fillYearSelect()
  refs.liquidationDate.value = today
  resetEmployeeForm()
  resetConceptForm()
  resetNoveltyForm()
  renderAll()
  attachEvents()
}

bootstrap()
