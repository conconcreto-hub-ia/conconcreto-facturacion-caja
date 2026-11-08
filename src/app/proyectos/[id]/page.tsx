import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { Bitacora } from "@/components/bitacora";
import { Contenedor, Dato, Encabezado, Encaje, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { pagina } from "@/app/pagina";
import { db } from "@/lib/db";
import { leerDatos } from "@/lib/datos";
import { diferenciasMes, liquidar } from "@/lib/finanzas";
import { fechaHora, monto, montoCorto, pct } from "@/lib/formato";
import { diaLargo, iso, MesAnio, nombreMesAnio } from "@/lib/fechas";
import { ESTADO_CONFIRMACION, LINEA } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

export default async function Proyecto({ params }: { params: Promise<{ id: string }> }) {
  await pagina("ver.facturacion");
  const { id } = await params;
  const p = await db.proyecto.findUnique({
    where: { id },
    include: {
      cliente: true, hitos: { orderBy: { fecha: "asc" } }, facturas: { orderBy: { fecha: "desc" } },
      confirmaciones: { orderBy: [{ semana: "desc" }] }, justificaciones: true,
      eventos: { orderBy: { createdAt: "desc" }, take: 25 }, correos: { orderBy: { recibidoEn: "desc" }, take: 20 },
    },
  });
  if (!p) notFound();
  const d = await leerDatos();
  const meses = [...new Set(d.proyecciones.filter((x) => x.proyectoId === id).map((x) => x.mes))].sort();
  const filas = meses.map((m) => ({ mes: m, ...diferenciasMes(d, m).find((x) => x.proyectoId === id)! })).filter((x) => x.proyectoId);
  const facturado = Number(p.facturadoAnterior) + p.facturas.filter((f) => !f.anulada).reduce((a, f) => a + Number(f.base), 0);
  const cli = d.clientes.find((c) => c.id === p.clienteId)!;
  const ejemplo = liquidar(p.moneda === "USD" ? 1_000_000 : 1_000_000_000, cli);

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <Encabezado et={`${LINEA[p.linea]} · ${p.codigo}`} titulo={p.nombre} bajada={`${p.cliente.nombre} · ${p.ciudad}, ${p.pais} · residente: ${p.residenteNombre} · director: ${p.director}`} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="space-y-3">
              <SeccionEt>Proyectado, informado y real</SeccionEt>
              <Tarjeta className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[14px]">
                  <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Mes</th><th className="px-3 py-3 text-right font-medium">Proyectado</th><th className="px-3 py-3 text-right font-medium">Informado</th><th className="px-3 py-3 text-right font-medium">Real (SAP)</th><th className="px-5 py-3 text-right font-medium">% de lo informado</th></tr></thead>
                  <tbody>{filas.map((f) => <tr key={f.mes} className="border-t border-linea-2"><td className="px-5 py-2.5">{MesAnio(f.mes)}</td><td className="num px-3 py-2.5 text-right">{montoCorto(f.proyectado, p.moneda)}</td><td className="num px-3 py-2.5 text-right">{f.informado === null ? "—" : montoCorto(f.informado, p.moneda)}</td><td className="num px-3 py-2.5 text-right">{montoCorto(f.real, p.moneda)}</td><td className={`num px-5 py-2.5 text-right ${f.requiereJustificacion ? "text-rojo" : ""}`}>{pct(f.pctInformado, 1)}</td></tr>)}</tbody>
                </table>
              </Tarjeta>
              {p.justificaciones.length > 0 && <p className="text-[13.5px]">Justificaciones: {p.justificaciones.map((j) => <Link key={j.id} href={`/facturacion?mes=${iso(j.mes).slice(0, 7)}`} className="text-verde-profundo hover:underline">{nombreMesAnio(iso(j.mes))} ({j.estado === "aprobada" ? "aprobada" : "por aprobar"})</Link>)}</p>}
            </section>

            <section className="space-y-3">
              <SeccionEt>Lo que ha informado</SeccionEt>
              <Tarjeta className="divide-y divide-linea-2">
                {p.confirmaciones.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-[14px]">
                    <div className="min-w-0">
                      <div className="font-semibold">Semana del {diaLargo(iso(c.semana))} · {nombreMesAnio(iso(c.mes))}</div>
                      <div className="text-[13px] text-tinta-2">Preguntado {monto(Number(c.valorPreguntado), p.moneda)}{c.valorInformado !== null ? ` · informado ${c.estado === "no_factura" ? "no factura" : monto(Number(c.valorInformado), p.moneda)}` : ""}{c.fechaInformada ? ` · radica el ${diaLargo(iso(c.fechaInformada))}` : ""}{c.origen === "carga inicial" ? " · carga inicial" : ""}</div>
                      {c.explicacion && <div className="mt-0.5 text-[13px] text-tinta-3">«{c.explicacion}»</div>}
                    </div>
                    <Insignia tono={ESTADO_CONFIRMACION[c.estado].tono} punto>{ESTADO_CONFIRMACION[c.estado].etiqueta}</Insignia>
                  </div>
                ))}
              </Tarjeta>
            </section>

            {p.correos.length > 0 && (
              <section className="space-y-3">
                <SeccionEt>Correos con el residente</SeccionEt>
                <Tarjeta className="divide-y divide-linea-2">
                  {p.correos.map((c) => (
                    <div key={c.id} className="px-5 py-3">
                      <div className="flex flex-wrap justify-between gap-2 text-[12.5px] text-tinta-3"><span>{c.direccion === "saliente" ? "El agente" : c.de} · {c.asunto}</span><span>{fechaHora(c.recibidoEn)}</span></div>
                      <p className="m-0 mt-1 whitespace-pre-line text-[13.5px] text-tinta-2">{(c.resumen ?? "").slice(0, 600)}</p>
                    </div>
                  ))}
                </Tarjeta>
              </section>
            )}

            <section className="space-y-3">
              <SeccionEt>Facturas en SAP</SeccionEt>
              <Tarjeta className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[14px]">
                  <tbody>{p.facturas.map((f) => <tr key={f.id} className="border-t border-linea-2 first:border-0 align-top"><td className="px-5 py-2.5 font-mono text-[12.5px]">{f.numero}<div className="font-sans text-[12px] text-tinta-3">{diaLargo(iso(f.fecha))}</div></td><td className="px-3 py-2.5 text-[13px] text-tinta-2">{f.texto}</td><td className="num px-3 py-2.5 text-right">{montoCorto(Number(f.base), f.moneda)}</td><td className="px-5 py-2.5">{f.pagada ? <Insignia tono="verde">Pagada</Insignia> : iso(f.fechaVencimiento) < d.hoy ? <Insignia tono="rojo">Vencida</Insignia> : <Insignia>Vence {diaLargo(iso(f.fechaVencimiento))}</Insignia>}</td></tr>)}</tbody>
                </table>
              </Tarjeta>
            </section>
          </div>

          <aside className="space-y-4">
            <Tarjeta className="p-5">
              <dl className="m-0">
                <Dato k="Contrato">{monto(Number(p.valorContrato), p.moneda)}</Dato>
                <Dato k="Facturado">{monto(facturado, p.moneda)} · {pct((facturado / Number(p.valorContrato)) * 100)}</Dato>
                <Dato k="Avance de obra"><Encaje valor={Math.round(p.avance)} /></Dato>
                <Dato k="Radica">el día {p.diaRadicacion} de cada mes</Dato>
                <Dato k="Residente">{p.residenteNombre}<div className="text-[12.5px] text-tinta-3">{p.residenteCorreo}</div></Dato>
              </dl>
            </Tarjeta>
            <Tarjeta className="p-5">
              <h3 className="text-[15px] font-bold">Por cada {monto(ejemplo.base, p.moneda)} facturados</h3>
              <dl className="m-0 mt-2 space-y-1 text-[13px]">
                {([["IVA", ejemplo.iva], ["− ReteIVA", ejemplo.reteIva], ["− ReteICA", ejemplo.reteIca], ["− Contribución obra pública", ejemplo.contribucion], ["− Retención de garantía", ejemplo.garantia], ["− Amortización del anticipo", ejemplo.anticipo]] as const).filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-tinta-2">{k}</dt><dd className="num m-0">{monto(v, p.moneda)}</dd></div>)}
                <div className="flex justify-between border-t border-linea pt-1 font-bold"><dt>Se recibe</dt><dd className="num m-0">{monto(ejemplo.neto, p.moneda)}</dd></div>
              </dl>
              <p className="mb-0 mt-2 text-[12px] text-tinta-3">{p.cliente.esquemaIva}. Paga a {p.cliente.diasPago} días. Conconcreto es autorretenedor: el cliente no le retiene en la fuente.</p>
            </Tarjeta>
            <Tarjeta className="p-5">
              <h3 className="text-[15px] font-bold">Hitos</h3>
              <ul className="mt-2 space-y-1.5 pl-0 text-[13.5px]">{p.hitos.map((h) => <li key={h.id} className="flex list-none justify-between gap-3"><span className={h.cumplido ? "text-tinta-3 line-through" : iso(h.fecha) < d.hoy ? "text-rojo" : ""}>{h.nombre}</span><span className="tabular whitespace-nowrap text-tinta-3">{diaLargo(iso(h.fecha))}</span></li>)}</ul>
            </Tarjeta>
            <Tarjeta className="p-5"><SeccionEt>Bitácora</SeccionEt><div className="mt-4"><Bitacora eventos={p.eventos} /></div></Tarjeta>
          </aside>
        </div>
      </Contenedor>
    </>
  );
}
