import "server-only";
// Toda página empieza con `await pagina("<permiso>")`: exige la sesión (contra la base) y el permiso de ver.
// Sin permiso, a la página de inicio de su rol. El proxy solo hace la revisión rápida de la cookie.
import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede, type Permiso } from "@/lib/auth/permisos";

export async function pagina(p: Permiso) {
  const u = await exigirSesion();
  if (!puede(u.rol, p)) redirect(puede(u.rol, "ver.inicio") ? "/" : "/junta");
  return { ...u, puede: (x: Permiso) => puede(u.rol, x) };
}
