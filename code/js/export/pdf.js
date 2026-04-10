import { buildLiquidationSections, renderSectionsAsHtml } from "./result-data.js"

function createPrintableNode(records, sourceElement) {
  const html = records
    .map((record) => {
      const sections = buildLiquidationSections(record)
      return `
        <article class="result-export-article">
          ${renderSectionsAsHtml(sections)}
        </article>
      `
    })
    .join("")

  const wrapper = document.createElement("div")
  wrapper.style.position = "fixed"
  wrapper.style.left = "-10000px"
  wrapper.style.top = "0"
  wrapper.style.width = `${Math.max(sourceElement?.offsetWidth || 920, 920)}px`
  wrapper.style.zIndex = "-1"

  wrapper.innerHTML = `
    <div class="result-box result-export-capture" style="max-height:none;overflow:visible;">
      ${html}
    </div>
  `

  document.body.appendChild(wrapper)
  return wrapper
}

export async function exportLiquidationsToPDF(records, fileName = "liquidaciones.pdf", sourceElement = null) {
  const JsPDF = window.jspdf?.jsPDF
  if (!JsPDF) {
    throw new Error("jsPDF no está disponible.")
  }

  if (!window.html2canvas) {
    throw new Error("html2canvas no está disponible.")
  }

  if (!records.length) {
    throw new Error("No hay liquidaciones para exportar a PDF.")
  }

  const captureNode = createPrintableNode(records, sourceElement)
  const captureTarget = captureNode.firstElementChild

  try {
    const canvas = await window.html2canvas(captureTarget, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f8fdf9",
    })

    const doc = new JsPDF({ unit: "pt", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 24

    const imageData = canvas.toDataURL("image/png")
    const renderWidth = pageWidth - margin * 2
    const renderHeight = (canvas.height * renderWidth) / canvas.width

    let heightLeft = renderHeight
    let position = margin

    doc.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight)
    heightLeft -= pageHeight - margin * 2

    while (heightLeft > 0) {
      doc.addPage()
      position = margin - (renderHeight - heightLeft)
      doc.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight)
      heightLeft -= pageHeight - margin * 2
    }

    doc.save(fileName)
  } finally {
    captureNode.remove()
  }
}
