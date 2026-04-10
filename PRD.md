# PRD - Liquidador Laboral Colombia

## 1. Información del documento
- Producto: Liquidador Laboral Colombia
- Tipo: Product Requirements Document (PRD)
- Versión: 1.0
- Fecha: 2026-04-10
- Estado: Vigente para V1 y guía de evolución
- Repositorio: `04. LiquidadorWaandr`

## 2. Resumen ejecutivo
Liquidador Laboral Colombia es una SPA cliente (sin backend en V1) para calcular liquidaciones laborales de empleados en Colombia con trazabilidad técnica y exportación de resultados.  
El producto resuelve la necesidad de profesionales de nómina, RRHH y asesoría laboral de ejecutar cálculos consistentes de prestaciones, indemnizaciones, seguridad social y retefuente opcional, con soporte de auditoría sobre conceptos salariales y no salariales.

## 3. Problema que resuelve
- Los cálculos de liquidación suelen hacerse en hojas de cálculo heterogéneas, con alto riesgo de error manual.
- La clasificación salarial/no salarial de conceptos no siempre queda auditada.
- Es frecuente mezclar bases jurídicas distintas (prestaciones, IBC, indemnizaciones) sin trazabilidad.
- Se requiere una herramienta portable que funcione sin servidor y permita respaldo local.

## 4. Objetivos del producto
### 4.1 Objetivos de negocio
- Reducir errores operativos en cálculos laborales.
- Estandarizar la lógica de liquidación en una herramienta única.
- Facilitar evidencia técnica exportable para procesos internos y externos.

### 4.2 Objetivos de usuario
- Crear y gestionar empleados con datos contractuales completos.
- Liquidar un empleado de punta a punta en un flujo guiado.
- Entender bases, deducciones y totales con trazabilidad legible.
- Exportar resultados en formatos operativos (CSV, Excel, PDF) y respaldar estado (JSON).

### 4.3 Objetivos técnicos
- Mantener motor de cálculo puro y desacoplado de UI/almacenamiento.
- Parametrizar variables anuales legales por vigencia.
- Garantizar persistencia local robusta con control de versión del estado.

## 5. Alcance
### 5.1 Alcance incluido (V1 implementado)
- Gestión de empleados (crear, editar, seleccionar, eliminar).
- Gestión de conceptos de pago por empleado con clasificación salarial auditable.
- Gestión de novedades de nómina por empleado.
- Cálculo de:
- cesantías;
- intereses de cesantías;
- prima de servicios;
- vacaciones;
- indemnización por despido (según tipo de contrato);
- indemnización moratoria (modo litigio);
- sanción por mora en consignación de cesantías (regla implementada por fecha de liquidación).
- Seguridad social opcional:
- salud (empleado y empleador);
- pensión (empleado y empleador);
- ARL (empleador por clase de riesgo);
- FSP (empleado, progresivo).
- ReteFuente opcional básica (procedimiento 1 y 2 simplificado).
- Exportación de resultado actual a CSV, XLSX y PDF.
- Historial local de liquidaciones.
- Respaldo y restauración de estado en JSON.

### 5.2 Fuera de alcance en V1
- Backend, autenticación multiusuario y control de permisos.
- Integraciones con PILA, ERP o sistemas contables externos.
- Firma electrónica, notificación, workflow de aprobación.
- Motor jurídico probatorio completo para litigio (se entrega aproximación técnica).
- Cálculo detallado de recargos por turnos desde marcaciones horarias.

## 6. Usuarios objetivo
- Analista de nómina.
- Jefe de recursos humanos.
- Abogado laboralista (uso de soporte técnico y trazabilidad).
- Consultor externo de cumplimiento laboral.

## 7. Flujos principales de usuario
### 7.1 Flujo de liquidación guiado (tabs)
1. Empleado.
2. Conceptos (opcional mediante toggle de comisión/incapacidad).
3. Novedades.
4. Ejecutar liquidación.
5. Historial y respaldo.

### 7.2 Flujo de exportación
1. Ejecutar o abrir una liquidación del historial.
2. Seleccionar formato (CSV/XLSX/PDF).
3. Descargar archivo generado en cliente.

### 7.3 Flujo de respaldo
1. Exportar respaldo JSON de estado completo.
2. Importar JSON válido versión 1.
3. Recuperar empleados e historial en `localStorage`.

## 8. Requisitos funcionales
### 8.1 Gestión de empleados
- RF-EMP-01: El sistema debe crear/editar empleados con identificación, nombre, fechas, contrato, salario, ARL y banderas de cálculo.
- RF-EMP-02: Debe validar reglas de contrato:
- término fijo exige fecha final contractual;
- obra/labor exige descripción;
- fecha de retiro no puede ser anterior a fecha de inicio.
- RF-EMP-03: Debe advertir si salario integral está por debajo del umbral legal parametrizado (`13 * SMLMV`).

### 8.2 Gestión de conceptos
- RF-CON-01: El sistema debe registrar conceptos con código, descripción, monto y fecha.
- RF-CON-02: Debe soportar clasificación salarial/no salarial y marcadores de impacto por base:
- cesantías, prima, vacaciones, IBC.
- RF-CON-03: Debe registrar trazabilidad de clasificación:
- fundamento;
- usuario auditor;
- timestamp.
- RF-CON-04: La captura de conceptos debe poder desactivarse por empleado.

### 8.3 Gestión de novedades
- RF-NOV-01: Debe registrar novedades con código, descripción, monto y rango de fechas.
- RF-NOV-02: Debe permitir marcar impacto en IBC y en promedios salariales.

### 8.4 Motor de liquidación
- RF-LIQ-01: Debe exponer `liquidateEmployee(request) => result`.
- RF-LIQ-02: Debe validar y normalizar la solicitud antes de calcular.
- RF-LIQ-03: Debe incluir en resultado:
- `bases`;
- `accruals`;
- `socialSecurity`;
- `tax`;
- `totals`;
- `trace`;
- `warnings`;
- `meta`.
- RF-LIQ-04: Debe soportar activación/desactivación de módulos:
- seguridad social;
- retefuente;
- litigio.

### 8.5 Historial y persistencia
- RF-HIS-01: Debe guardar cada liquidación con metadatos de empleado, fecha y resultado.
- RF-HIS-02: Debe permitir ver o eliminar liquidaciones históricas.
- RF-HIS-03: Debe persistir estado versión 1 en `localStorage`.

### 8.6 Exportaciones
- RF-EXP-01: CSV con filas detalladas por sección/campo.
- RF-EXP-02: Excel con hoja `Detalle` y hoja `RawJSON`.
- RF-EXP-03: PDF generado desde captura HTML de secciones del resultado.

## 9. Reglas de negocio y cálculo
### 9.1 Convenciones base
- Año laboral: `360` días.
- Factor vacaciones: `720`.
- Política de redondeo: `Math.round` (COP).

### 9.2 Prestaciones e indemnizaciones
- Cesantías: `baseCesantias * (diasTrabajados / 360)` (excepto salario integral).
- Intereses cesantías: `cesantias * 0.12 * (diasTrabajados / 360)` (excepto salario integral).
- Prima: `basePrima * (diasTrabajados / 360)` (excepto salario integral).
- Vacaciones: `baseVacaciones * (diasTrabajados / 720)`.
- Indemnización por despido:
- fijo: salarios faltantes hasta fin de plazo;
- obra/labor: tiempo faltante estimado, mínimo 15 días;
- indefinido:
- <10 SMLMV: 30 días + 20 por año adicional proporcional;
- >=10 SMLMV: 20 días + 15 por año adicional proporcional.
- Indemnización moratoria: si `litigationMode` y existe retiro; tope técnico de 24 meses con mensaje de trazabilidad para excedentes.
- Sanción cesantías fondo: cálculo técnico por mora posterior al 15 de febrero del año de liquidación (no aplica salario integral).

### 9.3 Salario variable e integral
- Si salario variable está activo, bases se calculan por promedio devengado más novedades que afectan promedio.
- En salario integral:
- cesantías/intereses/prima en cero;
- vacaciones activas;
- IBC con porcentaje parametrizable (`integralSalaryIBCPercent`, default 0.7).

### 9.4 IBC y seguridad social
- IBC = salariales + exceso no salarial sobre 40% + novedades que afectan IBC.
- Piso legal: 1 SMLMV.
- Techo legal: 25 SMLMV.
- Tasas parametrizadas por vigencia:
- salud empleado 4%, empleador 8.5%;
- pensión empleado 4%, empleador 12%;
- ARL según clase de riesgo 1-5;
- FSP desde 4 SMLMV con tramos progresivos.

### 9.5 ReteFuente básica
- Base gravable simplificada: ingreso salarial menos ingresos no constitutivos (salud/pensión/FSP empleado).
- Procedimiento 2 aplica ajuste conservador de 95% a base gravable.
- Conversión UVT y tabla marginal por rangos.
- Cesantías/intereses no se incluyen como renta mensual ordinaria en este módulo.

### 9.6 Parametrización anual
- Vigencias implementadas: 2025, 2026, 2027.
- Incluye: SMLMV, auxilio transporte, UVT, tasas salud/pensión/ARL, porcentaje IBC integral y recargo dominical/festivo escalonado (Ley 2466 de 2025).

## 10. Modelo de datos
### 10.1 Estado persistido
- `version: 1`
- `employees: Employee[]`
- `liquidations: LiquidationRecord[]`
- `selectedEmployeeId: string | null`
- `updatedAt: ISODate`

### 10.2 Entidades clave
- Employee:
- datos personales;
- datos contractuales;
- configuración de liquidación;
- `payConcepts[]`;
- `novelties[]`.
- PayConcept:
- clasificación salarial;
- flags de impacto por base;
- metadatos de auditoría.
- PayrollNovelty:
- monto, rango de fechas, impacto IBC/promedio.
- LiquidationRecord:
- metadata operativa;
- resultado completo del motor.

## 11. Arquitectura del sistema
- Frontend-only SPA.
- UI/estado: `code/js/app.js`.
- Dominio: `code/js/domain`.
- Motor puro: `code/js/engine`.
- Configuración legal anual: `code/js/config/annual-parameters.js`.
- Persistencia local: `code/js/storage/repository.js`.
- Exportaciones: `code/js/export`.
- Presentación de resultados: `buildLiquidationSections` + render HTML seguro.

## 12. Requisitos no funcionales
- RNF-01: Ejecución 100% cliente sin dependencia de servidor para cálculo.
- RNF-02: Determinismo del motor para misma entrada.
- RNF-03: Trazabilidad en `trace` y `warnings` por liquidación.
- RNF-04: Resiliencia en carga de estado corrupto (fallback a estado por defecto).
- RNF-05: Compatibilidad con navegador moderno (ES modules, `localStorage`, `structuredClone`).
- RNF-06: Accesibilidad básica de navegación por tabs con teclado.

## 13. Calidad y pruebas
### 13.1 Cobertura actual implementada
- Caso salario fijo ordinario.
- Caso salario variable.
- Caso salario integral.
- Caso IBC con exceso no salarial.
- Indemnización indefinido (<10 y >=10 SMLMV).
- Indemnización desactivada.

### 13.2 Resultado actual de pruebas (2026-04-10)
- `cd code && npm test` exitoso (7/7 casos).

### 13.3 Pruebas recomendadas siguientes
- Contrato fijo con fecha final contractual y salarios faltantes.
- Contrato obra/labor con y sin fecha estimada de finalización.
- Modo litigio con mora >24 meses.
- Validación de importación JSON inválida y versionamiento.
- Exportaciones con caracteres especiales y dataset grande.

## 14. KPIs de producto
- Tasa de liquidaciones completadas sin error de validación.
- Tiempo promedio de liquidación por empleado.
- Porcentaje de registros con trazabilidad completa de conceptos.
- Frecuencia de uso de exportaciones por formato.
- Tasa de restauración exitosa desde respaldo JSON.

## 15. Riesgos y mitigaciones
- Riesgo jurídico: interpretación normativa incompleta para casos especiales.
- Mitigación: mantener advertencia legal visible y parametrización versionada por vigencia.
- Riesgo de datos locales: pérdida por limpieza de navegador/dispositivo.
- Mitigación: promover respaldo JSON periódico.
- Riesgo de dependencia CDN (XLSX/jsPDF/html2canvas).
- Mitigación: manejo de error explícito y estrategia futura de empaquetado local.
- Riesgo de alcance funcional: ausencia de backend y multiusuario.
- Mitigación: definir V2 con API, autenticación y auditoría central.

## 16. Roadmap propuesto
### Fase 1 (endurecimiento V1)
- Expandir suite de pruebas unitarias y escenarios borde.
- Mejorar mensajes de trazabilidad jurídica por cálculo.
- Validaciones adicionales de consistencia contractual.

### Fase 2 (V1.5 operativa)
- Indicadores y tableros de uso local.
- Plantillas de exporte por audiencia (RRHH, legal, auditoría).
- Mejoras UX para carga masiva y filtrado de historial.

### Fase 3 (V2 plataforma)
- Backend con identidad, roles y auditoría centralizada.
- API para integración con sistemas de nómina.
- Parametrización legal administrable y versionada en servidor.

## 17. Criterios de aceptación globales
- CA-01: El usuario puede liquidar un empleado completo desde UI sin editar código.
- CA-02: El resultado muestra bases, prestaciones, deducciones, totales y trazabilidad.
- CA-03: El resultado puede exportarse al menos a un formato estructurado y uno visual.
- CA-04: El estado puede respaldarse e importarse manteniendo empleados e historial.
- CA-05: El motor supera el conjunto mínimo de pruebas automatizadas definidas para V1.

## 18. Comandos operativos de referencia
- Desarrollo con live reload: `cd code && npm run dev`
- Servidor estático app: `cd code && npm start`
- Servidor estático desde raíz: `npm start`
- Pruebas unitarias: `cd code && npm test`
