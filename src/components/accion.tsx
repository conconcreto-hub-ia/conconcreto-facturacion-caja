"use client";
// Un botón que llama una acción de servidor, muestra que está trabajando, el resultado y el error.
// La acción llega desde una página de servidor: tiene que ser una acción de servidor (o `.bind(null, id)` de una).
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "./ui";

type R = Record<string, unknown>;
const RESUMEN = {
  ronda: (r: R) => `Enviadas: ${r.enviadas}.${(r.borradores as string[]).length ? ` En borrador (correo no habilitado): ${(r.borradores as string[]).length}.` : ""}${(r.yaEstaban as string[]).length ? ` Ya tenían pregunta esta semana: ${(r.yaEstaban as string[]).length}.` : ""}`,
  recordatorios: (r: R) => (r.enviados ? `Recordatorios enviados: ${r.enviados}.` : "No había a quién recordarle."),
  buzon: (r: R) => `Correos nuevos: ${r.nuevos} · respuestas registradas: ${r.respuestas}${r.ignorados ? ` · sin relación: ${r.ignorados}` : ""}${(r.errores as string[]).length ? ` · con error: ${(r.errores as string[]).length}` : ""}.`,
  diferencias: (r: R) => `Diferencias que pasan el umbral: ${r.conDiferencia} · redactadas ahora: ${(r.redactadas as string[]).length}.`,
} as const;

export function BotonAccion({ accion, children, variante = "secundario", chico, resumen, confirmar }: {
  accion: () => Promise<unknown>;
  children: ReactNode;
  variante?: "primario" | "secundario" | "fantasma" | "oscuro" | "peligro";
  chico?: boolean;
  resumen?: keyof typeof RESUMEN;
  /** Si se pone, el primer clic muestra este texto y el segundo ejecuta. */
  confirmar?: string;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [armado, setArmado] = useState(false);
  const correr = () => {
    if (confirmar && !armado) { setArmado(true); return; }
    setArmado(false);
    empezar(async () => {
      setErr(null); setMsg(null);
      try { const r = await accion(); if (resumen) setMsg(RESUMEN[resumen](r as R)); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    });
  };
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Boton variante={variante} chico={chico} disabled={pendiente} onClick={correr}>{pendiente ? "Trabajando…" : armado ? confirmar : children}</Boton>
      {msg && <p className="m-0 max-w-[420px] text-[12.5px] text-verde-profundo">{msg}</p>}
      {err && <p role="alert" className="m-0 max-w-[420px] text-[12.5px] text-rojo">{err}</p>}
    </div>
  );
}
