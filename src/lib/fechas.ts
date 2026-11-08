// Fechas de calendario (sin hora) como texto «AAAA-MM-DD». En la base van como @db.Date (medianoche UTC).
// Todo lo que diga «hoy» es hoy en Colombia.

export type Dia = string; // "2026-11-15"

export const dia = (s: Dia): Date => new Date(`${s}T00:00:00.000Z`);
export const iso = (d: Date): Dia => d.toISOString().slice(0, 10);

export function hoyBogota(ahora = new Date()): Dia {
  if (process.env.HOY_DEMO && /^\d{4}-\d{2}-\d{2}$/.test(process.env.HOY_DEMO)) return process.env.HOY_DEMO;
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

export function sumarDias(d: Dia, n: number): Dia {
  const x = dia(d);
  x.setUTCDate(x.getUTCDate() + n);
  return iso(x);
}

export const diaSemana = (d: Dia) => dia(d).getUTCDay(); // 0 domingo … 6 sábado

/** El lunes de la semana de d. */
export function lunesDe(d: Dia): Dia {
  const w = diaSemana(d);
  return sumarDias(d, w === 0 ? -6 : 1 - w);
}

/** La semana de la ronda de confirmaciones: el lunes en curso; un sábado o domingo ya prepara la siguiente. */
export function semanaDeRonda(d: Dia): Dia {
  const w = diaSemana(d);
  return w === 0 || w === 6 ? lunesDe(sumarDias(d, 7)) : lunesDe(d);
}

export const mesDe = (d: Dia): Dia => `${d.slice(0, 7)}-01`;

export function sumarMeses(mes: Dia, n: number): Dia {
  const x = dia(mesDe(mes));
  x.setUTCMonth(x.getUTCMonth() + n);
  return iso(x);
}

/** El día `n` del mes, sin pasarse del último día. */
export function diaDelMes(mes: Dia, n: number): Dia {
  const ultimo = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
  return `${mes.slice(0, 7)}-${String(Math.min(Math.max(1, n), ultimo)).padStart(2, "0")}`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const nombreMes = (mes: Dia) => MESES[Number(mes.slice(5, 7)) - 1];
export const nombreMesAnio = (mes: Dia) => `${nombreMes(mes)} de ${mes.slice(0, 4)}`;
/** "Octubre de 2026": solo la primera letra (el capitalize de CSS pone «De» en mayúscula). */
export const MesAnio = (mes: Dia) => { const s = nombreMesAnio(mes); return s[0].toUpperCase() + s.slice(1); };
/** "15 de diciembre" */
export const diaLargo = (d: Dia) => `${Number(d.slice(8, 10))} de ${nombreMes(d)}`;
/** "15 dic" */
export const diaCorto = (d: Dia) => `${Number(d.slice(8, 10))} ${nombreMes(d).slice(0, 3)}`;

export const trimestreDe = (mes: Dia) => `${mes.slice(0, 4)}-T${Math.floor((Number(mes.slice(5, 7)) - 1) / 3) + 1}`;
