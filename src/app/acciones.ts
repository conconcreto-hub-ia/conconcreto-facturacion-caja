"use server";
// Las acciones de la app. Cada una empieza con exigir("<permiso>"): esconder el botón no protege nada,
// porque una acción de servidor se puede llamar directamente.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth/sesion";
import { enviarRonda, enviarRecordatorios, registrarAMano } from "@/lib/confirmaciones";
import { revisarBuzon } from "@/lib/buzon";
import { aprobar, devolver, detectarYRedactar, redactar } from "@/lib/justificaciones";
import { importarProyeccion, importarSap } from "@/lib/cargas";
import { preguntar } from "@/lib/conversacion";
import { dia, hoyBogota } from "@/lib/fechas";
import { leerMonto } from "@/lib/montos";

const refrescar = () => revalidatePath("/", "layout");
const error = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ── Confirmaciones ─────────────────────────────────────────────────── */

export async function accionEnviarRonda() {
  const u = await exigir("confirmaciones.enviar");
  const r = await enviarRonda(u.nombre);
  refrescar();
  return r;
}

export async function accionRecordar() {
  await exigir("confirmaciones.enviar");
  // Desde el botón: a todos los que no han contestado, sin esperar las 24 horas.
  const r = await enviarRecordatorios(0);
  refrescar();
  return r;
}

export async function accionRevisarBuzon() {
  await exigir("confirmaciones.enviar");
  const r = await revisarBuzon();
  refrescar();
  return r;
}

export async function accionRegistrarAMano(id: string, estado: "confirmada" | "ajustada" | "no_factura", valorTexto: string, fecha: string, explicacion: string) {
  const u = await exigir("confirmaciones.registrar");
  const valor = estado === "ajustada" ? leerMonto(valorTexto)?.valor ?? null : null;
  if (estado === "ajustada" && valor === null) throw new Error("No entendí el valor. Escríbelo como «$1.200 millones» o «1200000000».");
  await registrarAMano(id, u.nombre, estado, valor, /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null, explicacion.trim() || null);
  refrescar();
}

/* ── Justificaciones ───────────────────────────────────────────────── */

export async function accionDetectarDiferencias(mes: string) {
  await exigir("justificaciones.redactar");
  if (!/^\d{4}-\d{2}-01$/.test(mes)) throw new Error("Mes no válido.");
  const r = await detectarYRedactar(mes);
  refrescar();
  return r;
}

export async function accionRedactarDeNuevo(proyectoId: string, mes: string) {
  await exigir("justificaciones.redactar");
  await redactar(proyectoId, mes);
  refrescar();
}

export async function accionAprobarJustificacion(id: string) {
  const u = await exigir("justificaciones.aprobar");
  await aprobar(id, u.nombre);
  refrescar();
}

export async function accionDevolverJustificacion(id: string, observacion: string) {
  const u = await exigir("justificaciones.aprobar");
  if (!observacion.trim()) throw new Error("Escribe qué hay que cambiar.");
  await devolver(id, u.nombre, observacion.trim());
  refrescar();
}

/* ── Cargas ────────────────────────────────────────────────────────── */

export async function accionCargar(_: unknown, f: FormData): Promise<{ error?: string; ok?: string; avisos?: string[] }> {
  const u = await exigir("datos.cargar");
  const archivo = f.get("archivo");
  const tipo = String(f.get("tipo"));
  if (!(archivo instanceof File) || !archivo.size) return { error: "Elige un archivo .xlsx." };
  if (!/\.xlsx$/i.test(archivo.name)) return { error: "El archivo tiene que ser .xlsx." };
  if (archivo.size > 5_000_000) return { error: "El archivo pesa más de 5 MB." };
  try {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const r = tipo === "sap" ? await importarSap(bytes, archivo.name, u.nombre) : await importarProyeccion(bytes, archivo.name, u.nombre);
    refrescar();
    return { ok: tipo === "sap" ? `Se cargaron ${r.actualizadas} facturas.` : `Se cargaron ${r.actualizadas} valores de ${r.filas} proyectos.`, avisos: r.errores };
  } catch (e) {
    return { error: error(e) };
  }
}

/* ── Caja ──────────────────────────────────────────────────────────── */

export async function accionRegistrarSaldo(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const u = await exigir("caja.editar");
  const fecha = String(f.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyBogota()) return { error: "La fecha no es válida (no puede ser futura)." };
  const bancos = await db.banco.findMany();
  let n = 0;
  for (const b of bancos) {
    const t = String(f.get(`saldo-${b.id}`) ?? "").trim();
    if (!t) continue;
    const v = leerMonto(t) ?? (Number.isFinite(Number(t.replace(/[^\d-]/g, ""))) ? { valor: Number(t.replace(/[^\d-]/g, "")) } : null);
    if (!v) return { error: `No entendí el saldo de ${b.nombre}.` };
    await db.saldoBanco.upsert({ where: { bancoId_fecha: { bancoId: b.id, fecha: dia(fecha) } }, update: { saldo: BigInt(Math.round(v.valor)), quien: u.nombre }, create: { bancoId: b.id, fecha: dia(fecha), saldo: BigInt(Math.round(v.valor)), quien: u.nombre } });
    n++;
  }
  if (!n) return { error: "Escribe al menos un saldo." };
  await db.evento.create({ data: { actor: "persona", tipo: "caja.saldos", descripcion: `${u.nombre} registró ${n} saldos bancarios del ${fecha}` } });
  refrescar();
  return { ok: true };
}

export async function accionNuevoPago(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const u = await exigir("caja.editar");
  const fecha = String(f.get("fecha") ?? ""), concepto = String(f.get("concepto") ?? "").trim(), beneficiario = String(f.get("beneficiario") ?? "").trim();
  const categoria = String(f.get("categoria") ?? "proveedores"), moneda = String(f.get("moneda") ?? "COP") === "USD" ? "USD" : "COP";
  const v = leerMonto(String(f.get("valor") ?? "")) ?? null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Falta la fecha." };
  if (!concepto || !beneficiario) return { error: "Faltan el concepto o el beneficiario." };
  if (!v || v.valor <= 0) return { error: "No entendí el valor." };
  if (!["nomina", "seguridad_social", "proveedores", "impuestos", "credito"].includes(categoria)) return { error: "Tipo de pago no válido." };
  await db.pagoProgramado.create({ data: { fecha: dia(fecha), concepto, beneficiario, categoria, valor: BigInt(v.valor), moneda, quien: u.nombre } });
  await db.evento.create({ data: { actor: "persona", tipo: "caja.pago", descripcion: `${u.nombre} programó un pago: ${concepto} (${beneficiario}) el ${fecha}` } });
  refrescar();
  return { ok: true };
}

export async function accionMarcarPagado(id: string) {
  const u = await exigir("caja.editar");
  const p = await db.pagoProgramado.update({ where: { id }, data: { pagado: true } });
  await db.evento.create({ data: { actor: "persona", tipo: "caja.pagado", descripcion: `${u.nombre} marcó como hecho el pago «${p.concepto}»` } });
  refrescar();
}

/* ── Conversación ──────────────────────────────────────────────────── */

export async function accionPreguntar(pregunta: string) {
  const u = await exigir("conversar");
  const p = pregunta.trim();
  if (!p) throw new Error("Escribe una pregunta.");
  if (p.length > 1000) throw new Error("La pregunta es muy larga.");
  return preguntar(p, { id: u.id, nombre: u.nombre });
}
