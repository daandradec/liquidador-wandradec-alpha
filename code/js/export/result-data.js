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

function serializeRawValue(value) {
  if (value == null) return ""
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
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

function buildTableSection(title, data) {
  const rows = flattenObjectEntries(data).map(([keyPath, valueRaw]) => ({
    keyPath,
    keyLabel: humanizeKey(keyPath),
    valueRaw,
    valueLabel: formatResultValue(valueRaw),
  }))

  return {
    title,
    kind: "table",
    rows,
  }
}

function buildListSection(title, items) {
  const normalizedItems = (items || []).map((item) => ({
    itemRaw: item,
    itemLabel: formatResultValue(item),
  }))

  return {
    title,
    kind: "list",
    items: normalizedItems,
  }
}

export function buildLiquidationSections(record) {
  const result = record?.result || {}

  const recordMeta = {
    id: record?.id,
    empleadoId: record?.employeeId,
    empleadoNombre: record?.employeeName,
    fechaLiquidacion: record?.liquidationDate,
    vigencia: record?.annualYear,
    creadoEn: record?.createdAt,
  }

  const sections = [
    buildTableSection("Registro de liquidación", recordMeta),
    buildTableSection("Bases", result.bases || {}),
    buildTableSection("Prestaciones e indemnizaciones", result.accruals || {}),
    buildTableSection("Seguridad social", result.socialSecurity || {}),
    buildTableSection("Retefuente", result.tax || {}),
    buildTableSection("Totales", result.totals || {}),
    buildTableSection("Meta", result.meta || {}),
    buildListSection("Trazabilidad", result.trace || []),
    buildListSection("Advertencias", result.warnings || []),
  ]

  return sections.filter((section) => {
    if (section.kind === "table") return section.rows.length > 0
    return section.items.length > 0
  })
}

export function renderSectionsAsHtml(sections) {
  return sections
    .map((section) => {
      if (section.kind === "table") {
        const tableRowsHtml = section.rows
          .map((row) => {
            return `<tr><th>${escapeHtml(row.keyLabel)}</th><td>${escapeHtml(row.valueLabel)}</td></tr>`
          })
          .join("")

        return `
          <section class="result-section">
            <h3 class="result-section-title">${escapeHtml(section.title)}</h3>
            <table class="result-table">
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </section>
        `
      }

      const listItemsHtml = section.items.map((item) => `<li>${escapeHtml(item.itemLabel)}</li>`).join("")
      return `
        <section class="result-section">
          <h3 class="result-section-title">${escapeHtml(section.title)}</h3>
          <ul class="result-list">${listItemsHtml}</ul>
        </section>
      `
    })
    .join("")
}

export function buildDetailedExportRows(record) {
  const sections = buildLiquidationSections(record)

  const baseMeta = {
    registroId: record?.id || "",
    empleadoId: record?.employeeId || "",
    empleadoNombre: record?.employeeName || "",
    fechaLiquidacion: record?.liquidationDate || "",
    vigencia: record?.annualYear || "",
  }

  const rows = []

  sections.forEach((section) => {
    if (section.kind === "table") {
      section.rows.forEach((row) => {
        rows.push({
          ...baseMeta,
          seccion: section.title,
          tipoDato: "campo",
          clave: row.keyLabel,
          claveRuta: row.keyPath,
          valor: row.valueLabel,
          valorRaw: serializeRawValue(row.valueRaw),
        })
      })
      return
    }

    section.items.forEach((item, index) => {
      rows.push({
        ...baseMeta,
        seccion: section.title,
        tipoDato: "lista",
        clave: `Item ${index + 1}`,
        claveRuta: `${section.title} / ${index + 1}`,
        valor: item.itemLabel,
        valorRaw: serializeRawValue(item.itemRaw),
      })
    })
  })

  return rows
}

export function buildRawJsonForRecord(record) {
  return JSON.stringify(record, null, 2)
}
