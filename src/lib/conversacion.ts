// Conversarle a los datos. Claude NO calcula: llama estas herramientas, que leen la base y hacen las cuentas
// con src/lib/finanzas.ts, y redacta citando las cifras que le devolvieron (ya formateadas).
// Al final, el código revisa que cada cifra de la respuesta haya salido de alguna herramienta.

import { db } from "./db";
import { conversarConHerramientas, type Herramienta, type LlamadaHerramienta } from "./claude";
import { leerDatos } from "./datos";
import { descuadreMes, disponibleEn, diferenciasMes, flujoSemanal, liquidar, saldosAlCorte, recaudosEsperados, aCop, type Datos, type Escenario } from "./finanzas";
import { cop, monto, pct } from "./formato";
import { diaLargo, hoyBogota, iso, mesDe, nombreMesAnio, semanaDeRonda, type Dia } from "./fechas";
import { cifrasDe, cifrasNoAutorizadas } from "./justificaciones";
import { CATEGORIA_PAGO, ESTADO_CONFIRMACION, LINEA } from "./etiquetas";

const ESC = { type: "string", enum: ["informado", "proyectado", "facturado"], description: "informado: lo facturado más lo que confirmaron los proyectos (si un proyecto no ha confirmado, su proyección, marcada). proyectado: según la proyección trimestral. facturado: solo lo que ya está en SAP." };
const FECHA = { type: "string", description: "AAAA-MM-DD" };
const MES = { type: "string", description: "AAAA-MM" };

export const HERRAMIENTAS: Herramienta[] = [
  { name: "disponible_en_fecha", description: "Cuánta caja habrá disponible en una fecha: saldos de bancos al corte + recaudos esperados hasta esa fecha − pagos programados hasta esa fecha. Trae el detalle por cliente y por tipo de pago, y lo que depende de proyectos que no han confirmado.", input_schema: { type: "object", required: ["fecha", "escenario"], properties: { fecha: FECHA, escenario: ESC } } },
  { name: "flujo_de_caja_semanal", description: "El flujo de caja proyectado por semana desde el corte: saldo inicial, recaudos, pagos y saldo final de cada semana, y la semana más apretada.", input_schema: { type: "object", required: ["escenario", "semanas"], properties: { escenario: ESC, semanas: { type: "integer", minimum: 1, maximum: 16 } } } },
  { name: "descuadre_del_mes", description: "Qué clientes descuadran el flujo de caja de un mes: lo que la proyección trimestral ponía como recaudo en ese mes contra lo que hoy se espera (lo facturado y lo informado), por cliente y proyecto.", input_schema: { type: "object", required: ["mes"], properties: { mes: MES } } },
  { name: "diferencias_de_facturacion", description: "Por proyecto, en un mes: lo proyectado, lo informado por el proyecto y lo facturado en SAP, con sus diferencias, si requiere justificación ante la interventoría y en qué estado está esa justificación.", input_schema: { type: "object", required: ["mes"], properties: { mes: MES } } },
  { name: "confirmaciones_de_la_semana", description: "La ronda semanal de confirmaciones con los proyectos: quién confirmó, quién ajustó, quién no factura, quién no ha contestado y a quién se le recordó. Sin semana, la de esta semana.", input_schema: { type: "object", required: ["semana"], properties: { semana: { type: ["string", "null"], description: "El lunes de la semana, AAAA-MM-DD, o null para la actual" } } } },
  { name: "saldos_bancarios", description: "El disponible por banco al último corte registrado, con la cuenta en dólares convertida a pesos con la TRM.", input_schema: { type: "object", properties: {} } },
  { name: "pagos_programados", description: "Los pagos programados entre dos fechas (nómina, proveedores, impuestos, créditos…), con su total.", input_schema: { type: "object", required: ["desde", "hasta"], properties: { desde: FECHA, hasta: FECHA } } },
  { name: "cartera_pendiente", description: "Las facturas radicadas que no se han pagado, con su neto a recibir, su vencimiento y si ya están vencidas. Se puede filtrar por el nombre de un cliente.", input_schema: { type: "object", required: ["cliente"], properties: { cliente: { type: ["string", "null"] } } } },
  { name: "proyectos", description: "Los proyectos con su cliente, línea de negocio, moneda, valor del contrato, avance físico, lo facturado acumulado y sus próximos hitos.", input_schema: { type: "object", required: ["linea"], properties: { linea: { type: ["string", "null"], enum: ["infraestructura", "vivienda", "edificacion", "internacional", null] } } } },
  { name: "condiciones_de_clientes", description: "Las condiciones tributarias y de pago de cada cliente: esquema de IVA, ReteIVA, ReteICA, contribución de obra pública, retención de garantía, anticipo y días de pago.", input_schema: { type: "object", properties: {} } },
];

const fmtFecha = (d: Dia) => diaLargo(d) + (d.slice(0, 4) !== hoyBogota().slice(0, 4) ? ` de ${d.slice(0, 4)}` : "");

async function ejecutar(d: Datos, nombre: string, e: Record<string, unknown>): Promise<unknown> {
  const esc = (String(e.escenario ?? "informado") as Escenario);
  switch (nombre) {
    case "disponible_en_fecha": {
      const fecha = String(e.fecha);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("La fecha va como AAAA-MM-DD.");
      const x = disponibleEn(d, fecha, esc);
      return {
        fecha: fmtFecha(fecha), escenario: esc, corte_de_saldos: fmtFecha(x.corte), trm: x.trm.toLocaleString("es-CO"),
        saldo_inicial: cop(x.saldoInicial.totalCop),
        recaudos_esperados: cop(x.recaudos.totalCop),
        pagos_programados: cop(x.pagos.totalCop),
        disponible: cop(x.disponible),
        recaudos_por_cliente: x.recaudos.porCliente.map((c) => ({
          cliente: c.cliente, total: cop(c.totalCop),
          detalle: c.items.map((i) => ({ de_donde_sale: i.origen === "factura" ? `factura ${i.factura}` : i.origen === "informado" ? "lo que confirmó el proyecto" : "la proyección (sin confirmar)", proyecto: i.proyecto, se_recibe: fmtFecha(i.fechaRecaudo), neto: cop(i.netoCop), ...(i.moneda === "USD" ? { neto_en_dolares: monto(i.neto, "USD") } : {}), ...(i.vencida ? { vencida: true } : {}) })),
        })),
        pagos_por_tipo: x.pagos.porCategoria.map((p) => ({ tipo: CATEGORIA_PAGO[p.categoria] ?? p.categoria, total: cop(p.totalCop), pagos: p.pagos })),
        sin_confirmar: x.sinConfirmar.proyectos.length ? { total: cop(x.sinConfirmar.totalCop), disponible_sin_ellos: cop(x.sinConfirmar.disponibleSinEllos), proyectos: x.sinConfirmar.proyectos.map((p) => ({ proyecto: p.proyecto, cliente: p.cliente, neto: cop(p.netoCop), se_recibe: fmtFecha(p.fechaRecaudo) })) } : null,
        facturado_este_mes_que_llega_despues: x.llegaDespues.filter((l) => l.origen !== "factura").map((l) => ({ proyecto: l.proyecto, cliente: l.cliente, se_recibe: fmtFecha(l.fechaRecaudo), neto: cop(l.netoCop) })),
      };
    }
    case "flujo_de_caja_semanal": {
      const f = flujoSemanal(d, esc, Math.min(16, Math.max(1, Number(e.semanas ?? 8))));
      return {
        escenario: esc, corte: fmtFecha(f.corte),
        semanas: f.filas.map((w) => ({ semana: `${fmtFecha(w.desde)} al ${fmtFecha(w.hasta)}`, saldo_inicial: cop(w.saldoInicial), recaudos: cop(w.recaudos), pagos: cop(w.pagos), saldo_final: cop(w.saldoFinal), recaudos_por_cliente: w.detalleRecaudos.map((r) => ({ cliente: r.cliente, total: cop(r.totalCop), ...(r.sinConfirmar ? { incluye_sin_confirmar: true } : {}) })) })),
        semana_mas_apretada: f.minimo ? { semana: fmtFecha(f.minimo.semana), saldo_final: cop(f.minimo.saldoFinal) } : null,
      };
    }
    case "descuadre_del_mes": {
      const mes = `${String(e.mes).slice(0, 7)}-01`;
      const x = descuadreMes(d, mes);
      return {
        mes: nombreMesAnio(mes), recaudos_segun_la_proyeccion: cop(x.planCop), recaudos_esperados_hoy: cop(x.esperadoCop), diferencia_total: cop(x.diferenciaCop),
        clientes: x.clientes.map((c) => ({ cliente: c.cliente, segun_la_proyeccion: cop(c.planCop), esperado_hoy: cop(c.esperadoCop), diferencia: cop(c.diferenciaCop), proyectos: c.proyectos.filter((p) => p.diferenciaCop).map((p) => ({ proyecto: p.proyecto, segun_la_proyeccion: cop(p.planCop), esperado_hoy: cop(p.esperadoCop), diferencia: cop(p.diferenciaCop) })) })),
        como_se_lee: "Diferencia negativa: ese mes entra menos plata de la que la proyección ponía. Sale de lo facturado distinto a lo proyectado, de lo que confirmaron los proyectos y de fechas que se movieron.",
      };
    }
    case "diferencias_de_facturacion": {
      const mes = `${String(e.mes).slice(0, 7)}-01`;
      const js = await db.justificacion.findMany({ where: { mes: new Date(`${mes}T00:00:00Z`) } });
      return {
        mes: nombreMesAnio(mes), cerrado: mes < mesDe(d.hoy),
        proyectos: diferenciasMes(d, mes).map((r) => {
          const j = js.find((x) => x.proyectoId === r.proyectoId);
          return {
            proyecto: r.proyecto, cliente: r.cliente, proyectado: monto(r.proyectado, r.moneda), informado: r.informado === null ? "no ha informado" : monto(r.informado, r.moneda), facturado: monto(r.real, r.moneda),
            diferencia_contra_informado: r.difInformado === null ? null : monto(r.difInformado, r.moneda), porcentaje_facturado_de_lo_informado: pct(r.pctInformado, 1),
            requiere_justificacion: r.requiereJustificacion, justificacion: j ? { aprobada: j.estado === "aprobada" ? "sí" : "no", estado: j.estado } : null,
            lo_que_dijo_el_residente: r.explicacion,
          };
        }),
      };
    }
    case "confirmaciones_de_la_semana": {
      const semana = e.semana && /^\d{4}-\d{2}-\d{2}$/.test(String(e.semana)) ? String(e.semana) : semanaDeRonda(d.hoy);
      const cs = await db.confirmacion.findMany({ where: { semana: new Date(`${semana}T00:00:00Z`) }, include: { proyecto: true } });
      const activos = d.proyectos.filter((p) => p.activo).length;
      const respondieron = cs.filter((c) => ["confirmada", "ajustada", "no_factura"].includes(c.estado));
      return {
        semana: `del ${fmtFecha(semana)}`, proyectos_activos: activos, preguntados: cs.filter((c) => c.estado !== "borrador").length, ya_confirmaron: respondieron.length,
        proyectos: cs.map((c) => ({ proyecto: c.proyecto.nombre, residente: c.proyecto.residenteNombre, estado: ESTADO_CONFIRMACION[c.estado].etiqueta, preguntado: monto(Number(c.valorPreguntado), c.proyecto.moneda), informado: c.valorInformado === null ? null : monto(Number(c.valorInformado), c.proyecto.moneda), fecha_informada: c.fechaInformada ? fmtFecha(iso(c.fechaInformada)) : null, explicacion: c.explicacion, recordatorios: c.recordatorios })),
        sin_pregunta_esta_semana: d.proyectos.filter((p) => p.activo && !cs.some((c) => c.proyectoId === p.id)).map((p) => p.nombre),
      };
    }
    case "saldos_bancarios": {
      const s = saldosAlCorte(d);
      return { corte: fmtFecha(s.corte), trm: d.trm.toLocaleString("es-CO"), total: cop(s.totalCop), bancos: s.bancos.map((b) => ({ banco: b.banco, saldo: monto(b.saldo, b.moneda), ...(b.moneda === "USD" ? { en_pesos: cop(b.saldoCop) } : {}) })) };
    }
    case "pagos_programados": {
      const desde = String(e.desde), hasta = String(e.hasta);
      const ps = d.pagos.filter((p) => !p.pagado && p.fecha >= desde && p.fecha <= hasta).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      return { desde: fmtFecha(desde), hasta: fmtFecha(hasta), total: cop(ps.reduce((a, p) => a + aCop(p.valor, p.moneda, d.trm), 0)), pagos: ps.map((p) => ({ fecha: fmtFecha(p.fecha), concepto: p.concepto, beneficiario: p.beneficiario, tipo: CATEGORIA_PAGO[p.categoria] ?? p.categoria, valor: monto(p.valor, p.moneda), ...(p.moneda === "USD" ? { en_pesos: cop(aCop(p.valor, p.moneda, d.trm)) } : {}) })) };
    }
    case "cartera_pendiente": {
      const filtro = e.cliente ? String(e.cliente).toLowerCase() : null;
      const rs = recaudosEsperados(d, "facturado").filter((r) => !filtro || r.cliente.toLowerCase().includes(filtro));
      const fs = new Map(d.facturas.map((f) => [f.numero, f]));
      return {
        total_neto_por_recibir: cop(rs.reduce((a, r) => a + r.netoCop, 0)), vencidas: rs.filter((r) => r.vencida).length,
        facturas: rs.map((r) => ({ factura: r.factura, cliente: r.cliente, proyecto: r.proyecto, fecha: fmtFecha(r.fechaFactura), vence: fmtFecha(fs.get(r.factura!)!.fechaVencimiento), vencida: r.vencida, valor_antes_de_iva: monto(r.base, r.moneda), neto_a_recibir: monto(r.neto, r.moneda) })),
      };
    }
    case "proyectos": {
      const ps = await db.proyecto.findMany({ where: e.linea ? { linea: e.linea as never } : {}, include: { cliente: true, hitos: { orderBy: { fecha: "asc" } }, facturas: { where: { anulada: false } } }, orderBy: { codigo: "asc" } });
      return ps.map((p) => {
        const facturado = Number(p.facturadoAnterior) + p.facturas.reduce((a, f) => a + Number(f.base), 0);
        return {
          proyecto: p.nombre, codigo: p.codigo, linea: LINEA[p.linea], cliente: p.cliente.nombre, ciudad: `${p.ciudad}, ${p.pais}`, moneda: p.moneda,
          valor_contrato: monto(Number(p.valorContrato), p.moneda), avance_fisico: pct(p.avance), facturado_acumulado: monto(facturado, p.moneda), porcentaje_facturado: pct((facturado / Number(p.valorContrato)) * 100),
          proximos_hitos: p.hitos.filter((h) => !h.cumplido).map((h) => ({ hito: h.nombre, fecha: fmtFecha(iso(h.fecha)), atrasado: iso(h.fecha) < d.hoy })),
        };
      });
    }
    case "condiciones_de_clientes":
      return d.clientes.map((c) => {
        const l = liquidar(1_000_000_000, c);
        return { cliente: c.nombre, tipo: c.tipo === "publico" ? "público" : "privado", moneda: c.moneda, iva: `${c.ivaPct.toLocaleString("es-CO")} % sobre la base`, reteiva: `${c.reteIvaPct} % del IVA`, reteica: `${c.reteIcaPorMil.toLocaleString("es-CO")} por mil`, contribucion_obra_publica: `${c.contribucionPct} %`, retencion_de_garantia: `${c.garantiaPct} %`, amortizacion_anticipo: `${c.anticipoPct} %`, anticipo_por_amortizar: monto(c.anticipoSaldo, c.moneda), dias_de_pago: c.diasPago, neto_por_cada_1000_millones_facturados: c.moneda === "USD" ? "no aplica" : cop(l.neto) };
      });
    default:
      throw new Error(`No existe la herramienta ${nombre}.`);
  }
}

function sistema(d: Datos) {
  return `Eres el asistente de facturación y caja de Constructora Conconcreto. Te preguntan Facturación y cartera, Tesorería y Relación con inversionistas.

Cómo respondes:
- NO calculas. Cada cifra de tu respuesta sale tal cual de una herramienta. No sumes, no restes, no conviertas monedas, no saques porcentajes: si necesitas un total, usa la herramienta que lo trae. Si la cifra que te piden no la trae ninguna herramienta, dilo.
- Si la pregunta no se puede responder con estas herramientas (por ejemplo márgenes, costos de obra o datos de otras áreas), dilo en una frase y di qué dato haría falta. No inventes.
- Empieza por la respuesta, en una o dos frases, con la cifra principal en negrilla. Después el detalle que lo explica (por ejemplo por cliente), en una lista corta o una tabla. Cierra con los supuestos que importan: la fecha del corte de saldos, el escenario usado y qué proyectos no han confirmado, si los hay.
- Cuando te pregunten «si los proyectos facturan lo que confirmaron», usa el escenario «informado», y di cuáles proyectos todavía no confirmaron y cuánto cambia sin ellos (la herramienta lo trae).
- Español neutro con tuteo. Cifras como vienen de las herramientas («$1.290 millones»). Fechas como «15 de diciembre». Nada de emojis.

Hoy es ${fmtFecha(d.hoy)} de ${d.hoy.slice(0, 4)} (${d.hoy}). La semana de la ronda de confirmaciones es la del ${fmtFecha(semanaDeRonda(d.hoy))}.`;
}

/** Las cifras de la respuesta que no aparecen en ninguna salida de herramienta. */
export function verificar(respuesta: string, llamadas: LlamadaHerramienta[]) {
  return cifrasNoAutorizadas(respuesta, cifrasDe(JSON.stringify(llamadas.map((l) => l.salida))));
}

export async function preguntar(pregunta: string, usuario: { id: string; nombre: string }) {
  const t0 = Date.now();
  const d = await leerDatos();
  // Las últimas preguntas de esta persona en la última hora, para que pueda repreguntar («¿y sin ellos?»).
  const previas = await db.consulta.findMany({ where: { usuarioId: usuario.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } }, orderBy: { createdAt: "desc" }, take: 3 });
  const mensajes = [
    ...previas.reverse().flatMap((c) => [{ role: "user" as const, content: c.pregunta }, { role: "assistant" as const, content: c.respuesta }]),
    { role: "user" as const, content: pregunta },
  ];
  const r = await conversarConHerramientas({ sistema: sistema(d), mensajes, herramientas: HERRAMIENTAS, ejecutar: (n, e) => ejecutar(d, n, e) });
  const sinVerificar = verificar(r.texto, r.llamadas);
  const c = await db.consulta.create({
    data: { usuarioId: usuario.id, quien: usuario.nombre, pregunta, respuesta: r.texto, herramientas: r.llamadas as never, verificada: sinVerificar.length === 0, sinVerificar, ms: Date.now() - t0 },
  });
  return { id: c.id, respuesta: r.texto, llamadas: r.llamadas.map((l) => ({ nombre: l.nombre, entrada: l.entrada, error: l.error ?? null })), sinVerificar, ms: c.ms };
}

/** Para las pruebas: correr una herramienta sin el modelo. */
export async function correrHerramienta(nombre: string, entrada: Record<string, unknown>) {
  return ejecutar(await leerDatos(), nombre, entrada);
}
