"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Boton, Tarjeta } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { IconoAgente, IconoAlerta, IconoCheck, IconoPersona } from "@/components/iconos";
import { accionPreguntar } from "@/app/acciones";

export type Turno = { id: string; pregunta: string; respuesta: string; sinVerificar: string[]; ms: number; llamadas: { nombre: string; entrada: unknown; error: string | null }[] };

const NOMBRE: Record<string, string> = {
  disponible_en_fecha: "Disponible a una fecha", flujo_de_caja_semanal: "Flujo de caja semanal", descuadre_del_mes: "Descuadre del mes",
  diferencias_de_facturacion: "Diferencias de facturación", confirmaciones_de_la_semana: "Confirmaciones de la semana", saldos_bancarios: "Saldos bancarios",
  pagos_programados: "Pagos programados", cartera_pendiente: "Cartera pendiente", proyectos: "Proyectos", condiciones_de_clientes: "Condiciones de clientes",
};

const entrada = (e: unknown) => Object.values((e ?? {}) as Record<string, unknown>).filter((v) => v !== null && v !== "").join(" · ");

export function Chat({ turnosIniciales, ejemplos }: { turnosIniciales: Turno[]; ejemplos: string[] }) {
  const [turnos, setTurnos] = useState(turnosIniciales);
  const [texto, setTexto] = useState("");
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turnos.length, enCurso]);

  const enviar = (p: string) => {
    const pregunta = p.trim();
    if (!pregunta || pendiente) return;
    setTexto(""); setErr(null); setEnCurso(pregunta);
    empezar(async () => {
      try {
        const r = await accionPreguntar(pregunta);
        setTurnos((t) => [...t, { id: r.id, pregunta, respuesta: r.respuesta, sinVerificar: r.sinVerificar, ms: r.ms, llamadas: r.llamadas }]);
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setTexto(pregunta); }
      setEnCurso(null);
    });
  };

  return (
    <div className="space-y-5">
      {!turnos.length && !enCurso && (
        <div className="flex flex-wrap gap-2">
          {ejemplos.map((e) => <button key={e} type="button" onClick={() => enviar(e)} className="rounded-full border border-linea bg-papel px-3.5 py-2 text-left text-[13.5px] text-tinta-2 hover:border-verde hover:text-verde-profundo">{e}</button>)}
        </div>
      )}
      {turnos.map((t) => (
        <div key={t.id} className="space-y-3">
          <div className="flex justify-end gap-3"><p className="m-0 max-w-[720px] rounded-sup bg-verde-suave px-4 py-3 text-[14.5px] text-verde-profundo">{t.pregunta}</p><span className="grid size-8 shrink-0 place-items-center rounded-full bg-verde-suave text-verde-profundo"><IconoPersona className="size-4" /></span></div>
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-noche-2 text-oro"><IconoAgente className="size-4" /></span>
            <Tarjeta className="min-w-0 max-w-[880px] flex-1 px-5 py-3">
              <Markdown texto={t.respuesta} />
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-dashed border-linea pt-3 text-[12px] text-tinta-3">
                {t.llamadas.length ? <span>Consultó:</span> : <span>No consultó herramientas</span>}
                {t.llamadas.map((l, i) => <span key={i} title={JSON.stringify(l.entrada)} className={`rounded-full border px-2 py-0.5 ${l.error ? "border-rojo/40 text-rojo" : "border-linea"}`}>{NOMBRE[l.nombre] ?? l.nombre}{entrada(l.entrada) ? ` · ${entrada(l.entrada)}` : ""}</span>)}
                {t.sinVerificar.length
                  ? <span className="inline-flex items-center gap-1 text-rojo"><IconoAlerta className="size-3.5" />Cifras que no salieron de una herramienta: {t.sinVerificar.join(", ")}</span>
                  : t.llamadas.length ? <span className="inline-flex items-center gap-1 text-verde-profundo"><IconoCheck className="size-3.5" />Todas las cifras salen de las herramientas</span> : null}
                <span className="ml-auto">{(t.ms / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} s</span>
              </div>
            </Tarjeta>
          </div>
        </div>
      ))}
      {enCurso && (
        <div className="space-y-3">
          <div className="flex justify-end"><p className="m-0 max-w-[720px] rounded-sup bg-verde-suave px-4 py-3 text-[14.5px] text-verde-profundo">{enCurso}</p></div>
          <div className="flex items-center gap-3 text-[13.5px] text-tinta-3"><span className="punto-vivo" />Consultando la base y haciendo las cuentas…</div>
        </div>
      )}
      <div ref={fin} />
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="sticky bottom-4 flex gap-2 rounded-sup border border-linea bg-papel p-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Pregunta" className="h-11 min-w-0 flex-1 rounded-ctl bg-fondo px-3 text-[15px] outline-none focus:ring-2 focus:ring-verde/30" />
        <Boton type="submit" variante="primario" disabled={pendiente || !texto.trim()}>{pendiente ? "Pensando…" : "Preguntar"}</Boton>
      </form>
      {err && <p role="alert" className="text-[13px] text-rojo">{err}</p>}
    </div>
  );
}
