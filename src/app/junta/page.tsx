import Link from "next/link";
import { Barra } from "@/components/barra";
import { Contenedor, Encaje, Insignia, Marca, SeccionEt, Tarjeta } from "@/components/ui";
import { pagina } from "@/app/pagina";
import { leerDatos } from "@/lib/datos";
import { estadoDeProyectos } from "@/lib/junta";
import { saldosAlCorte, suma } from "@/lib/finanzas";
import { cop, copCorto, monto, montoCorto, pct } from "@/lib/formato";
import { diaCorto, diaLargo, MesAnio, mesDe, sumarMeses } from "@/lib/fechas";
import { LINEA } from "@/lib/etiquetas";
import { Imprimir } from "./imprimir";

export const dynamic = "force-dynamic";

export default async function Junta({ searchParams }: { searchParams: Promise<{ informe?: string }> }) {
  await pagina("ver.junta");
  const { informe: q } = await searchParams;
  const informe = q === "financiero" ? "financiero" : "junta";
  const d = await leerDatos();
  const ps = await estadoDeProyectos(d);
  const caja = saldosAlCorte(d);
  const lineas = (Object.keys(LINEA) as (keyof typeof LINEA)[]).map((l) => {
    const xs = ps.filter((p) => p.linea === l);
    return { linea: LINEA[l], n: xs.length, contrato: suma(xs, (p) => p.contratoCop), facturado: suma(xs, (p) => p.facturadoCop), avance: xs.length ? suma(xs, (p) => p.avance * p.contratoCop) / suma(xs, (p) => p.contratoCop) : 0 };
  }).filter((l) => l.n);
  const total = { contrato: suma(ps, (p) => p.contratoCop), facturado: suma(ps, (p) => p.facturadoCop) };
  const conteo = (t: string) => ps.filter((p) => p.tono === t).length;
  const mesCerrado = sumarMeses(mesDe(d.hoy), -1);

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10 print:py-0">
        <div className="hidden print:block"><Marca fondo="claro" compacta /></div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SeccionEt>{informe === "junta" ? "Informe para la junta" : "Informe para el equipo financiero"}</SeccionEt>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight">Los proyectos de Conconcreto al {diaLargo(d.hoy)}</h2>
            <p className="mt-1.5 max-w-[760px] text-[14.5px] text-tinta-2">{ps.length} proyectos activos en {lineas.length} líneas de negocio, en Colombia y Estados Unidos. Cifras en pesos; Bayside se convierte con la TRM de {d.trm.toLocaleString("es-CO")}. El semáforo lo pone el código con reglas a la vista al pie.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link href="/junta" className={`rounded-full border px-3 py-1 text-[13px] ${informe === "junta" ? "border-verde bg-verde-suave font-semibold text-verde-profundo" : "border-linea bg-papel text-tinta-2"}`}>Junta</Link>
            <Link href="/junta?informe=financiero" className={`rounded-full border px-3 py-1 text-[13px] ${informe === "financiero" ? "border-verde bg-verde-suave font-semibold text-verde-profundo" : "border-linea bg-papel text-tinta-2"}`}>Equipo financiero</Link>
            <Imprimir />
          </div>
        </div>

        <Tarjeta className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4 print:break-inside-avoid">
          <div><div className="num text-[26px] font-extrabold">{copCorto(total.contrato)}</div><div className="text-[13px] text-tinta-2">Valor de los contratos</div></div>
          <div><div className="num text-[26px] font-extrabold">{copCorto(total.facturado)}</div><div className="text-[13px] text-tinta-2">Facturado acumulado · {pct((total.facturado / total.contrato) * 100)}</div></div>
          <div><div className="num text-[26px] font-extrabold">{copCorto(caja.totalCop)}</div><div className="text-[13px] text-tinta-2">Caja disponible al {diaCorto(caja.corte)}</div></div>
          <div className="flex items-center gap-2"><Insignia tono="verde" punto>{conteo("verde")} en orden</Insignia><Insignia tono="oro" punto>{conteo("oro")} a vigilar</Insignia><Insignia tono="rojo" punto>{conteo("rojo")} con alerta</Insignia></div>
        </Tarjeta>

        <section className="space-y-3 print:break-inside-avoid">
          <SeccionEt>Por línea de negocio</SeccionEt>
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Línea</th><th className="px-3 py-3 text-right font-medium">Proyectos</th><th className="px-3 py-3 text-right font-medium">Contratos</th><th className="px-3 py-3 text-right font-medium">Facturado</th><th className="px-5 py-3 font-medium">Avance de obra (ponderado)</th></tr></thead>
              <tbody>{lineas.map((l) => <tr key={l.linea} className="border-t border-linea-2"><td className="px-5 py-2.5 font-semibold">{l.linea}</td><td className="num px-3 py-2.5 text-right">{l.n}</td><td className="num px-3 py-2.5 text-right">{copCorto(l.contrato)}</td><td className="num px-3 py-2.5 text-right">{copCorto(l.facturado)}</td><td className="px-5 py-2.5"><Encaje valor={Math.round(l.avance)} ancho="w-32" /></td></tr>)}</tbody>
            </table>
          </Tarjeta>
        </section>

        <section className="space-y-3">
          <SeccionEt>Proyecto por proyecto</SeccionEt>
          <div className="grid gap-3 lg:grid-cols-2 print:grid-cols-2">
            {ps.map((p) => (
              <Tarjeta key={p.id} className="p-5 print:break-inside-avoid">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-[11.5px] font-bold uppercase tracking-[.08em] text-verde-profundo">{LINEA[p.linea]} · {p.ciudad}{p.pais !== "Colombia" ? `, ${p.pais}` : ""}</div>
                    <h3 className="mt-1 text-[16.5px] font-bold leading-snug">{p.nombre}</h3>
                    <p className="m-0 text-[13px] text-tinta-3">{p.cliente} · {p.director}</p>
                  </div>
                  <Insignia tono={p.tono} punto>{p.tono === "verde" ? "En orden" : p.tono === "oro" ? "A vigilar" : "Alerta"}</Insignia>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
                  <div><div className="text-tinta-3">Contrato</div><div className="num font-bold">{montoCorto(p.contrato, p.moneda)}</div></div>
                  <div><div className="text-tinta-3">Facturado</div><div className="num font-bold">{pct(p.pctFacturado)}</div></div>
                  <div><div className="text-tinta-3">Avance de obra</div><Encaje valor={Math.round(p.avance)} ancho="w-16" /></div>
                </div>
                {informe === "financiero" && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-dashed border-linea pt-3 text-[12.5px]">
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">Trimestre: proyectado</dt><dd className="num m-0">{montoCorto(p.proyTrim, p.moneda)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">facturado</dt><dd className="num m-0">{montoCorto(p.realTrim, p.moneda)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">Mes: proyectado</dt><dd className="num m-0">{montoCorto(p.proyMes, p.moneda)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">informado</dt><dd className="num m-0">{p.informadoMes === null ? "sin confirmar" : montoCorto(p.informadoMes, p.moneda)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">Cartera neta</dt><dd className="num m-0">{montoCorto(p.cartera, p.moneda)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-tinta-3">vencida</dt><dd className={`num m-0 ${p.carteraVencida ? "text-rojo" : ""}`}>{montoCorto(p.carteraVencida, p.moneda)}</dd></div>
                    <div className="col-span-2 flex justify-between gap-2"><dt className="text-tinta-3">{MesAnio(mesCerrado)}: real − informado</dt><dd className="num m-0">{p.difMesCerrado === null ? "—" : monto(p.difMesCerrado, p.moneda)}{p.justificacion ? ` · justificación ${p.justificacion === "aprobada" ? "aprobada" : "por aprobar"}` : ""}</dd></div>
                  </dl>
                )}
                {p.hitos.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-dashed border-linea pl-0 pt-3 text-[13px]">
                    {p.hitos.map((h) => <li key={h.nombre} className="flex list-none justify-between gap-3"><span className={h.vencido ? "text-rojo" : "text-tinta-2"}>{h.nombre}{h.financiero ? " · factura" : ""}</span><span className="tabular whitespace-nowrap text-tinta-3">{diaCorto(h.fecha)}</span></li>)}
                  </ul>
                )}
                {p.razones.length > 0 && <p className="mb-0 mt-3 text-[12.5px] text-tinta-3">{p.razones.map((r) => r.texto).join(" · ")}</p>}
              </Tarjeta>
            ))}
          </div>
        </section>

        <p className="text-[12px] text-tinta-3 print:break-inside-avoid">
          Cómo se pone el semáforo: <b>alerta</b> si hay un hito vencido sin cumplir, una diferencia del mes cerrado sin justificación aprobada o el proyecto informó que no factura este mes; <b>a vigilar</b> si no ha confirmado la facturación de esta semana, si la ajustó a la baja más del 10 %, si el avance de obra le lleva más de 8 puntos a lo facturado o si tiene cartera vencida. Datos de demostración. Total facturado en pesos: {cop(total.facturado)}.
        </p>
      </Contenedor>
    </>
  );
}
