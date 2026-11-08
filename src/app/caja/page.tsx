import Link from "next/link";
import { Barra } from "@/components/barra";
import { BotonAccion } from "@/components/accion";
import { Aja, Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { pagina } from "@/app/pagina";
import { accionMarcarPagado } from "@/app/acciones";
import { db } from "@/lib/db";
import { leerDatos } from "@/lib/datos";
import { aCop, disponibleEn, flujoSemanal, saldosAlCorte, type Escenario } from "@/lib/finanzas";
import { cop, copCorto, monto } from "@/lib/formato";
import { diaCorto, diaLargo, hoyBogota, iso } from "@/lib/fechas";
import { CATEGORIA_PAGO, ESCENARIO } from "@/lib/etiquetas";
import { FormPago, FormSaldos } from "./formularios";

export const dynamic = "force-dynamic";

export default async function Caja({ searchParams }: { searchParams: Promise<{ escenario?: string; fecha?: string }> }) {
  const u = await pagina("ver.caja");
  const d = await leerDatos();
  const sp = await searchParams;
  const escenario: Escenario = sp.escenario === "proyectado" || sp.escenario === "facturado" ? sp.escenario : "informado";
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : `${d.hoy.slice(0, 4)}-12-15`;
  const saldos = saldosAlCorte(d);
  const disp = disponibleEn(d, fecha, escenario);
  const flujo = flujoSemanal(d, escenario, 12);
  const maximo = Math.max(...flujo.filas.map((f) => Math.abs(f.saldoFinal)), 1);
  const [pagos, bancos] = await Promise.all([
    db.pagoProgramado.findMany({ where: { pagado: false, fecha: { gt: new Date(`${saldos.corte}T00:00:00Z`) } }, orderBy: { fecha: "asc" }, include: { banco: true }, take: 40 }),
    db.banco.findMany({ orderBy: { orden: "asc" } }),
  ]);
  const editar = u.puede("caja.editar");
  const q = (x: Record<string, string>) => `/caja?${new URLSearchParams({ escenario, fecha, ...x })}`;

  return (
    <>
      <Barra />
      <Contenedor className="space-y-10 py-10">
        <Encabezado
          et="Tesorería"
          titulo="La caja: hoy, a una fecha y por semana"
          bajada={`El disponible por banco al último corte, los recaudos que salen de la facturación (con las retenciones y anticipos de cada cliente) y los pagos programados. Todo lo calcula el código. Escenario: ${ESCENARIO[escenario].detalle.toLowerCase()}.`}
        />
        <div className="flex flex-wrap gap-2 text-[13px]">
          {(["informado", "proyectado", "facturado"] as const).map((e) => <Link key={e} href={q({ escenario: e })} className={`rounded-full border px-3 py-1 ${e === escenario ? "border-verde bg-verde-suave font-semibold text-verde-profundo" : "border-linea bg-papel text-tinta-2 hover:border-[#cfd8d1]"}`}>{ESCENARIO[e].etiqueta}</Link>)}
        </div>

        {/* Saldos */}
        <section className="space-y-3">
          <SeccionEt>{`Disponible al ${diaLargo(saldos.corte)}`}</SeccionEt>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tarjeta className="banda p-4 sm:col-span-3 lg:col-span-1">
              <div className="text-[12.5px] text-white/70">Total en pesos</div>
              <div className="num mt-1 text-[24px] font-extrabold text-white">{copCorto(saldos.totalCop)}</div>
              <div className="text-[11.5px] text-white/50">TRM {d.trm.toLocaleString("es-CO")}</div>
            </Tarjeta>
            {saldos.bancos.map((b) => (
              <Tarjeta key={b.banco} className="p-4">
                <div className="text-[12.5px] text-tinta-3">{b.banco}</div>
                <div className="num mt-1 text-[20px] font-extrabold">{b.moneda === "USD" ? monto(b.saldo, "USD") : copCorto(b.saldo)}</div>
                {b.moneda === "USD" && <div className="text-[11.5px] text-tinta-3">{copCorto(b.saldoCop)} en pesos</div>}
              </Tarjeta>
            ))}
          </div>
          {editar && <FormSaldos bancos={bancos.map((b) => ({ id: b.id, nombre: b.nombre, moneda: b.moneda }))} hoy={hoyBogota()} />}
        </section>

        {/* Disponible a una fecha */}
        <section className="space-y-3">
          <SeccionEt>Disponible a una fecha</SeccionEt>
          <form className="flex flex-wrap items-end gap-2" action="/caja">
            <input type="hidden" name="escenario" value={escenario} />
            <label className="text-[13px] font-semibold">Fecha<input type="date" name="fecha" defaultValue={fecha} className="mt-1 block h-10 rounded-ctl border border-linea bg-papel px-3 text-[14px]" /></label>
            <button type="submit" className="h-10 rounded-ctl border border-linea bg-papel px-4 font-display text-[14px] font-semibold hover:bg-fondo">Calcular</button>
          </form>
          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Tarjeta className="p-5">
              <dl className="m-0 space-y-2 text-[14px]">
                <div className="flex justify-between"><dt className="text-tinta-2">Saldo al {diaCorto(disp.corte)}</dt><dd className="num m-0">{cop(disp.saldoInicial.totalCop)}</dd></div>
                <div className="flex justify-between"><dt className="text-tinta-2">+ Recaudos esperados</dt><dd className="num m-0 text-verde-profundo">{cop(disp.recaudos.totalCop)}</dd></div>
                <div className="flex justify-between"><dt className="text-tinta-2">− Pagos programados</dt><dd className="num m-0 text-rojo">{cop(disp.pagos.totalCop)}</dd></div>
                <div className="flex justify-between border-t border-linea pt-2"><dt className="font-display font-bold">Disponible el {diaLargo(fecha)}</dt><dd className="num m-0 text-[20px] font-extrabold">{cop(disp.disponible)}</dd></div>
              </dl>
              {disp.sinConfirmar.proyectos.length > 0 && (
                <p className="mt-3 rounded-ctl bg-oro-suave px-3 py-2 text-[12.5px] text-[#6b4700]">
                  {cop(disp.sinConfirmar.totalCop)} dependen de {disp.sinConfirmar.proyectos.length} proyecto{disp.sinConfirmar.proyectos.length === 1 ? "" : "s"} que no han confirmado ({disp.sinConfirmar.proyectos.map((p) => p.proyecto).join(", ")}). Sin ellos: {cop(disp.sinConfirmar.disponibleSinEllos)}.
                </p>
              )}
              <div className="mt-4 space-y-1 text-[13px]">
                {disp.pagos.porCategoria.map((p) => <div key={p.categoria} className="flex justify-between text-tinta-2"><span>{CATEGORIA_PAGO[p.categoria] ?? p.categoria} ({p.pagos})</span><span className="num">{copCorto(p.totalCop)}</span></div>)}
              </div>
            </Tarjeta>
            <Tarjeta className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">De dónde sale</th><th className="px-5 py-3 text-right font-medium">Recaudo hasta el {diaCorto(fecha)}</th></tr></thead>
                <tbody>
                  {disp.recaudos.porCliente.map((c) => (
                    <tr key={c.cliente} className="border-t border-linea-2 align-top">
                      <td className="px-5 py-3 font-semibold">{c.cliente}</td>
                      <td className="px-3 py-3 text-[13px] text-tinta-2">
                        {c.items.map((i, k) => <div key={k}>{i.origen === "factura" ? `Factura ${i.factura}` : i.origen === "informado" ? "Confirmado" : "Proyección"} · {i.proyecto} · {diaCorto(i.fechaRecaudo)} · {copCorto(i.netoCop)}{i.vencida ? " · vencida" : ""}{i.sinConfirmar ? " · sin confirmar" : ""}</div>)}
                      </td>
                      <td className="num px-5 py-3 text-right font-bold">{cop(c.totalCop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          </div>
        </section>

        {/* Flujo semanal */}
        <section className="space-y-3">
          <SeccionEt>Flujo de caja por semana</SeccionEt>
          {flujo.minimo && <Aja etiqueta="La semana más apretada">La del {diaLargo(flujo.minimo.semana)}: el saldo cierra en {cop(flujo.minimo.saldoFinal)}.</Aja>}
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Semana</th><th className="px-3 py-3 text-right font-medium">Recaudos</th><th className="px-3 py-3 text-right font-medium">Pagos</th><th className="px-3 py-3 text-right font-medium">Saldo final</th><th className="w-[34%] px-5 py-3 font-medium" /></tr></thead>
              <tbody>
                {flujo.filas.map((f) => (
                  <tr key={f.semana} className="border-t border-linea-2" title={f.detalleRecaudos.map((r) => `${r.cliente}: ${copCorto(r.totalCop)}${r.sinConfirmar ? " (sin confirmar)" : ""}`).join("\n")}>
                    <td className="px-5 py-2.5">{diaCorto(f.desde)} – {diaCorto(f.hasta)}</td>
                    <td className="num px-3 py-2.5 text-right text-verde-profundo">{copCorto(f.recaudos)}</td>
                    <td className="num px-3 py-2.5 text-right text-rojo">{copCorto(f.pagos)}</td>
                    <td className="num px-3 py-2.5 text-right font-bold">{copCorto(f.saldoFinal)}</td>
                    <td className="px-5 py-2.5"><div className="h-2 rounded-full bg-linea-2"><div className={`h-2 rounded-full ${flujo.minimo?.semana === f.semana ? "bg-naranja" : "[background:var(--degradado)]"}`} style={{ width: `${Math.max(2, (Math.max(0, f.saldoFinal) / maximo) * 100)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
        </section>

        {/* Pagos */}
        <section className="space-y-3">
          <SeccionEt>Pagos programados</SeccionEt>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Tarjeta className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[14px]">
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-t border-linea-2 first:border-0">
                      <td className="px-5 py-2.5 whitespace-nowrap">{diaCorto(iso(p.fecha))}</td>
                      <td className="px-3 py-2.5">{p.concepto}<div className="text-[12.5px] text-tinta-3">{p.beneficiario}{p.banco ? ` · ${p.banco.nombre}` : ""}</div></td>
                      <td className="px-3 py-2.5"><Insignia>{CATEGORIA_PAGO[p.categoria] ?? p.categoria}</Insignia></td>
                      <td className="num px-3 py-2.5 text-right">{monto(Number(p.valor), p.moneda)}{p.moneda === "USD" && <div className="text-[12px] font-normal text-tinta-3">{copCorto(aCop(Number(p.valor), "USD", d.trm))}</div>}</td>
                      <td className="px-5 py-2.5">{editar && <BotonAccion chico variante="fantasma" accion={accionMarcarPagado.bind(null, p.id)} confirmar="¿Ya salió?">Hecho</BotonAccion>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
            {editar && <FormPago />}
          </div>
        </section>
      </Contenedor>
    </>
  );
}
