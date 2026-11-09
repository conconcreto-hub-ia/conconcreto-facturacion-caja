// El menú de esta app: vive aquí y en ningún otro sitio. La barra lateral (barra-cliente.tsx) es la misma
// en las cuatro apps; lo que cambia es esto.
import type { IconoMenu } from "./iconos-menu";
import type { Permiso } from "@/lib/auth/permisos";

export const APP = { nombre: "Facturación y caja", descripcion: "Lo proyectado, lo informado y lo facturado, junto a la caja" };

// OJO: no va en barra-cliente.tsx: un valor exportado desde un módulo "use client" llega al servidor como una
// referencia de cliente, no como el arreglo (NAV.filter no existe allá). barra.tsx lo filtra por permisos.
export type ItemNav = { href: string; etiqueta: string; icono: IconoMenu; permiso: Permiso; soloAdmin?: boolean; tambien?: string[] };

export const NAV: ItemNav[] = [
  { href: "/", etiqueta: "Inicio", icono: "inicio", permiso: "ver.inicio" },
  { href: "/confirmaciones", etiqueta: "Confirmaciones", icono: "confirmaciones", permiso: "ver.facturacion" },
  { href: "/facturacion", etiqueta: "Facturación", icono: "facturacion", permiso: "ver.facturacion", tambien: ["/proyectos"] },
  { href: "/caja", etiqueta: "Caja", icono: "caja", permiso: "ver.caja" },
  { href: "/conversar", etiqueta: "Conversar", icono: "conversar", permiso: "conversar" },
  { href: "/junta", etiqueta: "Junta", icono: "junta", permiso: "ver.junta" },
  { href: "/datos", etiqueta: "Datos", icono: "datos", permiso: "ver.facturacion" },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "usuarios", permiso: "usuarios.administrar" },
];
