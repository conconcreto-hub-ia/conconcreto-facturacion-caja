// Cargar la proyección trimestral (Excel) y el exporte de facturación de SAP (Excel).
// Las columnas se buscan por su encabezado, no por su posición: si alguien agrega una columna, no se rompe.
// Ninguna carga borra lo que había: actualiza por proyecto y mes (proyección) o por número de factura (SAP).

import ExcelJS from "exceljs";
import { db } from "./db";
import { dia, diaDelMes, iso, mesDe, trimestreDe, type Dia } from "./fechas";

type Celda = ExcelJS.CellValue;

const texto = (v: Celda): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return iso(v);
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result ?? "");
  if (typeof v === "object" && "text" in v) return String(v.text);
  return String(v).trim();
};

const numero = (v: Celda): number | null => {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof v.result === "number") return v.result;
  const s = texto(v).replace(/\s/g, "");
  if (!s) return null;
  // «1.234.567,89» o «1234567.89»
  const limpio = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(limpio.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const MESES: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

/** «2026-11-01», una fecha de Excel, «nov-2026», «Noviembre 2026», «15.11.2026» (SAP) → Dia. */
export function leerFecha(v: Celda): Dia | null {
  if (v instanceof Date) return iso(v);
  const s = texto(v).toLowerCase();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^([a-záéíóú]{3})[a-záéíóú]*[\s.-]+(?:de\s+)?(\d{4})$/);
  if (m && MESES[m[1]]) return `${m[2]}-${String(MESES[m[1]]).padStart(2, "0")}-01`;
  return null;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function buscarEncabezado(h: ExcelJS.Worksheet, debeTener: string): { fila: number; col: Map<string, number>; celdas: Map<number, Celda> } | null {
  for (let f = 1; f <= Math.min(25, h.rowCount); f++) {
    const col = new Map<string, number>(), celdas = new Map<number, Celda>();
    h.getRow(f).eachCell((c, i) => { col.set(norm(texto(c.value)), i); celdas.set(i, c.value); });
    if ([...col.keys()].some((k) => k.includes(norm(debeTener)))) return { fila: f, col, celdas };
  }
  return null;
}

const columna = (col: Map<string, number>, ...opciones: string[]) => {
  for (const o of opciones) for (const [k, i] of col) if (k === norm(o)) return i;
  for (const o of opciones) for (const [k, i] of col) if (k.includes(norm(o))) return i;
  return null;
};

async function abrir(bytes: ArrayBuffer | Buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(bytes as ArrayBuffer);
  return libro;
}

/* ── Proyección ────────────────────────────────────────────────────── */

export type ResultadoCarga = { filas: number; actualizadas: number; errores: string[]; detalle: Record<string, unknown> };

/** Una fila por proyecto; columnas «Elemento PEP», «Día de radicación» y una por mes (oct-2026, nov-2026…). */
export async function importarProyeccion(bytes: ArrayBuffer | Buffer, archivo: string, quien: string): Promise<ResultadoCarga> {
  const libro = await abrir(bytes);
  const h = libro.worksheets.find((w) => buscarEncabezado(w, "Elemento PEP")) ?? libro.worksheets[0];
  const enc = buscarEncabezado(h, "Elemento PEP");
  if (!enc) throw new Error("No encontré la columna «Elemento PEP» en la proyección.");
  const cPep = columna(enc.col, "Elemento PEP")!;
  const cDia = columna(enc.col, "Día de radicación", "Dia radicacion");
  const meses = [...enc.celdas.entries()].map(([i, v]) => ({ i, mes: leerFecha(v) })).filter((x): x is { i: number; mes: Dia } => !!x.mes && x.i !== cPep).map((x) => ({ i: x.i, mes: mesDe(x.mes) }));
  if (!meses.length) throw new Error("No encontré columnas de meses en la proyección (por ejemplo «nov-2026»).");

  const proyectos = new Map((await db.proyecto.findMany()).map((p) => [p.codigo.toUpperCase(), p]));
  const carga = await db.carga.create({ data: { tipo: "proyeccion", archivo, filas: 0, quien } });
  const errores: string[] = [];
  let filas = 0, actualizadas = 0;
  for (let f = enc.fila + 1; f <= h.rowCount; f++) {
    const fila = h.getRow(f);
    const pep = texto(fila.getCell(cPep).value).toUpperCase();
    if (!pep) continue;
    if (/^total/i.test(pep)) continue;
    filas++;
    const p = proyectos.get(pep);
    if (!p) { errores.push(`Fila ${f}: el elemento PEP ${pep} no es un proyecto conocido.`); continue; }
    const diaRad = cDia ? numero(fila.getCell(cDia).value) : null;
    for (const m of meses) {
      const v = numero(fila.getCell(m.i).value);
      if (v === null) continue;
      const fechaRadicacion = dia(diaDelMes(m.mes, diaRad ?? p.diaRadicacion));
      await db.proyeccion.upsert({
        where: { proyectoId_mes: { proyectoId: p.id, mes: dia(m.mes) } },
        update: { valor: BigInt(Math.round(v)), fechaRadicacion, trimestre: trimestreDe(m.mes), cargaId: carga.id },
        create: { proyectoId: p.id, mes: dia(m.mes), valor: BigInt(Math.round(v)), fechaRadicacion, trimestre: trimestreDe(m.mes), cargaId: carga.id },
      });
      actualizadas++;
    }
  }
  const detalle = { meses: meses.map((m) => m.mes), errores };
  await db.carga.update({ where: { id: carga.id }, data: { filas, detalle } });
  await db.evento.create({ data: { actor: "persona", tipo: "carga.proyeccion", descripcion: `${quien} cargó la proyección «${archivo}»: ${filas} proyectos, ${meses.length} meses${errores.length ? ` · ${errores.length} filas con error` : ""}` } });
  return { filas, actualizadas, errores, detalle };
}

/* ── Exporte de SAP ────────────────────────────────────────────────── */

/** El exporte de la lista de facturas de SAP: una fila por documento de facturación. */
export async function importarSap(bytes: ArrayBuffer | Buffer, archivo: string, quien: string): Promise<ResultadoCarga> {
  const libro = await abrir(bytes);
  const h = libro.worksheets.find((w) => buscarEncabezado(w, "Doc.factura")) ?? libro.worksheets[0];
  const enc = buscarEncabezado(h, "Doc.factura") ?? buscarEncabezado(h, "Documento de facturación");
  if (!enc) throw new Error("No encontré la columna «Doc.factura» en el exporte de SAP.");
  const c = {
    doc: columna(enc.col, "Doc.factura", "Documento de facturación")!,
    fecha: columna(enc.col, "Fecha factura", "Fe.factura"),
    solicitante: columna(enc.col, "Solicitante"),
    pep: columna(enc.col, "Elemento PEP"),
    neto: columna(enc.col, "Valor neto"),
    impuesto: columna(enc.col, "Impuesto", "Importe del impuesto"),
    moneda: columna(enc.col, "Moneda"),
    texto: columna(enc.col, "Texto"),
    venc: columna(enc.col, "Venc.neto", "Vencimiento"),
    comp: columna(enc.col, "Compensado"),
    fComp: columna(enc.col, "Fecha compensación", "Fe.compensación"),
    anul: columna(enc.col, "Anulada"),
  };
  for (const [k, v] of Object.entries({ fecha: c.fecha, pep: c.pep, neto: c.neto })) if (!v) throw new Error(`Falta la columna ${k} en el exporte de SAP.`);

  const proyectos = new Map((await db.proyecto.findMany({ include: { cliente: true } })).map((p) => [p.codigo.toUpperCase(), p]));
  const carga = await db.carga.create({ data: { tipo: "sap", archivo, filas: 0, quien } });
  const errores: string[] = [];
  let filas = 0, actualizadas = 0;
  for (let f = enc.fila + 1; f <= h.rowCount; f++) {
    const r = h.getRow(f);
    const numeroDoc = texto(r.getCell(c.doc).value);
    if (!numeroDoc || !/\d/.test(numeroDoc)) continue;
    filas++;
    const pep = texto(r.getCell(c.pep!).value).toUpperCase();
    const p = proyectos.get(pep);
    if (!p) { errores.push(`Factura ${numeroDoc}: el elemento PEP ${pep || "(vacío)"} no es un proyecto conocido.`); continue; }
    const sol = c.solicitante ? texto(r.getCell(c.solicitante).value) : "";
    if (sol && sol !== p.cliente.codigoSap) errores.push(`Factura ${numeroDoc}: el solicitante ${sol} no es el cliente del proyecto ${pep} (${p.cliente.codigoSap}). Se cargó con el cliente del proyecto.`);
    const fecha = leerFecha(r.getCell(c.fecha!).value);
    const base = numero(r.getCell(c.neto!).value);
    if (!fecha || base === null) { errores.push(`Factura ${numeroDoc}: sin fecha o sin valor neto.`); continue; }
    const iva = c.impuesto ? numero(r.getCell(c.impuesto).value) ?? 0 : 0;
    const moneda = (c.moneda ? texto(r.getCell(c.moneda).value).toUpperCase() : p.moneda) === "USD" ? "USD" : "COP";
    const venc = (c.venc && leerFecha(r.getCell(c.venc).value)) || null;
    const fechaVencimiento = venc ?? iso(new Date(dia(fecha).getTime() + p.cliente.diasPago * 86_400_000));
    const pagada = c.comp ? /^(x|si|sí|s)$/i.test(texto(r.getCell(c.comp).value)) : false;
    const fechaPago = c.fComp ? leerFecha(r.getCell(c.fComp).value) : null;
    const anulada = c.anul ? /^(x|si|sí|s)$/i.test(texto(r.getCell(c.anul).value)) : false;
    const datos = {
      proyectoId: p.id, clienteId: p.clienteId, fecha: dia(fecha), mes: dia(mesDe(fecha)), moneda: moneda as "COP" | "USD",
      base: BigInt(Math.round(base)), iva: BigInt(Math.round(iva)), texto: c.texto ? texto(r.getCell(c.texto).value) || null : null,
      fechaVencimiento: dia(fechaVencimiento), pagada, fechaPago: fechaPago ? dia(fechaPago) : null, anulada, cargaId: carga.id,
    };
    await db.factura.upsert({ where: { numero: numeroDoc }, update: datos, create: { numero: numeroDoc, ...datos } });
    actualizadas++;
  }
  const detalle = { errores };
  await db.carga.update({ where: { id: carga.id }, data: { filas, detalle } });
  await db.evento.create({ data: { actor: "persona", tipo: "carga.sap", descripcion: `${quien} cargó el exporte de SAP «${archivo}»: ${actualizadas} facturas${errores.length ? ` · ${errores.length} avisos` : ""}` } });
  return { filas, actualizadas, errores, detalle };
}
