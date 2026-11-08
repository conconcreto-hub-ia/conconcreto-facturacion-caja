import Link from "next/link";
import { Barra } from "@/components/barra";
import { BotonAccion } from "@/components/accion";
import { Aja, Cifra, Contenedor, Encabezado, Insignia, Tarjeta, Vacio } from "@/components/ui";
import { IconoCorreo } from "@/components/iconos";
import { pagina } from "@/app/pagina";
import { accionEnviarRonda, accionRecordar, accionRevisarBuzon } from "@/app/acciones";
import { db } from "@/lib/db";
import { monto, haceCuanto } from "@/lib/formato";
import { dia, diaLargo, hoyBogota, iso, mesDe, nombreMes, semanaDeRonda } from "@/lib/fechas";
import { ESTADO_CONFIRMACION, RESPONDIDAS } from "@/lib/etiquetas";
import { MAX_RECORDATORIOS } from "@/lib/confirmaciones";
import { RegistrarAMano } from "./registrar";

export const dynamic = "force-dynamic";

export default async function Confirmaciones({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const u = await pagina("ver.facturacion");
  const actual = semanaDeRonda(hoyBogota());
  const { semana: q } = await searchParams;
  const semana = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : actual;
  const [proyectos, confs, semanas] = await Promise.all([
    db.proyecto.findMany({ where: { activo: true }, orderBy: { codigo: "asc" }, include: { cliente: true } }),
    db.confirmacion.findMany({ where: { semana: dia(semana) } }),
    db.confirmacion.findMany({ distinct: ["semana"], select: { semana: true }, orderBy: { semana: "desc" }, take: 6 }),
  ]);
  const de = new Map(confs.map((c) => [c.proyectoId, c]));
  const n = (f: (c: (typeof confs)[number]) => boolean) => confs.filter(f).length;
  const respondieron = n((c) => RESPONDIDAS.includes(c.estado));
  const esperando = n((c) => c.estado === "enviada" || c.estado === "recordada");
  const revisar = n((c) => c.estado === "por_revisar");
  const mes = confs[0] ? iso(confs[0].mes) : mesDe(semana);
  const puedeEnviar = u.puede("confirmaciones.enviar");

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <Encabezado
          et="Lo informado"
          titulo={`Confirmaciones de la semana del ${diaLargo(semana)}`}
          bajada={`Cada lunes el agente le pregunta a cada residente lo que factura en ${nombreMes(mes)}, lee la respuesta y la registra. A quien no contesta le recuerda en el mismo hilo (máximo ${MAX_RECORDATORIOS} veces). Lo que escriben es un dato: el agente no obedece instrucciones que vengan en un correo.`}
          acciones={puedeEnviar && semana === actual ? (
            <div className="flex flex-wrap items-start gap-2">
              <BotonAccion accion={accionEnviarRonda} variante="primario" resumen="ronda">Enviar la ronda</BotonAccion>
              <BotonAccion accion={accionRevisarBuzon} resumen="buzon">Revisar el buzón</BotonAccion>
              <BotonAccion accion={accionRecordar} resumen="recordatorios" confirmar={`Recordar a ${esperando}`}>Recordar a quien no contestó</BotonAccion>
            </div>
          ) : undefined}
        />

        {semanas.length > 1 && (
          <div className="flex flex-wrap gap-2 text-[13px]">
            {semanas.map((s) => { const v = iso(s.semana); return <Link key={v} href={v === actual ? "/confirmaciones" : `/confirmaciones?semana=${v}`} className={`rounded-full border px-3 py-1 ${v === semana ? "border-verde bg-verde-suave font-semibold text-verde-profundo" : "border-linea bg-papel text-tinta-2 hover:border-[#cfd8d1]"}`}>Semana del {diaLargo(v)}</Link>; })}
          </div>
        )}

        {!confs.length ? (
          <Vacio icono={<IconoCorreo className="size-5" />} titulo="La ronda de esta semana no ha salido">
            {puedeEnviar ? "Con «Enviar la ronda», el agente le escribe a cada residente con lo proyectado para el mes." : "Sale el lunes temprano, o cuando facturación la envíe."}
          </Vacio>
        ) : (
          <>
            <Tarjeta className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Cifra valor={`${respondieron} de ${proyectos.length}`} rotulo="Ya confirmaron" nota={`${n((c) => c.estado === "ajustada")} ajustaron · ${n((c) => c.estado === "no_factura")} no facturan`} />
              <Cifra valor={esperando} rotulo="Esperando respuesta" nota={`${n((c) => c.recordatorios > 0 && (c.estado === "enviada" || c.estado === "recordada"))} ya con recordatorio`} />
              <Cifra valor={revisar} rotulo="Por revisar" nota="lo que el agente no pudo registrar solo" />
              <Cifra valor={n((c) => c.estado === "borrador")} rotulo="En borrador" nota="correo del residente no habilitado (modo prueba)" />
            </Tarjeta>
            {respondieron > 0 && respondieron < proyectos.length && (
              <Aja>Faltan {proyectos.length - respondieron}: {proyectos.filter((p) => !RESPONDIDAS.includes(de.get(p.id)?.estado ?? "borrador")).map((p) => p.nombre).join(", ")}. En la caja, lo de ellos se cuenta con su proyección y se marca «sin confirmar».</Aja>
            )}
            <Tarjeta className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-tinta-3">
                    <th className="px-5 py-3 font-medium">Proyecto</th>
                    <th className="px-3 py-3 font-medium">Lo preguntado</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Lo informado</th>
                    <th className="px-5 py-3 font-medium">Lo que dijo</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((p) => {
                    const c = de.get(p.id);
                    const est = c ? ESTADO_CONFIRMACION[c.estado] : null;
                    return (
                      <tr key={p.id} className="border-t border-linea-2 align-top">
                        <td className="px-5 py-3">
                          <Link href={`/proyectos/${p.id}`} className="font-semibold hover:text-verde-profundo">{p.nombre}</Link>
                          <div className="text-[12.5px] text-tinta-3">{p.residenteNombre} · {p.cliente.nombre}</div>
                        </td>
                        <td className="px-3 py-3 tabular">
                          {c ? <>{monto(Number(c.valorPreguntado), p.moneda)}<div className="text-[12.5px] text-tinta-3">{c.fechaPreguntada ? `radicar el ${diaLargo(iso(c.fechaPreguntada))}` : ""}{Number(c.facturadoAntes) > 0 ? ` · ya facturado ${monto(Number(c.facturadoAntes), p.moneda)}` : ""}</div></> : <span className="text-tinta-3">Sin pregunta</span>}
                        </td>
                        <td className="px-3 py-3">
                          {est ? <Insignia tono={est.tono} punto>{est.etiqueta}</Insignia> : <Insignia>Sin pregunta</Insignia>}
                          {c && c.recordatorios > 0 && <div className="mt-1 text-[12px] text-tinta-3">{c.recordatorios} {c.recordatorios === 1 ? "recordatorio" : "recordatorios"}</div>}
                          {c?.respondidaEn && <div className="mt-1 text-[12px] text-tinta-3">respondió {haceCuanto(c.respondidaEn)}</div>}
                        </td>
                        <td className="px-3 py-3 tabular">
                          {c?.valorInformado !== null && c?.valorInformado !== undefined ? <>{c.estado === "no_factura" ? "No factura" : monto(Number(c.valorInformado), p.moneda)}<div className="text-[12.5px] text-tinta-3">{c.fechaInformada && c.estado !== "no_factura" ? `radica el ${diaLargo(iso(c.fechaInformada))}` : ""}{c.fechaInformada && c.estado !== "no_factura" && mesDe(iso(c.fechaInformada)) > iso(c.mes) ? " · pasa al otro mes" : ""}</div></> : <span className="text-tinta-3">—</span>}
                        </td>
                        <td className="px-5 py-3 text-[13.5px] text-tinta-2">
                          {c?.explicacion ? <span>«{c.explicacion}»</span> : <span className="text-tinta-3">—</span>}
                          {c && (c.estado === "por_revisar" || c.estado === "enviada" || c.estado === "recordada") && u.puede("confirmaciones.registrar") && <div className="mt-2"><RegistrarAMano id={c.id} /></div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Tarjeta>
          </>
        )}
      </Contenedor>
    </>
  );
}
