import Link from "next/link";
import { Barra } from "@/components/barra";
import { BotonAccion } from "@/components/accion";
import { Cifra, Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoDocumento } from "@/components/iconos";
import { pagina } from "@/app/pagina";
import { accionDetectarDiferencias } from "@/app/acciones";
import { db } from "@/lib/db";
import { leerDatos } from "@/lib/datos";
import { aCop, diferenciasMes, recaudosEsperados, suma, UMBRAL } from "@/lib/finanzas";
import { cop, monto, montoCorto, pct } from "@/lib/formato";
import { dia, diaLargo, MesAnio, mesDe, nombreMesAnio } from "@/lib/fechas";
import { ESTADO_JUSTIFICACION } from "@/lib/etiquetas";
import { TarjetaJustificacion } from "./justificacion";

export const dynamic = "force-dynamic";

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const u = await pagina("ver.facturacion");
  const d = await leerDatos();
  const meses = [...new Set(d.proyecciones.map((p) => p.mes))].sort();
  const mesHoy = mesDe(d.hoy);
  const { mes: q } = await searchParams;
  const porDefecto = meses.filter((m) => m < mesHoy).at(-1) ?? mesHoy;
  const mes = q && /^\d{4}-\d{2}$/.test(q) ? `${q}-01` : porDefecto;
  const cerrado = mes < mesHoy;

  const filas = diferenciasMes(d, mes);
  const [justificaciones, clientes] = await Promise.all([
    db.justificacion.findMany({ where: { mes: dia(mes) }, include: { proyecto: true }, orderBy: { createdAt: "asc" } }),
    db.cliente.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  const jDe = new Map(justificaciones.map((j) => [j.proyectoId, j]));
  const pro = new Map(d.proyectos.map((p) => [p.id, p]));
  const total = (f: (x: (typeof filas)[number]) => number | null) => suma(filas, (x) => aCop(f(x) ?? 0, x.moneda, d.trm));
  const cartera = recaudosEsperados(d, "facturado");

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <Encabezado
          et="Facturación y cartera"
          titulo={`Proyectado, informado y real · ${nombreMesAnio(mes)}`}
          bajada={`Lo proyectado sale de la proyección trimestral; lo informado, de lo que confirmó cada proyecto con el agente; lo real, del exporte de SAP. En un mes cerrado, una diferencia contra lo informado de más del ${UMBRAL.pct} % (y de más de ${cop(UMBRAL.COP)}) se justifica ante la interventoría.`}
          acciones={cerrado && u.puede("justificaciones.redactar") ? <BotonAccion accion={accionDetectarDiferencias.bind(null, mes)} variante="primario" resumen="diferencias">Buscar diferencias y redactar</BotonAccion> : undefined}
        />

        <div className="flex flex-wrap gap-2 text-[13px]">
          {meses.map((m) => <Link key={m} href={`/facturacion?mes=${m.slice(0, 7)}`} className={`rounded-full border px-3 py-1 ${m === mes ? "border-verde bg-verde-suave font-semibold text-verde-profundo" : "border-linea bg-papel text-tinta-2 hover:border-[#cfd8d1]"}`}>{MesAnio(m)}{m < mesHoy ? " · cerrado" : m === mesHoy ? " · en curso" : ""}</Link>)}
        </div>

        <Tarjeta className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra valor={cop(total((x) => x.proyectado))} rotulo="Proyectado" nota="en pesos, con la TRM del día para Bayside" />
          <Cifra valor={cop(total((x) => x.informado))} rotulo="Informado por los proyectos" nota={`${filas.filter((x) => x.informado !== null).length} de ${filas.length} proyectos han informado`} />
          <Cifra valor={cop(total((x) => x.real))} rotulo={cerrado ? "Facturado en SAP" : "Facturado hasta hoy"} />
          <Cifra valor={filas.filter((x) => x.requiereJustificacion).length} rotulo="Diferencias por justificar" nota={cerrado ? "pasan el umbral" : "el mes no ha cerrado"} />
        </Tarjeta>

        {justificaciones.length > 0 && (
          <section className="space-y-3">
            <SeccionEt>Justificaciones ante la interventoría</SeccionEt>
            {justificaciones.map((j) => (
              <TarjetaJustificacion key={j.id} j={{ id: j.id, proyecto: j.proyecto.nombre, proyectoId: j.proyectoId, estado: j.estado, texto: j.texto, verificada: j.verificada, observacion: j.observacion, aprobadaPor: j.aprobadaPor, aprobadaEn: j.aprobadaEn?.toISOString() ?? null, informado: monto(Number(j.informado), j.proyecto.moneda), real: monto(Number(j.real), j.proyecto.moneda), diferencia: monto(Number(j.diferencia), j.proyecto.moneda) }} puedeAprobar={u.puede("justificaciones.aprobar")} />
            ))}
          </section>
        )}

        <section className="space-y-3">
          <SeccionEt>Por cliente</SeccionEt>
          {!filas.length ? <Vacio icono={<IconoDocumento className="size-5" />} titulo="No hay proyección para este mes" /> : (
            <Tarjeta className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-tinta-3">
                    <th className="px-5 py-3 font-medium">Proyecto</th>
                    <th className="px-3 py-3 text-right font-medium">Proyectado</th>
                    <th className="px-3 py-3 text-right font-medium">Informado</th>
                    <th className="px-3 py-3 text-right font-medium">Real (SAP)</th>
                    <th className="px-3 py-3 text-right font-medium">Real − informado</th>
                    <th className="px-3 py-3 text-right font-medium">% de lo informado</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                {clientes.map((c) => {
                  const fs = filas.filter((f) => pro.get(f.proyectoId)?.clienteId === c.id);
                  if (!fs.length) return null;
                  return (
                    <tbody key={c.id}>
                      <tr className="border-t border-linea bg-fondo">
                        <td colSpan={7} className="px-5 py-2.5">
                          <span className="font-display text-[13.5px] font-bold">{c.nombre}</span>
                          <span className="ml-2 text-[12.5px] text-tinta-3">{c.tipo === "publico" ? "Público" : "Privado"} · {c.esquemaIva} · ReteIVA {c.reteIvaPct} % · ReteICA {c.reteIcaPorMil.toLocaleString("es-CO")} ‰{c.contribucionPct ? ` · contribución ${c.contribucionPct} %` : ""}{c.garantiaPct ? ` · garantía ${c.garantiaPct} %` : ""}{c.anticipoPct ? ` · anticipo ${c.anticipoPct} %` : ""} · paga a {c.diasPago} días</span>
                        </td>
                      </tr>
                      {fs.map((f) => {
                        const j = jDe.get(f.proyectoId);
                        return (
                          <tr key={f.proyectoId} className="border-t border-linea-2 align-top">
                            <td className="px-5 py-3"><Link href={`/proyectos/${f.proyectoId}`} className="font-semibold hover:text-verde-profundo">{f.proyecto}</Link><div className="font-mono text-[11.5px] text-tinta-3">{f.codigo}</div></td>
                            <td className="num px-3 py-3 text-right">{montoCorto(f.proyectado, f.moneda)}</td>
                            <td className="num px-3 py-3 text-right">{f.informado === null ? <span className="text-tinta-3">—</span> : montoCorto(f.informado, f.moneda)}</td>
                            <td className="num px-3 py-3 text-right">{montoCorto(f.real, f.moneda)}</td>
                            <td className={`num px-3 py-3 text-right ${f.requiereJustificacion ? "text-rojo" : ""}`}>{f.difInformado === null ? "—" : montoCorto(f.difInformado, f.moneda)}</td>
                            <td className="num px-3 py-3 text-right">{pct(f.pctInformado, 1)}</td>
                            <td className="px-5 py-3">
                              {j ? <Insignia tono={ESTADO_JUSTIFICACION[j.estado].tono} punto>{ESTADO_JUSTIFICACION[j.estado].etiqueta}</Insignia>
                                : f.requiereJustificacion ? <Insignia tono="rojo" punto>Por justificar</Insignia>
                                : !cerrado ? <Insignia>En curso</Insignia>
                                : <Insignia tono="verde">Cuadra</Insignia>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </Tarjeta>
          )}
        </section>

        <section className="space-y-3">
          <SeccionEt>Cartera por cobrar</SeccionEt>
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Factura</th><th className="px-3 py-3 font-medium">Cliente · proyecto</th><th className="px-3 py-3 text-right font-medium">Antes de IVA</th><th className="px-3 py-3 text-right font-medium">Neto a recibir</th><th className="px-5 py-3 font-medium">Se espera</th></tr></thead>
              <tbody>
                {cartera.map((r) => (
                  <tr key={r.factura} className="border-t border-linea-2">
                    <td className="px-5 py-2.5 font-mono text-[12.5px]">{r.factura}<div className="font-sans text-[12px] text-tinta-3">{diaLargo(r.fechaFactura)}</div></td>
                    <td className="px-3 py-2.5">{r.cliente}<div className="text-[12.5px] text-tinta-3">{r.proyecto}</div></td>
                    <td className="num px-3 py-2.5 text-right">{montoCorto(r.base, r.moneda)}</td>
                    <td className="num px-3 py-2.5 text-right" title={`IVA ${r.liquidacion.iva} − ReteIVA ${r.liquidacion.reteIva} − ReteICA ${r.liquidacion.reteIca} − contribución ${r.liquidacion.contribucion} − garantía ${r.liquidacion.garantia} − anticipo ${r.liquidacion.anticipo}`}>{montoCorto(r.neto, r.moneda)}</td>
                    <td className="px-5 py-2.5">{diaLargo(r.fechaRecaudo)} {r.vencida && <Insignia tono="rojo">Vencida</Insignia>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
          <p className="text-[12.5px] text-tinta-3">El neto lo calcula el código con las condiciones de cada cliente (pasa el cursor sobre el valor para ver el detalle). Una factura vencida se espera 10 días después del último corte de saldos. Última TRM: {d.trm.toLocaleString("es-CO")} ({d.trmFecha ? diaLargo(d.trmFecha) : "sin fecha"}).</p>
        </section>
      </Contenedor>
    </>
  );
}
