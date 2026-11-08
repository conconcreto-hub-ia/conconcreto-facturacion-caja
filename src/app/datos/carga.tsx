"use client";
import { useActionState } from "react";
import { Boton, Tarjeta } from "@/components/ui";
import { IconoSubir } from "@/components/iconos";
import { accionCargar } from "@/app/acciones";

export function FormCarga({ tipo, titulo, detalle }: { tipo: "proyeccion" | "sap"; titulo: string; detalle: string }) {
  const [estado, accion, pendiente] = useActionState(accionCargar, {});
  return (
    <Tarjeta className="p-5">
      <h3 className="text-[16px] font-bold">{titulo}</h3>
      <p className="mt-1 text-[13px] text-tinta-2">{detalle}</p>
      <form action={accion} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="file" name="archivo" accept=".xlsx" required className="min-w-0 flex-1 text-[13px] file:mr-3 file:h-9 file:rounded-ctl file:border file:border-linea file:bg-fondo file:px-3 file:font-display file:text-[13px] file:font-semibold" />
        <Boton type="submit" variante="primario" chico disabled={pendiente}><IconoSubir />{pendiente ? "Cargando…" : "Cargar"}</Boton>
      </form>
      {estado.error && <p className="mt-2 text-[12.5px] text-rojo">{estado.error}</p>}
      {estado.ok && <p className="mt-2 text-[12.5px] text-verde-profundo">{estado.ok}</p>}
      {estado.avisos && estado.avisos.length > 0 && <ul className="mt-1 space-y-0.5 pl-4 text-[12px] text-[#8a5a00]">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>}
    </Tarjeta>
  );
}
