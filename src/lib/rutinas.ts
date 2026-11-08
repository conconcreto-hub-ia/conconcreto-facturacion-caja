// Lo que corre solo. Cada rutina es una función: la llaman las rutas de cron, el webhook de AgentMail y
// scripts/rutinas.ts (un computador). Todas dejan su rastro en la bitácora.
import { enviarRonda, enviarRecordatorios } from "./confirmaciones";
import { revisarBuzon } from "./buzon";
import { detectarYRedactar } from "./justificaciones";
import { hoyBogota, mesDe, sumarMeses } from "./fechas";

/** Lunes temprano: la ronda de la semana, y las justificaciones del mes que acaba de cerrar si faltan. */
export async function rutinaRonda() {
  const ronda = await enviarRonda("la rutina del lunes");
  const justificaciones = await detectarYRedactar(sumarMeses(mesDe(hoyBogota()), -1));
  return { ronda, justificaciones };
}

/** A diario: recordatorio a quien lleva un día sin contestar (máximo dos). */
export const rutinaRecordatorios = () => enviarRecordatorios(24);

export const rutinaBuzon = () => revisarBuzon();

/** Las rutas de cron solo responden con el secreto (Vercel lo manda como Bearer). */
export function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  return !!secreto && req.headers.get("authorization") === `Bearer ${secreto}`;
}
