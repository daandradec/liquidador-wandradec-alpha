# Liquidador Laboral Colombia (Vanilla JS)

## Ejecutar local

```bash
cd code
npm run dev
```

App en: `http://localhost:4173`

## Pruebas

```bash
cd code
npm test
```

## Estructura

- `index.html`: interfaz principal (empleados, conceptos, novedades, liquidación, historial).
- `css/styles.css`: estilos responsivos.
- `js/engine/`: motor puro de cálculo (bases, prestaciones, IBC, seguridad social, indemnizaciones, retefuente básica).
- `js/storage/repository.js`: persistencia en `localStorage` + import/export JSON.
- `js/export/`: exportación CSV, Excel (SheetJS CDN), PDF (jsPDF CDN).
- `js/app.js`: orquestación de estado/UI.
- `tests/run-tests.mjs`: casos unitarios principales de la especificación.
