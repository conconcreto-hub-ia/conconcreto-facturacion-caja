// Qué puede hacer cada rol. Un solo lugar: las acciones lo exigen, las pantallas y el menú lo consultan.
import type { Rol } from "@prisma/client";

export const PERMISOS = {
  // Ver
  "ver.inicio": ["admin", "facturacion", "tesoreria", "consulta"],
  "ver.facturacion": ["admin", "facturacion", "tesoreria", "consulta"],
  "ver.caja": ["admin", "facturacion", "tesoreria", "consulta"],
  "ver.junta": ["admin", "facturacion", "tesoreria", "junta", "consulta"],
  conversar: ["admin", "facturacion", "tesoreria", "junta", "consulta"],
  // Cambiar
  "confirmaciones.enviar": ["admin", "facturacion"], // ronda, recordatorios, revisar el buzón
  "confirmaciones.registrar": ["admin", "facturacion"], // registrar a mano lo que el agente no pudo
  "justificaciones.redactar": ["admin", "facturacion"],
  "justificaciones.aprobar": ["admin", "facturacion"],
  "datos.cargar": ["admin", "facturacion"], // proyección y exporte de SAP
  "caja.editar": ["admin", "tesoreria"], // saldos y pagos programados
  "usuarios.administrar": ["admin"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export const puede = (rol: Rol | null | undefined, p: Permiso) => !!rol && (PERMISOS[p] as readonly Rol[]).includes(rol);

export const ROLES: Rol[] = ["admin", "facturacion", "tesoreria", "junta", "consulta"];

export const ROL: Record<Rol, { etiqueta: string; detalle: string }> = {
  admin: { etiqueta: "Administrador", detalle: "Todo, y maneja los usuarios" },
  facturacion: { etiqueta: "Facturación y cartera", detalle: "Confirma con los proyectos, carga la proyección y SAP, aprueba las justificaciones" },
  tesoreria: { etiqueta: "Tesorería", detalle: "La caja: saldos por banco y pagos programados" },
  junta: { etiqueta: "Junta", detalle: "Solo la vista de junta y la conversación" },
  consulta: { etiqueta: "Consulta", detalle: "Ve todo, no cambia nada" },
};
