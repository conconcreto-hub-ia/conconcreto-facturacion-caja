// La barra superior con la persona conectada. Las páginas importan esta; la parte interactiva es BarraCliente.
// El menú (NAV) vive en nav.ts y aquí se filtra por los permisos del rol.
import type { ReactNode } from "react";
import { usuarioActual } from "@/lib/auth/sesion";
import { ROL, puede } from "@/lib/auth/permisos";
import { BarraCliente } from "./barra-cliente";
import { NAV } from "./nav";

export async function Barra({ agenteActivo = true, children }: { agenteActivo?: boolean; children?: ReactNode }) {
  const u = await usuarioActual();
  const visibles = u ? NAV.filter((n) => puede(u.rol, n.permiso)).map((n) => n.href) : [];
  return (
    <BarraCliente agenteActivo={agenteActivo} visibles={visibles} usuario={u ? { nombre: u.nombre, rol: ROL[u.rol].etiqueta } : null}>
      {children}
    </BarraCliente>
  );
}
