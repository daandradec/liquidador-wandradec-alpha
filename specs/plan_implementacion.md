## Plan de Implementación V1: Liquidador Laboral Colombia (HTML/CSS/JS)

### Resumen
- Construir una SPA vanilla en `./code` con `HTML + CSS + JavaScript` (módulos ES), sin backend.
- Implementar motor puro de liquidación desacoplado de UI y almacenamiento.
- Cubrir v1 con: prestaciones, seguridad social, trazabilidad, retefuente opcional básica.
- Persistir datos en `localStorage` y soportar respaldo/restauración en JSON.
- Exportar resultados en `CSV + Excel + PDF` usando librerías vía CDN.

### Cambios de Implementación
- Estructura objetivo:
  - `code/index.html`
  - `code/css/styles.css`
  - `code/js/app.js`
  - `code/js/domain/`
  - `code/js/config/annual-parameters.js`
  - `code/js/engine/`
  - `code/js/storage/repository.js`
  - `code/js/export/`
  - `code/js/ui/`
- API principal interna:
  - `liquidateEmployee(request) => result`.
- Reglas funcionales:
  - Año laboral 360 días y vacaciones con factor 720.
  - Soporte salario ordinario/integral.
  - Clasificación salarial/no salarial auditable.
  - IBC con exceso no salarial (40%), piso y techo legal.
  - Indemnización por tipo de contrato.
- Persistencia y exportación:
  - `localStorage`, respaldo/restauración JSON.
  - Exportación CSV, Excel y PDF.

### Casos de Prueba
- Salario fijo ordinario.
- Salario variable.
- Salario integral.
- IBC con exceso no salarial.
- Indemnización indefinido (<10 y >=10 SMLMV).

### Supuestos
- Sin backend en v1.
- Librerías externas vía CDN para Excel/PDF.
- ReteFuente en nivel opcional básico.
