// Datos de demostración. NO son de Conconcreto: ni Marcela, ni Luisa, ni Samuel entregaron archivos de este
// proceso. Están armados para ser coherentes entre sí (la proyección, lo informado y lo facturado cuadran
// o se apartan a propósito) y para que las condiciones tributarias se parezcan a las de verdad.
//
// La historia que cuentan, al 8 de noviembre de 2026:
//   · Octubre está cerrado. Once proyectos facturaron lo que informaron (o casi). Doble calzada Vía al Mar
//     facturó $1.120 millones de los $1.850 que confirmó: la interventoría dejó por fuera el pavimento del
//     K12+300 al K14+100 porque los ensayos de densidad no estaban aprobados. Esa diferencia hay que
//     justificarla ante la interventoría.
//   · Noviembre está en curso: la ronda de confirmaciones de la semana del 9 la hace el agente (scripts/e2e.ts).
//   · Las cifras van en pesos (o dólares para Bayside), antes de IVA.

export const M = 1_000_000;

export type ClienteDemo = {
  clave: string; codigoSap: string; nombre: string; nit: string; tipo: "publico" | "privado"; ciudad: string; moneda: "COP" | "USD";
  ivaPct: number; esquemaIva: string; reteIvaPct: number; reteIcaPorMil: number; contribucionPct: number; garantiaPct: number;
  anticipoPct: number; anticipoSaldo: number; diasPago: number; notas: string;
};

const AIU = "AIU: IVA del 19 % sobre la utilidad (5 % del valor)";

export const CLIENTES: ClienteDemo[] = [
  { clave: "C1", codigoSap: "100231", nombre: "Instituto Departamental de Vías", nit: "890.980.112-4", tipo: "publico", ciudad: "Medellín", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 15, reteIcaPorMil: 7, contribucionPct: 5, garantiaPct: 0, anticipoPct: 20, anticipoSaldo: 4_200 * M, diasPago: 60, notas: "Entidad pública. Paga con acta aprobada por la interventoría. Descuenta la contribución de obra pública del 5 %." },
  { clave: "C2", codigoSap: "100418", nombre: "Concesión Autopista del Río S.A.S.", nit: "901.245.338-1", tipo: "privado", ciudad: "Caldas", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 15, reteIcaPorMil: 0, contribucionPct: 0, garantiaPct: 5, anticipoPct: 0, anticipoSaldo: 0, diasPago: 30, notas: "Concesionario 4G. Retiene 5 % de garantía hasta el acta de recibo de cada unidad funcional." },
  { clave: "C3", codigoSap: "100077", nombre: "Empresa Metropolitana de Acueducto E.S.P.", nit: "890.904.996-7", tipo: "publico", ciudad: "Medellín", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 15, reteIcaPorMil: 10, contribucionPct: 5, garantiaPct: 0, anticipoPct: 15, anticipoSaldo: 2_500 * M, diasPago: 20, notas: "Empresa de servicios públicos. Paga rápido una vez aprobada el acta." },
  { clave: "C4", codigoSap: "100902", nombre: "Fiduciaria Andina · P.A. Ciudad del Río", nit: "830.054.076-2", tipo: "privado", ciudad: "Medellín", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 15, reteIcaPorMil: 10, contribucionPct: 0, garantiaPct: 10, anticipoPct: 0, anticipoSaldo: 0, diasPago: 15, notas: "Patrimonio autónomo del proyecto. Retiene 10 % de garantía hasta la entrega de cada torre." },
  { clave: "C5", codigoSap: "101155", nombre: "Inmobiliaria Valle Verde S.A.S.", nit: "901.512.870-9", tipo: "privado", ciudad: "Rionegro", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 0, reteIcaPorMil: 5, contribucionPct: 0, garantiaPct: 5, anticipoPct: 10, anticipoSaldo: 1_100 * M, diasPago: 30, notas: "No es gran contribuyente: no retiene IVA. Corta la facturación el día 30." },
  { clave: "C6", codigoSap: "100664", nombre: "Centro Empresarial Ruta 80 S.A.S.", nit: "900.883.214-5", tipo: "privado", ciudad: "Bogotá", moneda: "COP", ivaPct: 19, esquemaIva: "Precio global: IVA del 19 % sobre la base", reteIvaPct: 15, reteIcaPorMil: 6.9, contribucionPct: 0, garantiaPct: 5, anticipoPct: 0, anticipoSaldo: 0, diasPago: 45, notas: "Contrato a precio global. ReteICA de Bogotá para construcción." },
  { clave: "C7", codigoSap: "100389", nombre: "Clínica Los Andes S.A.", nit: "890.911.625-3", tipo: "privado", ciudad: "Envigado", moneda: "COP", ivaPct: 0.95, esquemaIva: AIU, reteIvaPct: 0, reteIcaPorMil: 7, contribucionPct: 0, garantiaPct: 0, anticipoPct: 25, anticipoSaldo: 3_000 * M, diasPago: 90, notas: "Paga a 90 días. El anticipo se amortiza al 25 % en cada factura." },
  { clave: "C8", codigoSap: "300012", nombre: "Bayside Residences LLC", nit: "EIN 88-4417203", tipo: "privado", ciudad: "Miami", moneda: "USD", ivaPct: 0, esquemaIva: "Sin IVA (Estados Unidos)", reteIvaPct: 0, reteIcaPorMil: 0, contribucionPct: 0, garantiaPct: 10, anticipoPct: 0, anticipoSaldo: 0, diasPago: 15, notas: "Proyecto en Estados Unidos, en dólares. Retainage del 10 % en cada pay application." },
];

export type ProyectoDemo = {
  codigo: string; nombre: string; linea: "infraestructura" | "vivienda" | "edificacion" | "internacional"; ciudad: string; pais: string; moneda: "COP" | "USD";
  cliente: string; director: string; residente: string; valorContrato: number; facturadoAnterior: number; avance: number; inicio: string; fin: string; diaRadicacion: number;
  proyeccion: [number, number, number]; // octubre, noviembre, diciembre
  hitos: { nombre: string; fecha: string; cumplido?: boolean; financiero?: boolean }[];
};

export const PROYECTOS: ProyectoDemo[] = [
  { codigo: "CC-VIA-01", nombre: "Doble calzada Vía al Mar · tramo 2", linea: "infraestructura", ciudad: "Santa Fe de Antioquia", pais: "Colombia", moneda: "COP", cliente: "C1", director: "Ing. Juliana Restrepo", residente: "Andrés Montoya", valorContrato: 86_000 * M, facturadoAnterior: 33_480 * M, avance: 42, inicio: "2025-03-01", fin: "2027-09-30", diaRadicacion: 25, proyeccion: [1_850 * M, 2_300 * M, 1_900 * M],
    hitos: [{ nombre: "Acta de recibo parcial K8–K12", fecha: "2026-09-30", cumplido: true, financiero: true }, { nombre: "Pavimento K12+300 a K14+100 con ensayos aprobados", fecha: "2026-11-20", financiero: true }, { nombre: "Puente peatonal K15 · vaciado de tablero", fecha: "2026-12-12" }] },
  { codigo: "CC-PTE-02", nombre: "Puente vehicular El Hatillo", linea: "infraestructura", ciudad: "Barbosa", pais: "Colombia", moneda: "COP", cliente: "C1", director: "Ing. Juliana Restrepo", residente: "Paula Cárdenas", valorContrato: 38_000 * M, facturadoAnterior: 22_740 * M, avance: 64, inicio: "2025-06-01", fin: "2027-03-31", diaRadicacion: 25, proyeccion: [1_200 * M, 1_250 * M, 1_100 * M],
    hitos: [{ nombre: "Cierre de dovela central", fecha: "2026-10-30", cumplido: true }, { nombre: "Prueba de carga", fecha: "2027-01-22", financiero: true }] },
  { codigo: "CC-VIA-03", nombre: "Autopista del Río · Unidad Funcional 3", linea: "infraestructura", ciudad: "Caldas", pais: "Colombia", moneda: "COP", cliente: "C2", director: "Ing. Mauricio Uribe", residente: "Camilo Rendón", valorContrato: 142_000 * M, facturadoAnterior: 74_520 * M, avance: 56, inicio: "2024-11-01", fin: "2027-12-31", diaRadicacion: 20, proyeccion: [3_400 * M, 3_600 * M, 3_200 * M],
    hitos: [{ nombre: "Túnel corto · cale", fecha: "2026-08-14", cumplido: true }, { nombre: "Entrega de la calzada derecha al concesionario", fecha: "2026-12-18", financiero: true }, { nombre: "Acta de recibo UF3", fecha: "2027-06-30", financiero: true }] },
  { codigo: "CC-VIA-04", nombre: "Autopista del Río · Intersección La Tablaza", linea: "infraestructura", ciudad: "La Estrella", pais: "Colombia", moneda: "COP", cliente: "C2", director: "Ing. Mauricio Uribe", residente: "Natalia Gil", valorContrato: 52_000 * M, facturadoAnterior: 12_990 * M, avance: 29, inicio: "2025-09-01", fin: "2027-08-31", diaRadicacion: 12, proyeccion: [1_700 * M, 1_650 * M, 1_500 * M],
    hitos: [{ nombre: "Pilotaje del intercambiador norte", fecha: "2026-11-06", cumplido: true }, { nombre: "Desvío de tráfico fase 2", fecha: "2026-11-30" }] },
  { codigo: "CC-ACU-05", nombre: "Conducción Aguas Claras · fase 2", linea: "infraestructura", ciudad: "Bello", pais: "Colombia", moneda: "COP", cliente: "C3", director: "Ing. Carolina Mejía", residente: "Esteban Ríos", valorContrato: 64_000 * M, facturadoAnterior: 27_350 * M, avance: 48, inicio: "2025-02-01", fin: "2027-06-30", diaRadicacion: 18, proyeccion: [2_100 * M, 2_250 * M, 2_000 * M],
    hitos: [{ nombre: "Prueba hidrostática tramo 4", fecha: "2026-11-25", financiero: true }, { nombre: "Cruce del río Medellín · hincado", fecha: "2027-02-15" }] },
  { codigo: "CC-ALC-06", nombre: "Colector Sur de aguas residuales", linea: "infraestructura", ciudad: "Itagüí", pais: "Colombia", moneda: "COP", cliente: "C3", director: "Ing. Carolina Mejía", residente: "Luis Fernando Zapata", valorContrato: 31_000 * M, facturadoAnterior: 10_210 * M, avance: 37, inicio: "2025-08-01", fin: "2027-05-31", diaRadicacion: 28, proyeccion: [950 * M, 1_000 * M, 900 * M],
    hitos: [{ nombre: "Licencia ambiental del tramo 3", fecha: "2026-10-31" }, { nombre: "Reinicio del tramo 3", fecha: "2026-12-01" }] },
  { codigo: "CC-VIV-07", nombre: "Ciudad del Río · torres 3 y 4", linea: "vivienda", ciudad: "Medellín", pais: "Colombia", moneda: "COP", cliente: "C4", director: "Arq. Daniela Ochoa", residente: "Sebastián Arango", valorContrato: 48_000 * M, facturadoAnterior: 26_420 * M, avance: 59, inicio: "2025-01-15", fin: "2027-04-30", diaRadicacion: 26, proyeccion: [1_600 * M, 1_750 * M, 1_400 * M],
    hitos: [{ nombre: "Torre 3 · estructura terminada", fecha: "2026-10-15", cumplido: true }, { nombre: "Torre 3 · entrega de zonas comunes", fecha: "2027-01-29", financiero: true }] },
  { codigo: "CC-VIV-08", nombre: "Valle Verde · conjunto Arrayanes", linea: "vivienda", ciudad: "Rionegro", pais: "Colombia", moneda: "COP", cliente: "C5", director: "Arq. Daniela Ochoa", residente: "Manuela Henao", valorContrato: 26_000 * M, facturadoAnterior: 10_430 * M, avance: 45, inicio: "2025-07-01", fin: "2027-07-31", diaRadicacion: 15, proyeccion: [1_100 * M, 1_150 * M, 1_000 * M],
    hitos: [{ nombre: "Apartamento modelo", fecha: "2026-09-20", cumplido: true }, { nombre: "Primera escrituración (bloque 1)", fecha: "2027-03-15", financiero: true }] },
  { codigo: "CC-VIV-09", nombre: "Valle Verde · conjunto Guayacanes", linea: "vivienda", ciudad: "Rionegro", pais: "Colombia", moneda: "COP", cliente: "C5", director: "Arq. Daniela Ochoa", residente: "Jorge Iván Salazar", valorContrato: 19_000 * M, facturadoAnterior: 3_350 * M, avance: 23, inicio: "2026-01-15", fin: "2027-12-15", diaRadicacion: 15, proyeccion: [780 * M, 820 * M, 700 * M],
    hitos: [{ nombre: "Cimentación bloque 2", fecha: "2026-10-30" }, { nombre: "Estructura bloque 1 · piso 5", fecha: "2026-12-10" }] },
  { codigo: "CC-EDI-10", nombre: "Centro Empresarial Ruta 80 · torre B", linea: "edificacion", ciudad: "Bogotá", pais: "Colombia", moneda: "COP", cliente: "C6", director: "Ing. Felipe Cano", residente: "Valentina Duque", valorContrato: 74_000 * M, facturadoAnterior: 33_010 * M, avance: 50, inicio: "2025-04-01", fin: "2027-08-31", diaRadicacion: 24, proyeccion: [2_600 * M, 2_800 * M, 2_500 * M],
    hitos: [{ nombre: "Fachada flotante · inicio de montaje", fecha: "2026-11-16" }, { nombre: "Torre B · estructura terminada", fecha: "2026-12-04", financiero: true }] },
  { codigo: "CC-EDI-11", nombre: "Clínica Los Andes · torre de hospitalización", linea: "edificacion", ciudad: "Envigado", pais: "Colombia", moneda: "COP", cliente: "C7", director: "Ing. Felipe Cano", residente: "Diana Marcela Vélez", valorContrato: 58_000 * M, facturadoAnterior: 16_050 * M, avance: 34, inicio: "2025-10-01", fin: "2027-11-30", diaRadicacion: 23, proyeccion: [1_400 * M, 1_500 * M, 1_300 * M],
    hitos: [{ nombre: "Redes hospitalarias · gases medicinales", fecha: "2026-11-27" }, { nombre: "Estructura piso 8", fecha: "2027-01-15" }] },
  { codigo: "CC-USA-12", nombre: "Bayside Residences · Miami", linea: "internacional", ciudad: "Miami, Florida", pais: "Estados Unidos", moneda: "USD", cliente: "C8", director: "Eng. Ricardo Botero", residente: "Alejandro Mesa", valorContrato: 38_500_000, facturadoAnterior: 5_740_000, avance: 18, inicio: "2026-03-01", fin: "2028-06-30", diaRadicacion: 25, proyeccion: [1_150_000, 1_200_000, 1_250_000],
    hitos: [{ nombre: "Building permit · fase 2", fecha: "2026-10-09", cumplido: true }, { nombre: "Podium slab · level 3", fecha: "2026-12-11", financiero: true }, { nombre: "Draw del lender (construction loan)", fecha: "2027-01-08", financiero: true }] },
];

/** En las pruebas, el residente de todos los proyectos es este buzón. */
export const CORREO_RESIDENTE_PRUEBA = "prueba-jhon-cc@agentmail.to";

/** Lo que cada proyecto informó la semana del 26 de octubre para octubre (total del mes) y la explicación. */
export const INFORMADO_OCTUBRE: Record<string, { total: number; estado: "confirmada" | "ajustada"; explicacion: string; fecha?: string }> = {
  "CC-VIA-01": { total: 1_850 * M, estado: "confirmada", fecha: "2026-10-29", explicacion: "Confirmo $1.850 millones. El acta 14 incluye el pavimento del K12+300 al K14+100, siempre que la interventoría reciba los ensayos de densidad antes del 28." },
  "CC-PTE-02": { total: 1_200 * M, estado: "confirmada", explicacion: "Confirmado, radicamos el 27." },
  "CC-VIA-03": { total: 3_400 * M, estado: "confirmada", explicacion: "Ya está facturado todo octubre en dos actas." },
  "CC-VIA-04": { total: 1_600 * M, estado: "ajustada", fecha: "2026-10-28", explicacion: "Bajamos a $1.600 millones: el pilotaje se corrió una semana por lluvias." },
  "CC-ACU-05": { total: 2_100 * M, estado: "confirmada", explicacion: "Confirmo." },
  "CC-ALC-06": { total: 950 * M, estado: "confirmada", explicacion: "Confirmo, es el acta 9." },
  "CC-VIV-07": { total: 1_600 * M, estado: "confirmada", explicacion: "Confirmo." },
  "CC-VIV-08": { total: 1_100 * M, estado: "confirmada", explicacion: "Facturado el 16." },
  "CC-VIV-09": { total: 780 * M, estado: "confirmada", explicacion: "Facturado el 16." },
  "CC-EDI-10": { total: 2_600 * M, estado: "confirmada", explicacion: "Confirmo $2.600 millones." },
  "CC-EDI-11": { total: 1_400 * M, estado: "confirmada", explicacion: "Ya está radicada." },
  "CC-USA-12": { total: 1_150_000, estado: "confirmada", explicacion: "Pay application #8 submitted." },
};

/** El exporte de SAP: facturas de agosto a noviembre. [número, PEP, fecha, base, texto, pagada (fecha de pago)] */
export const FACTURAS: [string, string, string, number, string, string | null][] = [
  // Antes del trimestre (algunas ya pagadas, otras en cartera)
  ["9000411873", "CC-PTE-02", "2026-08-28", 1_150 * M, "Acta parcial 11 · avance agosto", null], // vencida: la entidad la tiene en trámite
  ["9000411902", "CC-EDI-10", "2026-08-25", 2_450 * M, "Avance de obra agosto · torre B", "2026-10-09"],
  ["9000412110", "CC-VIA-03", "2026-09-18", 3_250 * M, "Acta 31 · avance septiembre", "2026-10-19"],
  ["9000412154", "CC-VIV-07", "2026-09-25", 1_520 * M, "Avance de obra septiembre · torres 3 y 4", "2026-10-10"],
  ["9000412188", "CC-ACU-05", "2026-09-28", 1_980 * M, "Acta 17 · avance septiembre", "2026-10-19"],
  ["9000412201", "CC-VIA-01", "2026-09-26", 1_760 * M, "Acta parcial 13 · avance septiembre", null],
  ["9000412215", "CC-EDI-11", "2026-09-23", 1_380 * M, "Avance de obra septiembre", null],
  ["PA-07-BAYSIDE", "CC-USA-12", "2026-09-25", 1_080_000, "Pay application #7 · September", "2026-10-10"],
  // Octubre
  ["9000412390", "CC-VIA-03", "2026-10-09", 1_600 * M, "Acta 32 · primera quincena de octubre", null],
  ["9000412455", "CC-VIV-08", "2026-10-16", 1_100 * M, "Avance de obra octubre · Arrayanes", null],
  ["9000412456", "CC-VIV-09", "2026-10-16", 760 * M, "Avance de obra octubre · Guayacanes", null],
  ["9000412488", "CC-VIA-03", "2026-10-21", 1_800 * M, "Acta 33 · segunda quincena de octubre", null],
  ["9000412501", "CC-EDI-11", "2026-10-23", 1_400 * M, "Avance de obra octubre", null],
  ["PA-08-BAYSIDE", "CC-USA-12", "2026-10-23", 1_150_000, "Pay application #8 · October", null],
  ["9000412533", "CC-VIV-07", "2026-10-27", 1_600 * M, "Avance de obra octubre · torres 3 y 4", null],
  ["9000412540", "CC-PTE-02", "2026-10-27", 1_200 * M, "Acta parcial 12 · avance octubre", null],
  ["9000412561", "CC-VIA-04", "2026-10-28", 1_580 * M, "Acta 7 · avance octubre", null],
  ["9000412562", "CC-ACU-05", "2026-10-28", 2_065 * M, "Acta 18 · avance octubre", null],
  ["9000412563", "CC-ALC-06", "2026-10-28", 950 * M, "Acta 9 · avance octubre", null],
  ["9000412580", "CC-VIA-01", "2026-10-29", 1_120 * M, "Acta parcial 14 · avance octubre · sin el capítulo de pavimento K12+300 a K14+100 (ensayos de densidad pendientes de aprobación de la interventoría)", null],
  ["9000412597", "CC-EDI-10", "2026-10-29", 2_660 * M, "Avance de obra octubre · torre B", null],
  // Noviembre, hasta hoy
  ["9000412702", "CC-VIA-03", "2026-11-05", 1_800 * M, "Acta 34 · primera quincena de noviembre", null],
];

export const BANCOS = [
  { nombre: "Bancolombia", cuenta: "Corriente ···4471", moneda: "COP" as const, saldo: 14_850 * M },
  { nombre: "Banco de Bogotá", cuenta: "Corriente ···0938", moneda: "COP" as const, saldo: 9_420 * M },
  { nombre: "Davivienda", cuenta: "Corriente ···2215", moneda: "COP" as const, saldo: 6_130 * M },
  { nombre: "BBVA", cuenta: "Corriente ···7802", moneda: "COP" as const, saldo: 4_270 * M },
  { nombre: "City National Bank · Miami", cuenta: "Checking ···5531", moneda: "USD" as const, saldo: 1_640_000 },
];

/** El último saldo registrado es el del viernes 6 de noviembre. */
export const FECHA_ULTIMO_SALDO = "2026-11-06";
export const TRM_FINAL = 3_961.25;

/** [fecha, beneficiario, concepto, categoría, valor, moneda, banco] */
export const PAGOS: [string, string, string, string, number, "COP" | "USD", string][] = [
  ["2026-11-10", "DIAN", "Autorretención en la fuente · octubre", "impuestos", 680 * M, "COP", "Bancolombia"],
  ["2026-11-12", "DIAN", "IVA bimestre septiembre-octubre", "impuestos", 1_450 * M, "COP", "Bancolombia"],
  ["2026-11-13", "Nómina", "Nómina primera quincena de noviembre", "nomina", 2_950 * M, "COP", "Bancolombia"],
  ["2026-11-13", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_400 * M, "COP", "Banco de Bogotá"],
  ["2026-11-20", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_800 * M, "COP", "Banco de Bogotá"],
  ["2026-11-20", "Subcontractors · Bayside", "Pay apps de subcontratistas · noviembre", "proveedores", 820_000, "USD", "City National Bank · Miami"],
  ["2026-11-24", "Municipio de Medellín", "ICA bimestral", "impuestos", 310 * M, "COP", "Davivienda"],
  ["2026-11-26", "Bancolombia", "Crédito de tesorería · cuota", "credito", 1_850 * M, "COP", "Bancolombia"],
  ["2026-11-27", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 4_100 * M, "COP", "Banco de Bogotá"],
  ["2026-11-30", "Nómina", "Nómina segunda quincena de noviembre", "nomina", 3_050 * M, "COP", "Bancolombia"],
  ["2026-12-04", "Operador PILA", "Seguridad social de noviembre", "seguridad_social", 1_150 * M, "COP", "Davivienda"],
  ["2026-12-04", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_600 * M, "COP", "Banco de Bogotá"],
  ["2026-12-09", "Davivienda", "Leasing de equipos · canon", "credito", 420 * M, "COP", "Davivienda"],
  ["2026-12-10", "DIAN", "Autorretención en la fuente · noviembre", "impuestos", 720 * M, "COP", "Bancolombia"],
  ["2026-12-11", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 4_400 * M, "COP", "Banco de Bogotá"],
  ["2026-12-15", "Nómina", "Nómina primera quincena de diciembre", "nomina", 2_950 * M, "COP", "Bancolombia"],
  ["2026-12-18", "Nómina", "Prima de servicios de diciembre", "nomina", 2_700 * M, "COP", "Bancolombia"],
  ["2026-12-18", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_900 * M, "COP", "Banco de Bogotá"],
  ["2026-12-18", "Subcontractors · Bayside", "Pay apps de subcontratistas · diciembre", "proveedores", 900_000, "USD", "City National Bank · Miami"],
  ["2026-12-23", "Proveedores", "Pago a proveedores antes del cierre de año", "proveedores", 3_200 * M, "COP", "Banco de Bogotá"],
  ["2026-12-28", "Bancolombia", "Crédito de tesorería · cuota", "credito", 1_850 * M, "COP", "Bancolombia"],
  ["2026-12-30", "Nómina", "Nómina segunda quincena de diciembre", "nomina", 3_100 * M, "COP", "Bancolombia"],
  ["2027-01-06", "Operador PILA", "Seguridad social de diciembre", "seguridad_social", 1_180 * M, "COP", "Davivienda"],
  ["2027-01-08", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_500 * M, "COP", "Banco de Bogotá"],
  ["2027-01-13", "DIAN", "Autorretención en la fuente · diciembre", "impuestos", 700 * M, "COP", "Bancolombia"],
  ["2027-01-14", "DIAN", "IVA bimestre noviembre-diciembre", "impuestos", 1_380 * M, "COP", "Bancolombia"],
  ["2027-01-15", "Nómina", "Nómina primera quincena de enero", "nomina", 3_000 * M, "COP", "Bancolombia"],
  ["2027-01-15", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_800 * M, "COP", "Banco de Bogotá"],
  ["2027-01-20", "Subcontractors · Bayside", "Pay apps de subcontratistas · enero", "proveedores", 880_000, "USD", "City National Bank · Miami"],
  ["2027-01-22", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_700 * M, "COP", "Banco de Bogotá"],
  ["2027-01-26", "Bancolombia", "Crédito de tesorería · cuota", "credito", 1_850 * M, "COP", "Bancolombia"],
  ["2027-01-29", "Proveedores", "Pago semanal a proveedores y subcontratistas", "proveedores", 3_900 * M, "COP", "Banco de Bogotá"],
  ["2027-01-29", "Nómina", "Nómina segunda quincena de enero", "nomina", 3_050 * M, "COP", "Bancolombia"],
];
