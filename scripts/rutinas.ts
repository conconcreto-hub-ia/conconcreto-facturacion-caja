// Las rutinas corriendo en un computador, mientras la app no esté desplegada.
//
//   npx tsx scripts/rutinas.ts
//
//   · Ronda de confirmaciones (+ justificaciones del mes cerrado): lunes, 7:00 (hora Colombia).
//   · Recordatorios a quien lleva 24 h sin contestar: martes a viernes, 8:00.
//   · Buzón: cada 3 minutos de 7:00 a 19:00, de lunes a viernes. Primero le pregunta a AgentMail si llegó algo
//     (eso no toca la base); solo si hay un correo nuevo revisa el buzón. Así Neon puede dormir.
import "./_env";
import { agentmail } from "../src/lib/agentmail";
import { rutinaBuzon, rutinaRecordatorios, rutinaRonda } from "../src/lib/rutinas";

const hora = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
const log = (...x: unknown[]) => console.log(`[${hora().toLocaleString("es-CO")}]`, ...x);

let ultimoMensaje: string | null = null;
const hechoHoy = new Set<string>();

async function ciclo() {
  const ahora = hora();
  const d = ahora.getDay(), h = ahora.getHours();
  const dia = `${ahora.getFullYear()}-${ahora.getMonth() + 1}-${ahora.getDate()}`;
  try {
    if (d === 1 && h >= 7 && !hechoHoy.has(`ronda-${dia}`)) { hechoHoy.add(`ronda-${dia}`); log("ronda", await rutinaRonda()); }
    if (d >= 2 && d <= 5 && h >= 8 && !hechoHoy.has(`rec-${dia}`)) { hechoHoy.add(`rec-${dia}`); log("recordatorios", await rutinaRecordatorios()); }
    if (d >= 1 && d <= 5 && h >= 7 && h < 19) {
      const { messages } = await agentmail.listar(1);
      const tope = messages[0]?.message_id ?? null;
      if (tope && tope !== ultimoMensaje) { ultimoMensaje = tope; log("buzón", await rutinaBuzon()); }
    }
  } catch (e) { log("falló:", e instanceof Error ? e.message : e); }
}

log("Rutinas encendidas. Ctrl+C para apagarlas.");
ciclo();
setInterval(ciclo, 3 * 60_000);
