// El motor de cifras. Todo lo que lee una persona o la conversación sale de aquí: el modelo no suma.
//
// Funciones puras sobre `Datos` (los carga src/lib/datos.ts desde la base), para poder probarlas.
//
// Las reglas, en palabras:
//   · Una factura se cobra en su fecha de vencimiento (fecha + días de pago del cliente). Si ya venció y no
//     se ha pagado, se espera 10 días después del corte y se marca como vencida.
//   · Lo que se recibe de una factura es su neto: base + IVA − ReteIVA − ReteICA − contribución de obra
//     pública − retención de garantía − amortización del anticipo, con las condiciones de cada cliente.
//     Conconcreto es autorretenedor: los clientes no le retienen en la fuente.
//   · Lo que falta por facturar en un mes depende del escenario:
//       facturado  → nada: solo lo que ya está en SAP.
//       informado  → lo que el proyecto confirmó (la confirmación más reciente con respuesta para ese mes).
//                    Si no ha confirmado, su proyección, marcada como «sin confirmar».
//       proyectado → la proyección trimestral menos lo ya facturado en el mes.
//   · Se factura en la fecha que dijo el proyecto, o el día de radicación de la proyección; nunca antes de hoy.
//   · Los dólares se pasan a pesos con la última TRM.
//   · El disponible a una fecha = saldos de bancos al corte + recaudos esperados hasta esa fecha
//     − pagos programados hasta esa fecha.

import { diaDelMes, iso, lunesDe, mesDe, sumarDias, type Dia } from "./fechas";

export type Escenario = "facturado" | "informado" | "proyectado";
export type MonedaT = "COP" | "USD";

export type ClienteD = {
  id: string; nombre: string; tipo: "publico" | "privado"; moneda: MonedaT;
  ivaPct: number; reteIvaPct: number; reteIcaPorMil: number; contribucionPct: number; garantiaPct: number;
  anticipoPct: number; anticipoSaldo: number; diasPago: number;
};
export type ProyectoD = { id: string; codigo: string; nombre: string; linea: string; moneda: MonedaT; clienteId: string; diaRadicacion: number; activo: boolean };
export type ProyeccionD = { proyectoId: string; mes: Dia; valor: number; fechaRadicacion: Dia | null };
export type ConfirmacionD = {
  proyectoId: string; mes: Dia; semana: Dia; estado: string; facturadoAntes: number; valorPreguntado: number;
  valorInformado: number | null; fechaInformada: Dia | null; explicacion: string | null;
};
export type FacturaD = {
  numero: string; proyectoId: string; clienteId: string; fecha: Dia; mes: Dia; moneda: MonedaT; base: number; iva: number;
  fechaVencimiento: Dia; pagada: boolean; anulada: boolean; texto: string | null;
};
export type SaldoD = { bancoId: string; banco: string; moneda: MonedaT; fecha: Dia; saldo: number };
export type PagoD = { fecha: Dia; beneficiario: string; concepto: string; categoria: string; valor: number; moneda: MonedaT; pagado: boolean };

export type Datos = {
  hoy: Dia;
  clientes: ClienteD[]; proyectos: ProyectoD[]; proyecciones: ProyeccionD[]; confirmaciones: ConfirmacionD[];
  facturas: FacturaD[]; saldos: SaldoD[]; pagos: PagoD[];
  trm: number; trmFecha: Dia | null;
};

const r = Math.round;
const RESPONDIDA = new Set(["confirmada", "ajustada", "no_factura"]);

/* ── Retenciones y neto ────────────────────────────────────────────── */

export type Liquidacion = { base: number; iva: number; reteIva: number; reteIca: number; contribucion: number; garantia: number; anticipo: number; neto: number };

/** El neto de una factura con las condiciones del cliente. `iva` viene de SAP si la factura ya existe. */
export function liquidar(base: number, c: ClienteD, opciones?: { iva?: number; anticipoDisponible?: number }): Liquidacion {
  const iva = opciones?.iva ?? r((base * c.ivaPct) / 100);
  const reteIva = r((iva * c.reteIvaPct) / 100);
  const reteIca = r((base * c.reteIcaPorMil) / 1000);
  const contribucion = r((base * c.contribucionPct) / 100);
  const garantia = r((base * c.garantiaPct) / 100);
  const anticipo = Math.max(0, Math.min(r((base * c.anticipoPct) / 100), opciones?.anticipoDisponible ?? Infinity));
  return { base, iva, reteIva, reteIca, contribucion, garantia, anticipo, neto: base + iva - reteIva - reteIca - contribucion - garantia - anticipo };
}

/* ── Lo básico ─────────────────────────────────────────────────────── */

export const aCop = (valor: number, moneda: MonedaT, trm: number) => (moneda === "USD" ? r(valor * trm) : valor);

/** El corte de la caja: la fecha del último saldo registrado (no después de hoy). */
export function corte(d: Datos): Dia {
  const fechas = d.saldos.map((s) => s.fecha).filter((f) => f <= d.hoy).sort();
  return fechas.at(-1) ?? d.hoy;
}

export function saldosAlCorte(d: Datos) {
  const c = corte(d);
  const porBanco = new Map<string, SaldoD>();
  for (const s of d.saldos) {
    if (s.fecha > c) continue;
    const prev = porBanco.get(s.bancoId);
    if (!prev || s.fecha > prev.fecha) porBanco.set(s.bancoId, s);
  }
  const bancos = [...porBanco.values()].map((s) => ({ banco: s.banco, moneda: s.moneda, fecha: s.fecha, saldo: s.saldo, saldoCop: aCop(s.saldo, s.moneda, d.trm) }));
  return { corte: c, bancos, totalCop: bancos.reduce((a, b) => a + b.saldoCop, 0) };
}

export const facturadoMes = (d: Datos, proyectoId: string, mes: Dia) =>
  d.facturas.filter((f) => f.proyectoId === proyectoId && f.mes === mes && !f.anulada).reduce((a, f) => a + f.base, 0);

/** La confirmación vigente de un proyecto para un mes: la más reciente que tiene respuesta. */
export function informadoVigente(d: Datos, proyectoId: string, mes: Dia) {
  const c = d.confirmaciones
    .filter((x) => x.proyectoId === proyectoId && x.mes === mes && RESPONDIDA.has(x.estado) && x.valorInformado !== null)
    .sort((a, b) => (a.semana < b.semana ? 1 : -1))[0];
  if (!c) return null;
  return { ...c, total: c.facturadoAntes + (c.valorInformado ?? 0) };
}

const proyeccionDe = (d: Datos, proyectoId: string, mes: Dia) => d.proyecciones.find((p) => p.proyectoId === proyectoId && p.mes === mes) ?? null;

/* ── Recaudos esperados ────────────────────────────────────────────── */

export type Recaudo = {
  origen: "factura" | "informado" | "proyectado";
  proyectoId: string; proyecto: string; clienteId: string; cliente: string; moneda: MonedaT;
  factura: string | null; // número de SAP si ya existe
  mesFacturacion: Dia; fechaFactura: Dia; fechaRecaudo: Dia;
  base: number; neto: number; netoCop: number;
  vencida: boolean; sinConfirmar: boolean;
  liquidacion: Liquidacion;
};

/** Todo lo que se espera recibir después del corte, en un escenario. */
export function recaudosEsperados(d: Datos, escenario: Escenario): Recaudo[] {
  const c = corte(d);
  const cli = new Map(d.clientes.map((x) => [x.id, x]));
  const pro = new Map(d.proyectos.map((x) => [x.id, x]));
  const out: Recaudo[] = [];

  // 1 · Lo ya facturado y sin pagar
  for (const f of d.facturas) {
    if (f.pagada || f.anulada) continue;
    const cliente = cli.get(f.clienteId), p = pro.get(f.proyectoId);
    if (!cliente || !p) continue;
    const liq = liquidar(f.base, cliente, { iva: f.iva });
    const vencida = f.fechaVencimiento <= c;
    out.push({
      origen: "factura", proyectoId: p.id, proyecto: p.nombre, clienteId: cliente.id, cliente: cliente.nombre, moneda: f.moneda, factura: f.numero,
      mesFacturacion: f.mes, fechaFactura: f.fecha, fechaRecaudo: vencida ? sumarDias(c, 10) : f.fechaVencimiento,
      base: f.base, neto: liq.neto, netoCop: aCop(liq.neto, f.moneda, d.trm), vencida, sinConfirmar: false, liquidacion: liq,
    });
  }
  if (escenario === "facturado") return ordenar(out);

  // 2 · Lo que falta por facturar, mes a mes, desde el mes en curso
  const mesHoy = mesDe(d.hoy);
  const futuros: Omit<Recaudo, "neto" | "netoCop" | "liquidacion">[] = [];
  for (const p of d.proyectos) {
    if (!p.activo) continue;
    const cliente = cli.get(p.clienteId);
    if (!cliente) continue;
    for (const pr of d.proyecciones.filter((x) => x.proyectoId === p.id && x.mes >= mesHoy)) {
      const facturado = facturadoMes(d, p.id, pr.mes);
      const fechaProy = pr.fechaRadicacion ?? diaDelMes(pr.mes, p.diaRadicacion);
      let pendiente: number, fecha: Dia, origen: Recaudo["origen"] = "proyectado", sinConfirmar = false;
      const inf = escenario === "informado" ? informadoVigente(d, p.id, pr.mes) : null;
      if (inf) {
        pendiente = Math.max(0, inf.total - facturado);
        fecha = inf.fechaInformada ?? fechaProy;
        origen = "informado";
      } else {
        pendiente = Math.max(0, pr.valor - facturado);
        fecha = fechaProy;
        sinConfirmar = escenario === "informado" && pr.mes === mesHoy;
      }
      if (pendiente <= 0) continue;
      const fechaFactura = fecha < d.hoy ? d.hoy : fecha;
      futuros.push({
        origen, proyectoId: p.id, proyecto: p.nombre, clienteId: cliente.id, cliente: cliente.nombre, moneda: p.moneda, factura: null,
        mesFacturacion: pr.mes, fechaFactura, fechaRecaudo: sumarDias(fechaFactura, cliente.diasPago), base: pendiente, vencida: false, sinConfirmar,
      });
    }
  }
  // El anticipo se amortiza en orden, hasta agotar el saldo de cada cliente.
  const saldoAnticipo = new Map(d.clientes.map((x) => [x.id, x.anticipoSaldo]));
  for (const f of futuros.sort((a, b) => (a.fechaFactura < b.fechaFactura ? -1 : 1))) {
    const cliente = cli.get(f.clienteId)!;
    const liq = liquidar(f.base, cliente, { anticipoDisponible: saldoAnticipo.get(cliente.id) ?? 0 });
    saldoAnticipo.set(cliente.id, (saldoAnticipo.get(cliente.id) ?? 0) - liq.anticipo);
    out.push({ ...f, neto: liq.neto, netoCop: aCop(liq.neto, f.moneda, d.trm), liquidacion: liq });
  }
  return ordenar(out);
}

const ordenar = (x: Recaudo[]) => x.sort((a, b) => (a.fechaRecaudo === b.fechaRecaudo ? a.cliente.localeCompare(b.cliente) : a.fechaRecaudo < b.fechaRecaudo ? -1 : 1));

const pagosEntre = (d: Datos, desdeExcl: Dia, hastaIncl: Dia) => d.pagos.filter((p) => !p.pagado && p.fecha > desdeExcl && p.fecha <= hastaIncl);

/* ── Disponible a una fecha ────────────────────────────────────────── */

export function disponibleEn(d: Datos, fecha: Dia, escenario: Escenario) {
  const saldos = saldosAlCorte(d);
  const c = saldos.corte;
  const recaudos = recaudosEsperados(d, escenario).filter((x) => x.fechaRecaudo > c && x.fechaRecaudo <= fecha);
  const pagos = pagosEntre(d, c, fecha);

  const porCliente = agrupar(recaudos, (x) => x.cliente).map(([cliente, items]) => ({
    cliente, totalCop: suma(items, (i) => i.netoCop),
    items: items.map((i) => ({ origen: i.origen, proyecto: i.proyecto, factura: i.factura, fechaFactura: i.fechaFactura, fechaRecaudo: i.fechaRecaudo, moneda: i.moneda, base: i.base, neto: i.neto, netoCop: i.netoCop, vencida: i.vencida, sinConfirmar: i.sinConfirmar })),
  })).sort((a, b) => b.totalCop - a.totalCop);

  const porCategoria = agrupar(pagos, (p) => p.categoria).map(([categoria, items]) => ({ categoria, totalCop: suma(items, (p) => aCop(p.valor, p.moneda, d.trm)), pagos: items.length })).sort((a, b) => b.totalCop - a.totalCop);

  const totalRecaudos = suma(recaudos, (x) => x.netoCop);
  const totalPagos = suma(pagos, (p) => aCop(p.valor, p.moneda, d.trm));
  const sinConfirmar = recaudos.filter((x) => x.sinConfirmar);
  const disponible = saldos.totalCop + totalRecaudos - totalPagos;

  // Lo que falta por recibir después de la fecha (para decir qué queda por fuera)
  const despues = recaudosEsperados(d, escenario).filter((x) => x.fechaRecaudo > fecha && x.mesFacturacion <= mesDe(fecha));

  return {
    fecha, escenario, corte: c, trm: d.trm, trmFecha: d.trmFecha,
    saldoInicial: saldos,
    recaudos: { totalCop: totalRecaudos, porCliente },
    pagos: { totalCop: totalPagos, porCategoria },
    disponible,
    sinConfirmar: {
      totalCop: suma(sinConfirmar, (x) => x.netoCop),
      proyectos: sinConfirmar.map((x) => ({ proyecto: x.proyecto, cliente: x.cliente, base: x.base, moneda: x.moneda, netoCop: x.netoCop, fechaRecaudo: x.fechaRecaudo })),
      disponibleSinEllos: disponible - suma(sinConfirmar, (x) => x.netoCop),
    },
    llegaDespues: despues.map((x) => ({ origen: x.origen, proyecto: x.proyecto, cliente: x.cliente, fechaRecaudo: x.fechaRecaudo, netoCop: x.netoCop })),
  };
}

/* ── Flujo de caja por semana ──────────────────────────────────────── */

export function flujoSemanal(d: Datos, escenario: Escenario, semanas = 12) {
  const c = corte(d);
  const todos = recaudosEsperados(d, escenario);
  let saldo = saldosAlCorte(d).totalCop;
  const filas = [];
  let desde = sumarDias(c, 1);
  for (let i = 0; i < semanas; i++) {
    const lunes = lunesDe(desde);
    const domingo = sumarDias(lunes, 6);
    const rec = todos.filter((x) => x.fechaRecaudo >= desde && x.fechaRecaudo <= domingo);
    const pag = d.pagos.filter((p) => !p.pagado && p.fecha >= desde && p.fecha <= domingo);
    const recaudos = suma(rec, (x) => x.netoCop), pagos = suma(pag, (p) => aCop(p.valor, p.moneda, d.trm));
    const inicial = saldo;
    saldo = inicial + recaudos - pagos;
    filas.push({
      semana: lunes, desde, hasta: domingo, saldoInicial: inicial, recaudos, pagos, saldoFinal: saldo,
      detalleRecaudos: agrupar(rec, (x) => x.cliente).map(([cliente, it]) => ({ cliente, totalCop: suma(it, (x) => x.netoCop), sinConfirmar: it.some((x) => x.sinConfirmar) })),
      detallePagos: pag.map((p) => ({ fecha: p.fecha, concepto: p.concepto, beneficiario: p.beneficiario, valorCop: aCop(p.valor, p.moneda, d.trm) })),
    });
    desde = sumarDias(domingo, 1);
  }
  const minimo = filas.reduce((m, f) => (f.saldoFinal < m.saldoFinal ? f : m), filas[0]);
  return { escenario, corte: c, filas, minimo: minimo ? { semana: minimo.semana, saldoFinal: minimo.saldoFinal } : null };
}

/* ── ¿Qué cliente descuadra el flujo de un mes? ────────────────────── */

/** Recaudos que la proyección trimestral ponía en el mes (el plan) contra lo que hoy se espera según lo
 *  facturado y lo informado. El plan: cada mes de la proyección facturado completo en su fecha, más lo que
 *  ya estaba facturado antes del trimestre. */
export function descuadreMes(d: Datos, mes: Dia) {
  const fin = sumarDias(sumarMesesLocal(mes, 1), -1);
  const cli = new Map(d.clientes.map((x) => [x.id, x]));
  const pro = new Map(d.proyectos.map((x) => [x.id, x]));
  const inicioTrimestre = iniciosTrimestre(d);

  const plan: { clienteId: string; proyectoId: string; netoCop: number; fecha: Dia; detalle: string }[] = [];
  for (const pr of d.proyecciones) {
    const p = pro.get(pr.proyectoId), c = p ? cli.get(p.clienteId) : null;
    if (!p || !c) continue;
    const ff = pr.fechaRadicacion ?? diaDelMes(pr.mes, p.diaRadicacion);
    const fr = sumarDias(ff, c.diasPago);
    if (fr >= mes && fr <= fin) plan.push({ clienteId: c.id, proyectoId: p.id, netoCop: aCop(liquidar(pr.valor, c).neto, p.moneda, d.trm), fecha: fr, detalle: `proyección de ${pr.mes.slice(0, 7)}` });
  }
  for (const f of d.facturas) {
    if (f.anulada || f.fecha >= inicioTrimestre) continue;
    const c = cli.get(f.clienteId);
    if (!c || f.fechaVencimiento < mes || f.fechaVencimiento > fin) continue;
    plan.push({ clienteId: c.id, proyectoId: f.proyectoId, netoCop: aCop(liquidar(f.base, c, { iva: f.iva }).neto, f.moneda, d.trm), fecha: f.fechaVencimiento, detalle: `factura ${f.numero}` });
  }
  const esperado = recaudosEsperados(d, "informado").filter((x) => x.fechaRecaudo >= mes && x.fechaRecaudo <= fin);
  // Lo que ya se cobró dentro del mes también cuenta en lo esperado.
  const cobrado = d.facturas.filter((f) => f.pagada && !f.anulada && f.fechaVencimiento >= mes && f.fechaVencimiento <= fin);

  const filas = d.clientes.map((c) => {
    const pl = suma(plan.filter((x) => x.clienteId === c.id), (x) => x.netoCop);
    const es = suma(esperado.filter((x) => x.clienteId === c.id), (x) => x.netoCop) + suma(cobrado.filter((f) => f.clienteId === c.id), (f) => aCop(liquidar(f.base, c, { iva: f.iva }).neto, f.moneda, d.trm));
    const proyectos = d.proyectos.filter((p) => p.clienteId === c.id).map((p) => {
      const plp = suma(plan.filter((x) => x.proyectoId === p.id), (x) => x.netoCop);
      const esp = suma(esperado.filter((x) => x.proyectoId === p.id), (x) => x.netoCop);
      return { proyecto: p.nombre, planCop: plp, esperadoCop: esp, diferenciaCop: esp - plp };
    }).filter((x) => x.planCop || x.esperadoCop);
    return { cliente: c.nombre, planCop: pl, esperadoCop: es, diferenciaCop: es - pl, proyectos };
  }).filter((f) => f.planCop || f.esperadoCop).sort((a, b) => Math.abs(b.diferenciaCop) - Math.abs(a.diferenciaCop));
  return { mes, planCop: suma(filas, (f) => f.planCop), esperadoCop: suma(filas, (f) => f.esperadoCop), diferenciaCop: suma(filas, (f) => f.diferenciaCop), clientes: filas };
}

function sumarMesesLocal(mes: Dia, n: number): Dia {
  const x = new Date(`${mes}T00:00:00Z`);
  x.setUTCMonth(x.getUTCMonth() + n);
  return iso(x);
}

const iniciosTrimestre = (d: Datos) => d.proyecciones.map((p) => p.mes).sort()[0] ?? mesDe(d.hoy);

/* ── Proyectado vs informado vs real ───────────────────────────────── */

export const UMBRAL = { pct: 5, COP: 50_000_000, USD: 12_000 };

export function umbralDe(informado: number, moneda: MonedaT) {
  return Math.max((Math.abs(informado) * UMBRAL.pct) / 100, UMBRAL[moneda]);
}

export function diferenciasMes(d: Datos, mes: Dia) {
  const cli = new Map(d.clientes.map((x) => [x.id, x]));
  const cerrado = mes < mesDe(d.hoy);
  return d.proyectos.map((p) => {
    const proy = proyeccionDe(d, p.id, mes)?.valor ?? 0;
    const inf = informadoVigente(d, p.id, mes);
    const real = facturadoMes(d, p.id, mes);
    const informado = inf?.total ?? null;
    const difInformado = informado === null ? null : real - informado;
    const requiere = cerrado && difInformado !== null && Math.abs(difInformado) > umbralDe(informado!, p.moneda);
    return {
      proyectoId: p.id, codigo: p.codigo, proyecto: p.nombre, cliente: cli.get(p.clienteId)?.nombre ?? "", moneda: p.moneda,
      proyectado: proy, informado, real, difInformado, difProyectado: real - proy,
      pctInformado: informado ? (real / informado) * 100 : null,
      explicacion: inf?.explicacion ?? null, cerrado, requiereJustificacion: requiere,
    };
  }).filter((x) => x.proyectado || x.informado || x.real);
}

/* ── Utilidades ────────────────────────────────────────────────────── */

export const suma = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

export function agrupar<T>(xs: T[], k: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(k(x), [...(m.get(k(x)) ?? []), x]);
  return [...m.entries()];
}
