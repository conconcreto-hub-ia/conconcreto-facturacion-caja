// Carga de la base lo que necesita el motor de cifras (src/lib/finanzas.ts). Una lectura por request.
import { cache } from "react";
import { db } from "./db";
import { hoyBogota, iso } from "./fechas";
import type { Datos } from "./finanzas";

export async function leerDatos(hoy = hoyBogota()): Promise<Datos> {
  const [clientes, proyectos, proyecciones, confirmaciones, facturas, saldos, pagos, trm] = await Promise.all([
    db.cliente.findMany(),
    db.proyecto.findMany({ orderBy: { codigo: "asc" } }),
    db.proyeccion.findMany(),
    db.confirmacion.findMany(),
    db.factura.findMany(),
    db.saldoBanco.findMany({ include: { banco: true } }),
    db.pagoProgramado.findMany(),
    db.trm.findFirst({ where: { fecha: { lte: new Date(`${hoy}T00:00:00Z`) } }, orderBy: { fecha: "desc" } }),
  ]);
  const n = (x: bigint | null) => (x === null ? null : Number(x));
  return {
    hoy,
    clientes: clientes.map((c) => ({ ...c, anticipoSaldo: Number(c.anticipoSaldo) })),
    proyectos: proyectos.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, linea: p.linea, moneda: p.moneda, clienteId: p.clienteId, diaRadicacion: p.diaRadicacion, activo: p.activo })),
    proyecciones: proyecciones.map((p) => ({ proyectoId: p.proyectoId, mes: iso(p.mes), valor: Number(p.valor), fechaRadicacion: p.fechaRadicacion ? iso(p.fechaRadicacion) : null })),
    confirmaciones: confirmaciones.map((c) => ({
      proyectoId: c.proyectoId, mes: iso(c.mes), semana: iso(c.semana), estado: c.estado, facturadoAntes: Number(c.facturadoAntes),
      valorPreguntado: Number(c.valorPreguntado), valorInformado: n(c.valorInformado), fechaInformada: c.fechaInformada ? iso(c.fechaInformada) : null, explicacion: c.explicacion,
    })),
    facturas: facturas.map((f) => ({
      numero: f.numero, proyectoId: f.proyectoId, clienteId: f.clienteId, fecha: iso(f.fecha), mes: iso(f.mes), moneda: f.moneda, base: Number(f.base), iva: Number(f.iva),
      fechaVencimiento: iso(f.fechaVencimiento), pagada: f.pagada, anulada: f.anulada, texto: f.texto,
    })),
    saldos: saldos.map((s) => ({ bancoId: s.bancoId, banco: s.banco.nombre, moneda: s.banco.moneda, fecha: iso(s.fecha), saldo: Number(s.saldo) })),
    pagos: pagos.map((p) => ({ fecha: iso(p.fecha), beneficiario: p.beneficiario, concepto: p.concepto, categoria: p.categoria, valor: Number(p.valor), moneda: p.moneda, pagado: p.pagado })),
    trm: trm?.valor ?? 4000,
    trmFecha: trm ? iso(trm.fecha) : null,
  };
}

/** Para las páginas: una sola lectura aunque varios componentes la pidan. */
export const datosDeHoy = cache(() => leerDatos());
