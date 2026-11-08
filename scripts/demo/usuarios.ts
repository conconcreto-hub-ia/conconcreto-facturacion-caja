import type { Rol } from "@prisma/client";

/** Los usuarios de prueba: uno por rol. Se crean y se borran con scripts/usuarios-prueba.ts. */
export const PRUEBA: { rol: Rol; nombre: string }[] = [
  { rol: "admin", nombre: "Prueba Administrador" },
  { rol: "facturacion", nombre: "Prueba Facturación" },
  { rol: "tesoreria", nombre: "Prueba Tesorería" },
  { rol: "junta", nombre: "Prueba Junta" },
  { rol: "consulta", nombre: "Prueba Consulta" },
];
export const DOMINIO_PRUEBA = "@facturacion-caja.test";
export const correoDe = (rol: string) => `prueba-${rol}${DOMINIO_PRUEBA}`;
