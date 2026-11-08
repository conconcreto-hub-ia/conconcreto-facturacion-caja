// El menú vive aquí y en ningún otro sitio. Cada entrada dice qué permiso hace falta para verla.
// OJO: no va en barra-cliente.tsx: un valor exportado desde un módulo "use client" llega al servidor como una
// referencia de cliente, no como el arreglo (NAV.filter no existe allá).
import type { Permiso } from "@/lib/auth/permisos";

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
