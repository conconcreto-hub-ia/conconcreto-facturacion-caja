// Etiquetas y tonos de los enums. Un solo lugar: ninguna pantalla escribe su propia versión.
import type { EstadoConfirmacion, EstadoJustificacion, Linea, Actor } from "@prisma/client";

export type Tono = "neutro" | "verde" | "oro" | "rojo" | "noche";

export const ESTADO_CONFIRMACION: Record<EstadoConfirmacion, { etiqueta: string; tono: Tono }> = {
  borrador: { etiqueta: "En borrador", tono: "neutro" },
  enviada: { etiqueta: "Esperando respuesta", tono: "neutro" },
  recordada: { etiqueta: "Recordada", tono: "oro" },
  confirmada: { etiqueta: "Confirmó", tono: "verde" },
  ajustada: { etiqueta: "Ajustó", tono: "oro" },
  no_factura: { etiqueta: "No factura", tono: "rojo" },
  por_revisar: { etiqueta: "Por revisar", tono: "rojo" },
};

/** Las que ya cuentan como «informado». */
export const RESPONDIDAS: EstadoConfirmacion[] = ["confirmada", "ajustada", "no_factura"];

export const ESTADO_JUSTIFICACION: Record<EstadoJustificacion, { etiqueta: string; tono: Tono }> = {
  borrador: { etiqueta: "Lista para aprobar", tono: "oro" },
  aprobada: { etiqueta: "Aprobada", tono: "verde" },
  devuelta: { etiqueta: "Devuelta", tono: "rojo" },
};

export const LINEA: Record<Linea, string> = {
  infraestructura: "Infraestructura",
  vivienda: "Vivienda",
  edificacion: "Edificación privada",
  internacional: "Internacional",
};

export const CATEGORIA_PAGO: Record<string, string> = {
  nomina: "Nómina",
  seguridad_social: "Seguridad social",
  proveedores: "Proveedores y subcontratistas",
  impuestos: "Impuestos",
  credito: "Obligaciones financieras",
};

export const ESCENARIO: Record<string, { etiqueta: string; detalle: string }> = {
  informado: { etiqueta: "Lo que confirmaron", detalle: "Lo facturado más lo que cada proyecto confirmó; si no ha confirmado, su proyección" },
  proyectado: { etiqueta: "La proyección", detalle: "Lo facturado más lo que falta según la proyección trimestral" },
  facturado: { etiqueta: "Solo lo facturado", detalle: "Solo las facturas que ya están en SAP" },
};

export const ACTOR: Record<Actor, string> = { agente: "Agente", persona: "Persona", sistema: "Sistema" };
