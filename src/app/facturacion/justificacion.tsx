"use client";
// Una justificación ante la interventoría: la redactó el agente, la aprueba (o la devuelve) facturación.
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton, Insignia, Tarjeta } from "@/components/ui";
import { IconoAlerta, IconoCheck } from "@/components/iconos";
import { accionAprobarJustificacion, accionDevolverJustificacion } from "@/app/acciones";

type J = { id: string; proyecto: string; proyectoId: string; estado: "borrador" | "aprobada" | "devuelta"; texto: string; verificada: boolean; observacion: string | null; aprobadaPor: string | null; aprobadaEn: string | null; informado: string; real: string; diferencia: string };

export function TarjetaJustificacion({ j, puedeAprobar }: { j: J; puedeAprobar: boolean }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [devolviendo, setDevolviendo] = useState(false);
  const [obs, setObs] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const correr = (fn: () => Promise<unknown>) => empezar(async () => { setErr(null); try { await fn(); setDevolviendo(false); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } });
  const [asunto, ...cuerpo] = j.texto.split("\n\n");

  return (
    <Tarjeta className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/proyectos/${j.proyectoId}`} className="font-display text-[16px] font-bold hover:text-verde-profundo">{j.proyecto}</Link>
          <Insignia tono={j.estado === "aprobada" ? "verde" : j.estado === "devuelta" ? "rojo" : "oro"} punto>{j.estado === "aprobada" ? "Aprobada" : j.estado === "devuelta" ? "Devuelta" : "Lista para aprobar"}</Insignia>
          {j.verificada ? <span className="inline-flex items-center gap-1 text-[12.5px] text-verde-profundo"><IconoCheck className="size-3.5" />Cifras verificadas contra los datos</span> : <span className="inline-flex items-center gap-1 text-[12.5px] text-rojo"><IconoAlerta className="size-3.5" />Trae cifras que no están en los datos: revísala</span>}
        </div>
        <div className="mt-3 rounded-ctl border border-linea bg-fondo p-4">
          <p className="m-0 font-display text-[14px] font-bold">{asunto}</p>
          {cuerpo.join("\n\n").split(/\n{2,}/).map((p, i) => <p key={i} className="mb-0 mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-tinta-2">{p}</p>)}
        </div>
        {j.observacion && <p className="mt-2 text-[12.5px] text-tinta-3">Se rehizo con la observación: «{j.observacion}»</p>}
      </div>
      <div className="space-y-3">
        <dl className="m-0 space-y-1.5 text-[13.5px]">
          <div className="flex justify-between gap-2"><dt className="text-tinta-3">Informado</dt><dd className="num m-0 font-bold">{j.informado}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-tinta-3">Facturado</dt><dd className="num m-0 font-bold">{j.real}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-tinta-3">Diferencia</dt><dd className="num m-0 font-bold text-rojo">{j.diferencia}</dd></div>
        </dl>
        {j.estado === "aprobada" ? (
          <p className="text-[13px] text-verde-profundo">Aprobada por {j.aprobadaPor}{j.aprobadaEn ? ` el ${new Date(j.aprobadaEn).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" })}` : ""}. El envío a la interventoría lo hace facturación.</p>
        ) : puedeAprobar ? (
          <div className="space-y-2">
            <Boton variante="primario" className="w-full" disabled={pendiente} onClick={() => correr(() => accionAprobarJustificacion(j.id))}>{pendiente ? "Guardando…" : "Aprobar"}</Boton>
            {devolviendo ? (
              <div className="space-y-2">
                <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="¿Qué hay que cambiar?" className="w-full rounded-ctl border border-linea bg-fondo p-2 text-[13px] outline-none focus:border-verde" />
                <Boton chico className="w-full" disabled={pendiente} onClick={() => correr(() => accionDevolverJustificacion(j.id, obs))}>{pendiente ? "El agente la rehace…" : "Devolver y rehacer"}</Boton>
              </div>
            ) : <Boton variante="fantasma" className="w-full" onClick={() => setDevolviendo(true)}>Devolver con una observación</Boton>}
          </div>
        ) : <p className="text-[13px] text-tinta-3">La aprueba facturación.</p>}
        {err && <p role="alert" className="text-[12.5px] text-rojo">{err}</p>}
      </div>
    </Tarjeta>
  );
}
