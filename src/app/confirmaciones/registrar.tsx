"use client";
// Registrar a mano lo informado: cuando el agente no pudo (una pregunta, un valor ilegible) o el residente
// contestó por teléfono.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui";
import { accionRegistrarAMano } from "@/app/acciones";

const campo = "h-8 rounded-ctl border border-linea bg-fondo px-2 text-[13px] outline-none focus:border-verde";

export function RegistrarAMano({ id }: { id: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"confirmada" | "ajustada" | "no_factura">("confirmada");
  const [valor, setValor] = useState(""), [fecha, setFecha] = useState(""), [nota, setNota] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="font-display text-[12.5px] font-semibold text-verde-profundo hover:underline">Registrar a mano</button>;
  return (
    <div className="space-y-2 rounded-ctl border border-linea bg-fondo p-3">
      <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className={campo}>
        <option value="confirmada">Confirmó lo preguntado</option>
        <option value="ajustada">Ajustó</option>
        <option value="no_factura">No factura este mes</option>
      </select>
      {estado === "ajustada" && <input placeholder="Valor, ej. $1.200 millones" value={valor} onChange={(e) => setValor(e.target.value)} className={`${campo} w-full`} />}
      {estado !== "no_factura" && <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />}
      <input placeholder="Lo que dijo (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} className={`${campo} w-full`} />
      {err && <p className="m-0 text-[12.5px] text-rojo">{err}</p>}
      <div className="flex gap-2">
        <Boton chico variante="primario" disabled={pendiente} onClick={() => empezar(async () => { setErr(null); try { await accionRegistrarAMano(id, estado, valor, fecha, nota); setAbierto(false); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } })}>Registrar</Boton>
        <Boton chico variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </div>
    </div>
  );
}
