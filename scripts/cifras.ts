// Imprime las cifras clave tal como las calcula el código. Sirve para revisar a mano lo que dice la app.
//   npx tsx scripts/cifras.ts [AAAA-MM-DD]   (fecha para el disponible; por defecto el 15 de diciembre)
import "./_env";
import { db } from "../src/lib/db";
import { leerDatos } from "../src/lib/datos";
import { disponibleEn, diferenciasMes, descuadreMes, flujoSemanal } from "../src/lib/finanzas";
import { cop } from "../src/lib/formato";

(async () => {
  const d = await leerDatos();
  const fecha = process.argv[2] ?? "2026-12-15";
  console.log(`Hoy ${d.hoy} · TRM ${d.trm} (${d.trmFecha})`);
  for (const e of ["informado", "proyectado", "facturado"] as const) {
    const x = disponibleEn(d, fecha, e);
    console.log(`\n${e}: disponible el ${fecha} = ${cop(x.disponible)} · saldo ${cop(x.saldoInicial.totalCop)} (corte ${x.corte}) + recaudos ${cop(x.recaudos.totalCop)} − pagos ${cop(x.pagos.totalCop)}`);
    if (e === "informado") {
      for (const c of x.recaudos.porCliente) console.log(`   ${c.cliente}: ${cop(c.totalCop)} · ${c.items.map((i) => `${i.origen}${i.factura ? " " + i.factura : ""} ${i.fechaRecaudo}${i.vencida ? " VENCIDA" : ""}${i.sinConfirmar ? " SIN CONFIRMAR" : ""}`).join(" | ")}`);
      console.log(`   sin confirmar: ${cop(x.sinConfirmar.totalCop)} · sin ellos ${cop(x.sinConfirmar.disponibleSinEllos)}`);
    }
  }
  console.log("\nOctubre:");
  for (const r of diferenciasMes(d, "2026-10-01")) console.log(`   ${r.codigo} proy ${r.proyectado} inf ${r.informado} real ${r.real} dif ${r.difInformado}${r.requiereJustificacion ? "  ← JUSTIFICAR" : ""}`);
  const dq = descuadreMes(d, "2026-12-01");
  console.log(`\nDescuadre diciembre: plan ${cop(dq.planCop)} esperado ${cop(dq.esperadoCop)} dif ${cop(dq.diferenciaCop)}`);
  for (const c of dq.clientes) console.log(`   ${c.cliente}: ${cop(c.diferenciaCop)} (plan ${cop(c.planCop)} → ${cop(c.esperadoCop)})`);
  const f = flujoSemanal(d, "informado", 12);
  console.log("\nFlujo semanal (informado):");
  for (const w of f.filas) console.log(`   ${w.semana}  +${cop(w.recaudos)}  -${cop(w.pagos)}  = ${cop(w.saldoFinal)}`);
})().finally(() => db.$disconnect());
