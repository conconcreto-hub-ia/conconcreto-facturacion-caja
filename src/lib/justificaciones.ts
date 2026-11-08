// La justificación ante la interventoría: cuando lo facturado en un mes cerrado se aparta de lo que el
// proyecto informó, el agente la redacta con los datos y una persona de facturación la aprueba.
//
//   · Las cifras las pone el código (formateadas). El modelo redacta y explica la causa con lo que dicen el
//     texto de las facturas y lo que escribió el residente. No inventa causas.
//   · Antes de guardarla, el código revisa que cada cifra del texto esté entre las que se le dieron. Si no,
//     la vuelve a pedir una vez diciendo cuál sobra; si sigue mal, queda marcada como «sin verificar».
//   · El agente no la envía: queda lista para aprobar.

import { db } from "./db";
import { pedirEstructurado } from "./claude";
import { leerDatos } from "./datos";
import { diferenciasMes, informadoVigente, umbralDe } from "./finanzas";
import { monto, pct } from "./formato";
import { dia, diaLargo, iso, nombreMesAnio, sumarMeses, type Dia } from "./fechas";

const HERRAMIENTA = {
  name: "redactar_justificacion",
  description: "Redacta la justificación de la diferencia de facturación de un mes, para la interventoría.",
  input_schema: {
    type: "object",
    required: ["asunto", "texto"],
    properties: {
      asunto: { type: "string" },
      texto: { type: "string", description: "La justificación completa: saludo, la diferencia con sus cifras, la causa, cuándo se factura lo pendiente si los datos lo dicen, y cierre. Párrafos cortos, sin viñetas." },
    },
  },
};

const SISTEMA = `Redactas, para Constructora Conconcreto, la justificación ante la interventoría de una diferencia entre lo que un proyecto informó que iba a facturar en un mes y lo que realmente facturó.

Reglas:
- Usas SOLO las cifras que vienen en <datos>, escritas exactamente como vienen. No sumas, no restas, no redondeas, no calculas porcentajes nuevos.
- La causa sale de lo que dicen los textos de las facturas y lo que escribió el residente. Si los datos no dicen la causa, lo dices y propones confirmarla con el residente; no inventas.
- Si los datos dicen cuándo se factura lo pendiente, lo dices; si no, no lo prometes.
- Tono formal y directo, de constructora a interventoría. Español neutro, con usted. Firma «Facturación y cartera · Constructora Conconcreto».
- Nada de «JP» ni de nombres de herramientas o del agente.`;

/** Todas las cifras de un texto: «$1.120 millones», «US$1.150.000», «39,5 %». */
export function cifrasDe(texto: string): string[] {
  return [...texto.matchAll(/-?US\$\s?[\d.,]+|-?\$\s?[\d.,]+(?:\s(?:millones|billones))?|\d+(?:,\d+)?\s?%/g)].map((m) => m[0].replace(/\s+/g, " ").replace(/[.,]$/, "").trim());
}

export function cifrasNoAutorizadas(texto: string, permitidas: string[]): string[] {
  const norm = (s: string) => s.replace(/\s/g, "").replace(/^-/, "");
  const ok = new Set(permitidas.map(norm));
  return cifrasDe(texto).filter((c) => !ok.has(norm(c)));
}

export async function redactar(proyectoId: string, mes: Dia, observacion?: string | null) {
  const d = await leerDatos();
  const fila = diferenciasMes(d, mes).find((x) => x.proyectoId === proyectoId);
  if (!fila || fila.informado === null) throw new Error("Ese proyecto no tiene lo informado para ese mes.");
  const p = await db.proyecto.findUniqueOrThrow({ where: { id: proyectoId }, include: { cliente: true, facturas: { where: { mes: dia(mes), anulada: false }, orderBy: { fecha: "asc" } } } });
  const inf = informadoVigente(d, proyectoId, mes);
  const siguiente = sumarMeses(mes, 1);
  const infSig = informadoVigente(d, proyectoId, siguiente);
  const m = (v: number) => monto(v, p.moneda);
  const dif = fila.real - fila.informado;

  const datos = {
    proyecto: `${p.nombre} (${p.codigo})`,
    cliente: p.cliente.nombre,
    mes: nombreMesAnio(mes),
    proyectado_en_la_proyeccion_trimestral: m(fila.proyectado),
    informado_por_el_proyecto: m(fila.informado),
    fecha_de_lo_informado: inf?.semana ? `confirmado la semana del ${diaLargo(inf.semana)}` : null,
    lo_que_dijo_el_residente: inf?.explicacion ?? null,
    facturado_real_en_sap: m(fila.real),
    facturas: p.facturas.map((f) => ({ numero: f.numero, fecha: diaLargo(iso(f.fecha)), valor_antes_de_iva: m(Number(f.base)), texto: f.texto })),
    diferencia: m(Math.abs(dif)),
    sentido: dif < 0 ? "se facturó menos de lo informado" : "se facturó más de lo informado",
    porcentaje_facturado_de_lo_informado: pct((fila.real / fila.informado) * 100, 1),
    umbral_de_justificacion: m(umbralDe(fila.informado, p.moneda)),
    informado_para_el_mes_siguiente: infSig ? { mes: nombreMesAnio(siguiente), valor: m(infSig.total), lo_que_dijo_el_residente: infSig.explicacion } : null,
  };
  const permitidas = [
    ...Object.values(datos).filter((v): v is string => typeof v === "string"),
    ...datos.facturas.map((f) => f.valor_antes_de_iva),
    ...(datos.informado_para_el_mes_siguiente ? [datos.informado_para_el_mes_siguiente.valor] : []),
    ...[inf?.explicacion, infSig?.explicacion, ...p.facturas.map((f) => f.texto)].flatMap((t) => (t ? cifrasDe(t) : [])),
  ];

  let usuario = `<datos>\n${JSON.stringify(datos, null, 2)}\n</datos>${observacion ? `\n\nFacturación devolvió la versión anterior con esta observación: «${observacion}»` : ""}`;
  let r = await pedirEstructurado<{ asunto: string; texto: string }>({ sistema: SISTEMA, usuario, herramienta: HERRAMIENTA });
  let sobran = cifrasNoAutorizadas(r.texto, permitidas);
  if (sobran.length) {
    usuario += `\n\nTu versión anterior traía cifras que no están en los datos: ${sobran.join(", ")}. Reescríbela usando solo las cifras de <datos>.`;
    r = await pedirEstructurado<{ asunto: string; texto: string }>({ sistema: SISTEMA, usuario, herramienta: HERRAMIENTA });
    sobran = cifrasNoAutorizadas(r.texto, permitidas);
  }
  const texto = `${r.asunto}\n\n${r.texto}`;
  const j = await db.justificacion.upsert({
    where: { proyectoId_mes: { proyectoId, mes: dia(mes) } },
    update: { proyectado: BigInt(fila.proyectado), informado: BigInt(fila.informado), real: BigInt(fila.real), diferencia: BigInt(dif), texto, datos, verificada: !sobran.length, estado: "borrador", observacion: observacion ?? null, aprobadaPor: null, aprobadaEn: null },
    create: { proyectoId, mes: dia(mes), proyectado: BigInt(fila.proyectado), informado: BigInt(fila.informado), real: BigInt(fila.real), diferencia: BigInt(dif), texto, datos, verificada: !sobran.length },
  });
  await db.evento.create({
    data: {
      proyectoId, actor: "agente", tipo: "justificacion.redactada",
      descripcion: `Redactó la justificación de ${nombreMesAnio(mes)} para la interventoría: se facturó ${m(fila.real)} de ${m(fila.informado)} informados (${dif < 0 ? "faltan" : "sobran"} ${m(Math.abs(dif))})${sobran.length ? ` · OJO: trae cifras que no están en los datos (${sobran.join(", ")})` : " · todas las cifras verificadas contra los datos"}`,
    },
  });
  return j;
}

/** Busca en un mes cerrado las diferencias que pasan el umbral y redacta las que falten. */
export async function detectarYRedactar(mes: Dia) {
  const d = await leerDatos();
  const filas = diferenciasMes(d, mes).filter((f) => f.requiereJustificacion);
  const existentes = await db.justificacion.findMany({ where: { mes: dia(mes) } });
  const redactadas: string[] = [];
  for (const f of filas) {
    const ya = existentes.find((j) => j.proyectoId === f.proyectoId);
    if (ya && ya.estado !== "devuelta") continue;
    await redactar(f.proyectoId, mes, ya?.observacion);
    redactadas.push(f.proyecto);
  }
  return { mes, conDiferencia: filas.length, redactadas };
}

export async function aprobar(id: string, quien: string) {
  const j = await db.justificacion.update({ where: { id }, data: { estado: "aprobada", aprobadaPor: quien, aprobadaEn: new Date() }, include: { proyecto: true } });
  await db.evento.create({ data: { proyectoId: j.proyectoId, actor: "persona", tipo: "justificacion.aprobada", descripcion: `${quien} aprobó la justificación de ${nombreMesAnio(iso(j.mes))} para la interventoría` } });
}

export async function devolver(id: string, quien: string, observacion: string) {
  const j = await db.justificacion.update({ where: { id }, data: { estado: "devuelta", observacion }, include: { proyecto: true } });
  await db.evento.create({ data: { proyectoId: j.proyectoId, actor: "persona", tipo: "justificacion.devuelta", descripcion: `${quien} devolvió la justificación de ${nombreMesAnio(iso(j.mes))}: «${observacion}»` } });
  return redactar(j.proyectoId, iso(j.mes), observacion);
}
