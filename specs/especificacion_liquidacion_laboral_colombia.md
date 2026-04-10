# Especificación técnica para construir una app de liquidación laboral en Colombia

## 1. Propósito

Este documento sirve como base para pedirle a **Claude** o **Codex** que construyan una aplicación que liquide, para uno o varios empleados en Colombia:

- prestaciones sociales;
- vacaciones;
- indemnizaciones por terminación cuando apliquen;
- aportes a seguridad social;
- retención en la fuente laboral, cuando proceda;
- escenarios con salario fijo, salario variable, salario integral y factores salariales adicionales.

El objetivo es que esta especificación reduzca ambigüedades y permita generar código fuente consistente, auditable y mantenible.

---

## 2. Alcance funcional mínimo

La aplicación debe permitir:

1. crear uno o varios empleados;
2. registrar contrato, salario y novedades;
3. clasificar conceptos como **salariales** o **no salariales**;
4. activar o desactivar una casilla para **incluir otros factores salariales** en la base;
5. liquidar:
   - cesantías,
   - intereses a las cesantías,
   - prima de servicios,
   - vacaciones,
   - indemnización por despido sin justa causa,
   - indemnización moratoria, si se usa módulo judicial o de auditoría;
6. calcular seguridad social:
   - salud,
   - pensión,
   - ARL,
   - Fondo de Solidaridad Pensional, si aplica;
7. calcular retención en la fuente laboral como módulo opcional;
8. exportar resultados por empleado y consolidados;
9. dejar trazabilidad de la base usada en cada cálculo.

---

## 3. Advertencias de negocio

### 3.1 La app no debe asumir una sola base salarial para todo
Cada concepto tiene reglas propias:

- **Cesantías**: base del último salario mensual si no varió en los últimos 3 meses; si varió o es salario variable, promedio del último año o del tiempo servido si es menor.
- **Vacaciones**: salario ordinario vigente al inicio del disfrute; excluye horas extra y trabajo en descanso obligatorio; si es variable, promedio del año inmediatamente anterior.
- **Prima**: 30 días de salario por año, pagada en dos cuotas; en práctica operativa y judicial, si el salario es variable se usa promedio del período correspondiente.
- **Indemnización por despido sin justa causa**: en ingreso variable, la base debe tomar lo efectivamente devengado en el último año de servicios remunerados, no simplemente dividir por 12 ciegamente.

### 3.2 No usar el último IBC de PILA como si fuera salario
La app debe advertir que el **IBC reportado** no siempre coincide con el **salario base de liquidación** de prestaciones, especialmente en salarios variables.

### 3.3 El usuario debe poder auditar la clasificación salarial
Un mismo pago puede ser discutido judicialmente. Por eso la app debe guardar:

- nombre del concepto;
- monto;
- clasificación seleccionada;
- fundamento de clasificación;
- usuario que cambió la clasificación;
- fecha del cambio.

---

## 4. Reglas jurídicas que debe reflejar el motor

## 4.1 Qué constituye salario

Se debe considerar salarial, por regla general, todo lo que retribuya directamente el servicio, por ejemplo:

- salario básico;
- comisiones;
- bonificaciones habituales retributivas;
- horas extra;
- recargos;
- trabajo en descanso obligatorio;
- porcentajes sobre ventas.

## 4.2 Qué no constituye salario

Se debe considerar no salarial, por regla general:

- pagos ocasionales por mera liberalidad;
- gastos de representación reales;
- medios de transporte para ejecutar funciones;
- elementos de trabajo;
- beneficios extralegales expresamente pactados como no salariales, siempre que no retribuyan directamente el servicio.

### Regla de oro
Si un pago **en realidad remunera el servicio**, el sistema debe permitir reclasificarlo como salarial, aunque haya sido nombrado “auxilio”, “bono” o “beneficio”.

---

## 5. Casilla para “incluir otros conceptos salariales”

Se recomienda implementar esta funcionalidad con dos niveles:

### 5.1 Nivel global
```ts
includeAdditionalSalaryFactors: boolean
```

### 5.2 Nivel por concepto
```ts
type PayConcept = {
  code: string
  description: string
  amount: number
  isSalary: boolean
  isHabitual?: boolean
  affectsSeveranceBase?: boolean
  affectsBonusBase?: boolean
  affectsVacationBase?: boolean
  affectsSocialSecurityIBC?: boolean
}
```

### Lógica sugerida

Si `includeAdditionalSalaryFactors = false`:
- usar únicamente salario base parametrizado y las reglas mínimas del concepto.

Si `includeAdditionalSalaryFactors = true`:
- sumar a la base los conceptos marcados como salariales y aplicables a cada liquidación.

### Reglas recomendadas por defecto

| Concepto | isSalary por defecto | Observación |
|---|---:|---|
| salario básico | true | siempre |
| comisión | true | usualmente salarial |
| recargo nocturno | true | salarial |
| hora extra | true | salarial |
| dominical/festivo | true | salarial |
| bonificación habitual | true | si remunera servicio |
| bonificación ocasional liberal | false | si no retribuye servicio |
| auxilio de alimentación extralegal | false | revisar pacto y realidad |
| auxilio de rodamiento | false | revisar si compensa gasto real |
| viático accidental | false | no salarial |
| viático permanente para manutención/alojamiento | true | parcialmente salarial |

---

## 6. Fórmulas de liquidación

## 6.1 Días base
Usar año laboral de **360 días** para prestaciones y liquidaciones usuales.

```ts
const LABOR_YEAR_DAYS = 360
const VACATION_FACTOR_DAYS = 720
```

---

## 6.2 Cesantías

### Fórmula
```ts
cesantias = baseCesantias * (diasTrabajados / 360)
```

### Base
```ts
if (salaryFixed && noVariationLast3Months) {
  baseCesantias = lastMonthlySalary
} else {
  baseCesantias = averageEarnedLastYearOrServedTime
}
```

### Nota
Si el diseño del producto decide incorporar el auxilio de transporte en esta base cuando corresponda según reglas vigentes y parametrización interna, esa decisión debe quedar documentada y separada del salario ordinario.

---

## 6.3 Intereses a las cesantías

### Fórmula
```ts
interesesCesantias = cesantias * 0.12 * (diasCausados / 360)
```

### Regla
- pago anual en enero del año siguiente;
- o al retiro si la relación termina antes.

---

## 6.4 Prima de servicios

### Fórmula general
```ts
primaServicios = basePrima * (diasTrabajadosPeriodo / 360)
```

### Regla semestral
- primer pago: hasta el 30 de junio;
- segundo pago: dentro de los primeros 20 días de diciembre.

### Recomendación técnica
Usar cortes:
- semestre 1: 1 enero a 30 junio;
- semestre 2: 1 julio a 31 diciembre.

---

## 6.5 Vacaciones

### Fórmula para liquidación económica proporcional
```ts
vacaciones = baseVacaciones * (diasTrabajados / 720)
```

### Base
```ts
if (salaryVariable) {
  baseVacaciones = averageEarnedPreviousYear
} else {
  baseVacaciones = ordinarySalaryAtStartOfVacation
}
```

### Excluir de la base
- horas extra;
- trabajo en días de descanso obligatorio.

---

## 6.6 Indemnización por despido sin justa causa

## Contrato a término fijo
```ts
indemnizacion = salariosFaltantesHastaFinPlazo
```

## Contrato por obra o labor
```ts
indemnizacion = salariosDelTiempoFaltanteDeLaObra
if (indemnizacion < salarioDiario * 15) {
  indemnizacion = salarioDiario * 15
}
```

## Contrato indefinido

### Si salario < 10 SMLMV
```ts
if (aniosServicio <= 1) {
  indemnizacionDias = 30
} else {
  indemnizacionDias = 30 + ((aniosCompletosAdicionales * 20) + fraccionProporcional)
}
```

### Si salario >= 10 SMLMV
```ts
if (aniosServicio <= 1) {
  indemnizacionDias = 20
} else {
  indemnizacionDias = 20 + ((aniosCompletosAdicionales * 15) + fraccionProporcional)
}
```

### Base para salario variable
No dividir siempre por 12. Debe calcularse con la sumatoria de lo efectivamente devengado en el último año de servicios remunerados, dividida por el tiempo efectivamente prestado en ese mismo término.

---

## 6.7 Indemnización moratoria por no pago al terminar

### Fórmula base
```ts
indemnizacionMoratoria = ultimoSalarioDiario * diasMora
```

### Restricción
- hasta 24 meses en la regla base del CST;
- después, en ciertos escenarios, el efecto cambia a intereses moratorios.

### Recomendación
Implementar este módulo como **opcional** y etiquetarlo como:
```ts
litigationMode: boolean
```
porque su procedencia real depende de análisis judicial de buena o mala fe.

---

## 6.8 Sanción por mora en consignación de cesantías al fondo

```ts
sancionCesantiasFondo = salarioDiario * diasRetardo
```

Aplica cuando el empleador no consigna antes del 15 de febrero del año siguiente.

---

## 7. Salario integral

## Regla de implementación
Si el trabajador está bajo salario integral:

- no liquidar cesantías;
- no liquidar intereses a las cesantías;
- no liquidar prima legal;
- sí liquidar vacaciones;
- sí calcular seguridad social;
- almacenar el factor prestacional pactado.

### Modelo
```ts
type SalaryMode = "ORDINARY" | "INTEGRAL"
```

### Base de seguridad social en salario integral
Usar configuración parametrizable:
```ts
integralSalaryIBCPercent = 0.70
```

---

## 8. Seguridad social

## 8.1 IBC

### Regla funcional
```ts
IBC = totalPagosSalariales + excesoPagosNoSalarialesSobre40 + calculoNovedadesPeriodo
```

### Cálculo del exceso no salarial
```ts
totalRemuneracion = totalPagosSalariales + totalPagosNoSalariales
limiteNoSalarial = totalRemuneracion * 0.40
excesoNoSalarial = max(0, totalPagosNoSalariales - limiteNoSalarial)
IBC = totalPagosSalariales + excesoNoSalarial + novedadesIBC
```

### Regla de topes
```ts
IBC = max(IBC, smlmv)
IBC = min(IBC, smlmv * 25)
```

---

## 8.2 Salud

```ts
saludTotal = IBC * 0.125
saludEmpleado = IBC * 0.04
saludEmpleador = IBC * 0.085
```

---

## 8.3 Pensión

```ts
pensionTotal = IBC * 0.16
pensionEmpleado = IBC * 0.04
pensionEmpleador = IBC * 0.12
```

---

## 8.4 Fondo de Solidaridad Pensional

```ts
fsp = 0

if (IBC >= smlmv * 4) {
  fsp += IBC * 0.01
}

if (IBC >= smlmv * 16 && IBC < smlmv * 17) fsp += IBC * 0.002
if (IBC >= smlmv * 17 && IBC < smlmv * 18) fsp += IBC * 0.004
if (IBC >= smlmv * 18 && IBC < smlmv * 19) fsp += IBC * 0.006
if (IBC >= smlmv * 19 && IBC < smlmv * 20) fsp += IBC * 0.008
if (IBC >= smlmv * 20) fsp += IBC * 0.01
```

---

## 8.5 ARL

### Tabla inicial por clase de riesgo
```ts
const ARL_RATES = {
  1: 0.00522,
  2: 0.01044,
  3: 0.02436,
  4: 0.04350,
  5: 0.06960,
}
```

### Fórmula
```ts
arlEmpleador = IBC * ARL_RATES[riskClass]
```

### Regla
- 100% a cargo del empleador.

---

## 9. Retención en la fuente laboral

## 9.1 Recomendación de producto
Implementar la retefuente como módulo aparte, con bandera:

```ts
calculateWithholdingTax: boolean
withholdingProcedure: 1 | 2
```

## 9.2 Parámetros
```ts
uvtValue: number
deductionsConfig: { ... }
exemptIncomeConfig: { ... }
```

## 9.3 Regla importante
Las **cesantías** y los **intereses sobre cesantías** no deben entrar al cálculo ordinario de retención mensual bajo los procedimientos 1 y 2 como si fueran pagos laborales ordinarios del mes.

## 9.4 Honestidad técnica
Este es el punto más delicado para producción. La retefuente laboral depende de:

- procedimiento 1 o 2;
- ingresos gravables;
- deducciones;
- rentas exentas;
- topes UVT;
- reglas tributarias por vigencia.

Por eso conviene construirla como micro-módulo desacoplado del motor principal de prestaciones.

---

## 10. Parámetros anuales

No quemar valores en el código. Crear una tabla por vigencia.

```ts
type AnnualParameters = {
  year: number
  smlmv: number
  transportAllowance: number
  uvt: number
  nightShiftStartsAt: string
  dayShiftStartsAt: string
  sundayHolidaySurchargePercent: number
  healthEmployeeRate: number
  healthEmployerRate: number
  pensionEmployeeRate: number
  pensionEmployerRate: number
  arlRates: Record<number, number>
  integralSalaryIBCPercent: number
}
```

### Ejemplo
```ts
const params2026: AnnualParameters = {
  year: 2026,
  smlmv: 0, // completar con vigencia aplicable
  transportAllowance: 0, // completar con vigencia aplicable
  uvt: 52374,
  nightShiftStartsAt: "19:00",
  dayShiftStartsAt: "06:00",
  sundayHolidaySurchargePercent: 1.00,
  healthEmployeeRate: 0.04,
  healthEmployerRate: 0.085,
  pensionEmployeeRate: 0.04,
  pensionEmployerRate: 0.12,
  arlRates: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.04350, 5: 0.06960 },
  integralSalaryIBCPercent: 0.70,
}
```

---

## 11. Impacto de la Ley 2466 de 2025 en la app

La reforma debe reflejarse, por lo menos, en estas capas:

### 11.1 Contratación
- contrato indefinido como regla general;
- contrato fijo y de obra o labor con validaciones más estrictas de configuración.

### 11.2 Jornada
- jornada diurna: 06:00 a 19:00;
- jornada nocturna: 19:00 a 06:00.

### 11.3 Recargo por descanso obligatorio
El sistema debe permitir parametrizar la gradualidad:

- desde 1 julio 2025: 80%;
- desde 1 julio 2026: 90%;
- desde 1 julio 2027: 100%.

### Implementación recomendada
```ts
function getSundayHolidaySurchargePercent(date: Date): number {
  if (date >= new Date("2027-07-01")) return 1.00
  if (date >= new Date("2026-07-01")) return 0.90
  if (date >= new Date("2025-07-01")) return 0.80
  return 0.75 // o el valor anterior que se parametrice para vigencias históricas
}
```

---

## 12. Estructura de datos sugerida

```ts
type Employee = {
  id: string
  identification: string
  name: string
  startDate: string
  endDate?: string
  salaryMode: "ORDINARY" | "INTEGRAL"
  contractType: "INDEFINITE" | "FIXED_TERM" | "PROJECT" | "OCCASIONAL"
  baseMonthlySalary: number
  variableSalary: boolean
  transportAllowance: number
  riskClass: 1 | 2 | 3 | 4 | 5
  includeAdditionalSalaryFactors: boolean
  fixedTermEndDate?: string
  projectDescription?: string
}
```

```ts
type PayrollNovelty = {
  code: string
  description: string
  amount: number
  affectsIBC: boolean
  affectsSalaryAverage: boolean
  startDate: string
  endDate: string
}
```

```ts
type LiquidationRequest = {
  employee: Employee
  payConcepts: PayConcept[]
  novelties: PayrollNovelty[]
  annualParameters: AnnualParameters
  liquidationDate: string
  calculateSocialSecurity: boolean
  calculateWithholdingTax: boolean
  litigationMode: boolean
}
```

```ts
type LiquidationResult = {
  bases: {
    severanceBase: number
    severanceInterestBase: number
    serviceBonusBase: number
    vacationBase: number
    dismissalCompensationBase: number
    ibc: number
  }
  accruals: {
    cesantias: number
    interesesCesantias: number
    primaServicios: number
    vacaciones: number
    indemnizacionDespido: number
    indemnizacionMoratoria: number
    sancionCesantiasFondo: number
  }
  socialSecurity: {
    saludEmpleado: number
    saludEmpleador: number
    pensionEmpleado: number
    pensionEmpleador: number
    arlEmpleador: number
    fspEmpleado: number
  }
  tax: {
    retefuente: number
  }
  totals: {
    totalDevengado: number
    totalDeduccionesEmpleado: number
    netoPagar: number
    costoTotalEmpleador: number
  }
  trace: string[]
}
```

---

## 13. Arquitectura sugerida

## Opción simple
- frontend: React / Next.js;
- backend: Node.js + TypeScript;
- base de datos: PostgreSQL;
- ORM: Prisma;
- validación: Zod;
- pruebas: Vitest o Jest.

## Opción más robusta
- frontend: Next.js;
- backend: NestJS;
- motor de cálculo: librería desacoplada en TypeScript;
- base de datos: PostgreSQL;
- colas: BullMQ para procesos masivos;
- auditoría: tabla de eventos o event sourcing liviano.

### Regla de diseño
El motor de liquidación debe ser una librería pura, sin depender de UI ni DB.

```txt
/apps/web
/apps/api
/packages/core-liquidation-engine
/packages/shared-types
/packages/test-fixtures
```

---

## 14. Motor de cálculo en capas

## 14.1 Capa 1: normalización
- validar fechas;
- validar contrato;
- validar vigencia normativa;
- normalizar dinero;
- reclasificar conceptos.

## 14.2 Capa 2: bases
- calcular base de cesantías;
- calcular base de vacaciones;
- calcular base de prima;
- calcular base indemnizatoria;
- calcular IBC.

## 14.3 Capa 3: liquidaciones
- prestaciones;
- indemnizaciones;
- seguridad social;
- retención.

## 14.4 Capa 4: salida
- resumen por empleado;
- resumen masivo;
- auditoría;
- exportación.

---

## 15. Pseudocódigo del motor

```ts
function liquidateEmployee(req: LiquidationRequest): LiquidationResult {
  const normalized = normalizeRequest(req)

  const salaryTotals = calculateSalaryClassificationTotals(
    normalized.payConcepts,
    normalized.employee.includeAdditionalSalaryFactors
  )

  const ibc = calculateIBC({
    totalSalaryPayments: salaryTotals.totalSalaryPayments,
    totalNonSalaryPayments: salaryTotals.totalNonSalaryPayments,
    novelties: normalized.novelties,
    params: normalized.annualParameters,
    salaryMode: normalized.employee.salaryMode,
    baseMonthlySalary: normalized.employee.baseMonthlySalary,
  })

  const bases = calculateBases({
    employee: normalized.employee,
    payConcepts: normalized.payConcepts,
    params: normalized.annualParameters,
    liquidationDate: normalized.liquidationDate,
  })

  const accruals = calculateLaborAccruals({
    employee: normalized.employee,
    bases,
    liquidationDate: normalized.liquidationDate,
    params: normalized.annualParameters,
    litigationMode: normalized.litigationMode,
  })

  const socialSecurity = normalized.calculateSocialSecurity
    ? calculateSocialSecurity({
        ibc,
        riskClass: normalized.employee.riskClass,
        params: normalized.annualParameters,
      })
    : zeroSocialSecurity()

  const tax = normalized.calculateWithholdingTax
    ? calculateWithholding({
        employee: normalized.employee,
        payConcepts: normalized.payConcepts,
        socialSecurity,
        params: normalized.annualParameters,
      })
    : { retefuente: 0 }

  return buildResult({
    bases,
    accruals,
    socialSecurity,
    tax,
    employee: normalized.employee,
  })
}
```

---

## 16. Funciones clave

```ts
function calculateSeveranceBase(...)
function calculateServiceBonusBase(...)
function calculateVacationBase(...)
function calculateDismissalBase(...)
function calculateDaysWorked(...)
function calculateIBC(...)
function calculateSeverance(...)
function calculateSeveranceInterest(...)
function calculateServiceBonus(...)
function calculateVacations(...)
function calculateDismissalCompensation(...)
function calculateMoratoryCompensation(...)
function calculateLateSeveranceFundPenalty(...)
function calculateSocialSecurity(...)
function calculateWithholding(...)
```

---

## 17. Reglas de validación

## 17.1 Contrato fijo
- debe tener fecha final;
- si supera el máximo legal parametrizado, emitir error;
- si hay prórrogas, guardarlas.

## 17.2 Obra o labor
- debe existir descripción clara de la obra;
- si el trabajador continúa tras finalizar la obra sin nueva definición escrita, advertir posible mutación a indefinido.

## 17.3 Salario variable
- si existen comisiones o factores variables, activar modo promedio;
- guardar período exacto usado para promediar.

## 17.4 Salario integral
- exigir confirmación de que supera umbral legal;
- bloquear prima, cesantías e intereses;
- mantener vacaciones activas.

## 17.5 IBC
- no permitir IBC inferior al mínimo legal cuando corresponda;
- no permitir IBC superior al tope;
- advertir si el usuario intenta usar IBC como salario base de prestaciones.

---

## 18. Reglas de redondeo

Definir una política única. Recomendación:

```ts
function roundCOP(value: number): number {
  return Math.round(value)
}
```

Para ARL y otros subsistemas, dejar parametrizable el criterio cuando el operador requiera prescindir de centavos.

---

## 19. Casos de prueba unitarios

## Caso 1: salario fijo ordinario
```ts
{
  salario: 2000000,
  dias: 360,
  baseCesantias: 2000000,
  cesantiasEsperadas: 2000000,
  interesesEsperados: 240000,
  primaEsperada: 2000000,
  vacacionesEsperadas: 1000000
}
```

## Caso 2: salario variable
```ts
{
  promedioUltimoAnio: 2500000,
  dias: 240,
  cesantiasEsperadas: 1666667,
  interesesEsperados: 133333
}
```

## Caso 3: salario integral
```ts
{
  salarioIntegral: 15000000,
  dias: 360,
  cesantiasEsperadas: 0,
  interesesEsperados: 0,
  primaEsperada: 0,
  vacacionesEsperadas: 7500000
}
```

## Caso 4: IBC con exceso no salarial
```ts
{
  totalPagosSalariales: 5000000,
  totalPagosNoSalariales: 4000000,
  totalRemuneracion: 9000000,
  limite40: 3600000,
  excesoNoSalarial: 400000,
  ibcEsperado: 5400000
}
```

## Caso 5: indemnización indefinido menor a 10 SMLMV
```ts
{
  salarioMensual: 3000000,
  tiempoServicioAnios: 3,
  diasIndemnizacionEsperados: 70
}
```

## Caso 6: indemnización indefinido igual o mayor a 10 SMLMV
```ts
{
  salarioMensual: 18000000,
  tiempoServicioAnios: 3,
  diasIndemnizacionEsperados: 50
}
```

---

## 20. Prompt recomendado para Claude o Codex

```txt
Construye una aplicación web full-stack en TypeScript para liquidar prestaciones sociales en Colombia para uno o varios empleados.

Requisitos:
1. Usa Next.js para frontend y Node.js/TypeScript para backend.
2. Crea un motor puro de liquidación desacoplado de la interfaz.
3. Modela contratos indefinidos, fijos, obra o labor y salario integral.
4. Implementa clasificación de conceptos salariales y no salariales.
5. Incluye una casilla global y banderas por concepto para “incluir otros factores salariales”.
6. Calcula cesantías, intereses a las cesantías, prima de servicios, vacaciones, indemnización por despido sin justa causa, seguridad social, ARL, FSP y retefuente opcional.
7. Usa parámetros anuales para SMLMV, UVT, auxilio de transporte, horarios diurno/nocturno y recargos.
8. Implementa pruebas unitarias con los casos entregados.
9. Genera una UI con:
   - formulario de empleado,
   - tabla editable de conceptos,
   - resumen de bases,
   - resultados de liquidación,
   - exportación CSV o Excel.
10. Explica cada archivo creado y cómo ejecutar el proyecto localmente.
```

---

## 21. Cómo ejecutar el programa

## Si Claude o Codex generan un proyecto Node/Next típico

```bash
npm install
npm run dev
```

## Si separan frontend y backend
```bash
# backend
npm install
npm run dev

# frontend
npm install
npm run dev
```

## Pruebas
```bash
npm test
```

## Build
```bash
npm run build
npm run start
```

---

## 22. Qué pedir en la segunda iteración

Después de la primera versión, conviene pedir:

1. soporte multiempresa;
2. soporte de vigencias históricas;
3. exportación PDF;
4. trazabilidad jurídica por cálculo;
5. simulador de demanda de reliquidación;
6. importación masiva por Excel;
7. motor de conceptos parametrizable por convenio o política interna;
8. tablero de auditoría para detectar pagos no salariales riesgosos.

---

## 23. Límites actuales de esta especificación

1. La **retefuente** quedó planteada como módulo opcional porque necesita un desarrollo tributario más profundo para producción.
2. La procedencia real de algunas clasificaciones salariales depende de la realidad del vínculo y de la prueba.
3. La aplicación debe usarse con **parámetros por vigencia**, no con valores fijos.
4. En escenarios litigiosos, la app debe verse como herramienta de apoyo, no como sustituto del análisis jurídico del caso.

---

## 24. Fuentes normativas y jurisprudenciales base para parametrización

### Normas laborales
- Código Sustantivo del Trabajo:
  - art. 127
  - art. 128
  - art. 132
  - art. 160
  - art. 161
  - art. 186
  - art. 192
  - art. 249
  - art. 253
  - art. 306
  - art. 307
  - art. 64
  - art. 65

- Ley 50 de 1990, art. 99
- Decreto 116 de 1976
- Ley 2466 de 2025

### Seguridad social
- Ministerio de Salud y Protección Social:
  - porcentajes de salud y pensión para dependientes;
  - información de Fondo de Solidaridad Pensional.
- Decreto 1772 de 1994
- Ley 1393 de 2010, art. 30
- guías UGPP sobre IBC

### Jurisprudencia y criterio judicial
- CSJ Sala Laboral, SL5146-2020
- CSJ Sala Laboral, SL1659-2025
- Tribunal laboral consultado en el informe base sobre salario variable e improcedencia de equiparar salario con último IBC PILA

---

## 25. Recomendación final de implementación

Orden sugerido:

1. tipos;
2. parámetros anuales;
3. cálculo de días;
4. cálculo de bases;
5. prestaciones;
6. seguridad social;
7. retención opcional;
8. pruebas unitarias;
9. API;
10. frontend.
