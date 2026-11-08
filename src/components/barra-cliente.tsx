"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Marca, Contenedor } from "./ui";
import { accionSalir } from "@/app/acceso";
import type { Permiso } from "@/lib/auth/permisos";

// El menú vive aquí y en ningún otro sitio. Cada entrada dice qué permiso hace falta para verla.
export const NAV: { href: string; etiqueta: string; permiso: Permiso }[] = [
  { href: "/", etiqueta: "Inicio", permiso: "ver.inicio" },
  { href: "/confirmaciones", etiqueta: "Confirmaciones", permiso: "ver.facturacion" },
  { href: "/facturacion", etiqueta: "Facturación", permiso: "ver.facturacion" },
  { href: "/caja", etiqueta: "Caja", permiso: "ver.caja" },
  { href: "/conversar", etiqueta: "Conversar", permiso: "conversar" },
  { href: "/junta", etiqueta: "Junta", permiso: "ver.junta" },
  { href: "/datos", etiqueta: "Datos", permiso: "ver.facturacion" },
  { href: "/usuarios", etiqueta: "Usuarios", permiso: "usuarios.administrar" },
];

export function BarraCliente({ agenteActivo = true, children, usuario, visibles }: { agenteActivo?: boolean; children?: ReactNode; usuario: { nombre: string; rol: string } | null; visibles: string[] }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href) || (href === "/facturacion" && ruta.startsWith("/proyectos")));
  const inicio = visibles.includes("/") ? "/" : visibles[0] ?? "/";

  return (
    <header className="banda print:hidden">
      <Contenedor className="flex flex-wrap items-center justify-between gap-4 pt-5">
        <Link href={inicio} aria-label="Inicio">
          <Marca compacta />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/[.06] px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 sm:flex">
            {agenteActivo ? <span className="punto-vivo" /> : <span className="size-2 rounded-full bg-white/30" />}
            {agenteActivo ? "Agente activo" : "Agente en pausa"}
          </div>
          {usuario && (
            <div className="flex items-center gap-1">
              <Link href="/cuenta" className="rounded-ctl px-2.5 py-1.5 text-right leading-tight hover:bg-white/[.06]">
                <div className="text-[13px] font-semibold text-white">{usuario.nombre}</div>
                <div className="text-[11.5px] text-white/55">{usuario.rol}</div>
              </Link>
              <form action={accionSalir}>
                <button type="submit" className="rounded-ctl px-2.5 py-2 font-display text-[12.5px] font-semibold text-white/60 hover:bg-white/[.06] hover:text-white">Salir</button>
              </form>
            </div>
          )}
        </div>
      </Contenedor>
      <Contenedor>
        <nav className={"mt-5 flex gap-1 overflow-x-auto " + (children ? "border-b border-white/10" : "pb-[3px]")} aria-label="Principal">
          {NAV.filter((n) => visibles.includes(n.href)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                "relative whitespace-nowrap px-3.5 py-3 font-display text-[14px] font-semibold transition-colors " +
                (activo(n.href) ? "text-white" : "text-white/55 hover:text-white/85")
              }
            >
              {n.etiqueta}
              {activo(n.href) && <span className="absolute inset-x-3.5 bottom-0 h-[2px] rounded-t-full bg-oro" />}
            </Link>
          ))}
        </nav>
      </Contenedor>
      {children}
    </header>
  );
}
