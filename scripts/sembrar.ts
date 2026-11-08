// Siembra los datos de demostración. BORRA los datos del proceso (no los usuarios) y los vuelve a cargar.
//
//   npx tsx scripts/sembrar.ts
//
// 1. Escribe los dos Excel de demostración en datos-demo/ (la proyección del T4 y el exporte de SAP).
// 2. Crea clientes con sus condiciones, proyectos, hitos, bancos, saldos diarios, TRM y pagos programados.
// 3. Carga los dos Excel con las MISMAS funciones que usa la pantalla de Datos (src/lib/cargas.ts).
// 4. Deja lo que cada proyecto informó la semana del 26 de octubre para octubre.
import "./_env";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { db } from "../src/lib/db";
import { importarProyeccion, importarSap } from "../src/lib/cargas";
import { dia, diaSemana, iso, sumarDias } from "../src/lib/fechas";
import { BANCOS, CLIENTES, CORREO_RESIDENTE_PRUEBA, FACTURAS, FECHA_ULTIMO_SALDO, INFORMADO_OCTUBRE, PAGOS, PROYECTOS, TRM_FINAL } from "./demo/datos";

const CARPETA = path.join(process.cwd(), "datos-demo");
export const ARCHIVO_PROYECCION = path.join(CARPETA, "Proyeccion_facturacion_2026-T4.xlsx");
export const ARCHIVO_SAP = path.join(CARPETA, "SAP_facturas_ago-nov_2026.xlsx");

// Aleatorio con semilla: los saldos salen iguales cada vez.
let semilla = 20261108;
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296);

async function escribirExcel() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const cliente = new Map(CLIENTES.map((c) => [c.clave, c]));

  // Proyección: como la lleva facturación, una fila por proyecto y una columna por mes.
  const lp = new ExcelJS.Workbook();
  const hp = lp.addWorksheet("Proyección T4");
  hp.addRow(["Proyección de facturación · 2026-T4"]).font = { bold: true, size: 14 };
  hp.addRow(["Valores antes de IVA, en la moneda de cada proyecto. Datos de demostración."]);
  hp.addRow([]);
  hp.addRow(["Elemento PEP", "Proyecto", "Cliente", "Moneda", "Día de radicación", "oct-2026", "nov-2026", "dic-2026"]).font = { bold: true };
  for (const p of PROYECTOS) hp.addRow([p.codigo, p.nombre, cliente.get(p.cliente)!.nombre, p.moneda, p.diaRadicacion, ...p.proyeccion]);
  hp.columns.forEach((c, i) => { c.width = i === 1 || i === 2 ? 42 : 16; if (i >= 5) c.numFmt = "#,##0"; });
  await lp.xlsx.writeFile(ARCHIVO_PROYECCION);

  // SAP: la lista de facturas con los nombres de columna del exporte y fechas como las escribe SAP.
  const proyecto = new Map(PROYECTOS.map((p) => [p.codigo, p]));
  const ls = new ExcelJS.Workbook();
  const hs = ls.addWorksheet("Facturas");
  hs.addRow(["Doc.factura", "Fecha factura", "Solicitante", "Nombre del solicitante", "Elemento PEP", "Valor neto", "Impuesto", "Moneda", "Venc.neto", "Compensado", "Fecha compensación", "Anulada", "Texto"]).font = { bold: true };
  const sap = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
  for (const [numero, pep, fecha, base, texto, pagada] of FACTURAS) {
    const p = proyecto.get(pep)!, c = cliente.get(p.cliente)!;
    const iva = Math.round((base * c.ivaPct) / 100);
    hs.addRow([numero, sap(fecha), c.codigoSap, c.nombre, pep, base, iva, p.moneda, sap(sumarDias(fecha, c.diasPago)), pagada ? "X" : "", pagada ? sap(pagada) : "", "", texto]);
  }
  hs.columns.forEach((c, i) => { c.width = i === 3 || i === 12 ? 44 : 15; if (i === 5 || i === 6) c.numFmt = "#,##0"; });
  await ls.xlsx.writeFile(ARCHIVO_SAP);
}

async function limpiar() {
  await db.$transaction([
    db.consulta.deleteMany(), db.evento.deleteMany(), db.correo.deleteMany(), db.justificacion.deleteMany(), db.confirmacion.deleteMany(),
    db.factura.deleteMany(), db.proyeccion.deleteMany(), db.carga.deleteMany(), db.hito.deleteMany(), db.proyecto.deleteMany(), db.cliente.deleteMany(),
    db.pagoProgramado.deleteMany(), db.saldoBanco.deleteMany(), db.banco.deleteMany(), db.trm.deleteMany(),
  ]);
}

async function main() {
  await escribirExcel();
  await limpiar();

  const idCliente = new Map<string, string>();
  for (const { clave, anticipoSaldo, ...c } of CLIENTES) {
    const x = await db.cliente.create({ data: { ...c, anticipoSaldo: BigInt(anticipoSaldo) } });
    idCliente.set(clave, x.id);
  }
  for (const p of PROYECTOS) {
    await db.proyecto.create({
      data: {
        codigo: p.codigo, nombre: p.nombre, linea: p.linea, ciudad: p.ciudad, pais: p.pais, moneda: p.moneda, clienteId: idCliente.get(p.cliente)!,
        director: p.director, residenteNombre: p.residente, residenteCorreo: CORREO_RESIDENTE_PRUEBA,
        valorContrato: BigInt(p.valorContrato), facturadoAnterior: BigInt(p.facturadoAnterior), avance: p.avance,
        inicio: dia(p.inicio), finPrevisto: dia(p.fin), diaRadicacion: p.diaRadicacion,
        hitos: { create: p.hitos.map((h) => ({ nombre: h.nombre, fecha: dia(h.fecha), cumplido: !!h.cumplido, financiero: !!h.financiero })) },
      },
    });
  }

  // TRM y saldos: días hábiles del 1 de octubre al último saldo. Los saldos terminan en el valor de BANCOS.
  const habiles: string[] = [];
  for (let d = "2026-10-01"; d <= FECHA_ULTIMO_SALDO; d = sumarDias(d, 1)) if (diaSemana(d) >= 1 && diaSemana(d) <= 5) habiles.push(d);
  let trm = TRM_FINAL;
  const trms: { fecha: Date; valor: number }[] = [];
  for (const d of [...habiles].reverse()) { trms.push({ fecha: dia(d), valor: Math.round(trm * 100) / 100 }); trm += (azar() - 0.5) * 30; }
  await db.trm.createMany({ data: trms });
  for (const [i, b] of BANCOS.entries()) {
    const banco = await db.banco.create({ data: { nombre: b.nombre, cuenta: b.cuenta, moneda: b.moneda, orden: i } });
    let s = b.saldo;
    const filas: { bancoId: string; fecha: Date; saldo: bigint; quien: string }[] = [];
    for (const d of [...habiles].reverse()) { filas.push({ bancoId: banco.id, fecha: dia(d), saldo: BigInt(Math.round(s)), quien: "Carga inicial" }); s *= 1 + (azar() - 0.5) * 0.12; }
    await db.saldoBanco.createMany({ data: filas });
  }
  const bancos = new Map((await db.banco.findMany()).map((b) => [b.nombre, b.id]));
  await db.pagoProgramado.createMany({
    data: PAGOS.map(([fecha, beneficiario, concepto, categoria, valor, moneda, banco]) => ({ fecha: dia(fecha), beneficiario, concepto, categoria, valor: BigInt(valor), moneda, bancoId: bancos.get(banco) ?? null, quien: "Carga inicial" })),
  });

  // Los dos Excel, con las mismas funciones de la pantalla de Datos.
  const rp = await importarProyeccion(fs.readFileSync(ARCHIVO_PROYECCION), path.basename(ARCHIVO_PROYECCION), "Carga inicial");
  const rs = await importarSap(fs.readFileSync(ARCHIVO_SAP), path.basename(ARCHIVO_SAP), "Carga inicial");
  if (rp.errores.length || rs.errores.length) console.log("Avisos de la carga:", [...rp.errores, ...rs.errores]);

  // Lo informado para octubre, la semana del 26.
  const semana = "2026-10-26";
  for (const p of await db.proyecto.findMany({ include: { proyecciones: true, facturas: true } })) {
    const inf = INFORMADO_OCTUBRE[p.codigo];
    const proy = p.proyecciones.find((x) => iso(x.mes) === "2026-10-01")!;
    const antes = p.facturas.filter((f) => iso(f.mes) === "2026-10-01" && iso(f.fecha) < semana).reduce((a, f) => a + Number(f.base), 0);
    await db.confirmacion.create({
      data: {
        proyectoId: p.id, mes: dia("2026-10-01"), semana: dia(semana), estado: inf.estado, origen: "carga inicial",
        facturadoAntes: BigInt(antes), valorPreguntado: BigInt(Math.max(0, Number(proy.valor) - antes)), fechaPreguntada: proy.fechaRadicacion,
        valorInformado: BigInt(inf.total - antes), fechaInformada: inf.fecha ? dia(inf.fecha) : proy.fechaRadicacion, explicacion: inf.explicacion,
        enviadaEn: new Date("2026-10-26T12:00:00Z"), respondidaEn: new Date("2026-10-26T17:00:00Z"), ultimaActividad: new Date("2026-10-26T17:00:00Z"),
      },
    });
  }
  await db.evento.create({ data: { actor: "sistema", tipo: "demo.sembrada", descripcion: "Se cargaron los datos de demostración: 8 clientes, 12 proyectos, la proyección del T4, el exporte de SAP, 5 bancos y los pagos programados" } });

  console.log(`Listo · proyección: ${rp.actualizadas} valores · SAP: ${rs.actualizadas} facturas · ${habiles.length} días de saldos y TRM · ${PAGOS.length} pagos programados`);
}

main().finally(() => db.$disconnect());
