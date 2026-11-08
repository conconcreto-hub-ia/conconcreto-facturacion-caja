// El buzón del agente (facturacion-cc@agentmail.to). Lo que entra en el hilo de una confirmación se lee y se
// registra; lo demás se guarda como dato y no hace nada.
//
// OJO con AgentMail:
//   · `extracted_text` quita lo citado. En la respuesta a un hilo propio eso es justo lo que sirve (la respuesta
//     del residente sin nuestra pregunta debajo). En un reenvío, lo citado ES el contenido: ahí se leería `text`.
//   · El listado pagina con `next_page_token`.

import { db } from "./db";
import { agentmail, partirRemitente } from "./agentmail";
import { procesarRespuesta } from "./confirmaciones";

export type ResultadoBuzon = { revisados: number; nuevos: number; respuestas: number; ignorados: number; errores: string[] };

export async function revisarBuzon(): Promise<ResultadoBuzon> {
  const r: ResultadoBuzon = { revisados: 0, nuevos: 0, respuestas: 0, ignorados: 0, errores: [] };
  const propio = agentmail.buzon().toLowerCase();
  const mensajes: Awaited<ReturnType<typeof agentmail.listar>>["messages"] = [];
  let token: string | undefined;
  for (let pagina = 0; pagina < 20; pagina++) {
    const l = await agentmail.listar(50, token);
    const conocidos = await db.correo.count({ where: { mensajeId: { in: l.messages.map((m) => m.message_id) } } });
    mensajes.push(...l.messages);
    const propios = l.messages.filter((m) => partirRemitente(m.from).correo === propio).length;
    if (!l.next_page_token || conocidos + propios >= l.messages.length) break;
    token = l.next_page_token;
  }
  mensajes.reverse(); // en el orden en que llegaron

  for (const resumen of mensajes) {
    r.revisados++;
    if (partirRemitente(resumen.from).correo === propio) continue;
    if (await db.correo.findUnique({ where: { mensajeId: resumen.message_id }, select: { id: true } })) continue;
    const m = await agentmail.leer(resumen.message_id);
    r.nuevos++;
    const texto = m.extracted_text || m.text || m.preview || "";
    const correo = await db.correo.create({
      data: { mensajeId: m.message_id, hiloId: m.thread_id, direccion: "entrante", de: m.from, para: m.to.join(", "), asunto: m.subject ?? "(sin asunto)", resumen: texto.slice(0, 800), recibidoEn: new Date(m.timestamp) },
    });
    try {
      if (await procesarRespuesta(m, correo.id, texto)) { r.respuestas++; continue; }
      await db.correo.update({ where: { id: correo.id }, data: { procesado: true } });
      await db.evento.create({ data: { actor: "agente", tipo: "correo.ignorado", descripcion: `Llegó un correo de ${partirRemitente(m.from).correo} («${m.subject ?? "sin asunto"}») que no responde a ninguna confirmación. Se guardó y no se hizo nada.` } });
      r.ignorados++;
    } catch (e) {
      // Queda sin procesar: la próxima revisión no lo repite (ya está en la base), así que se marca en la bitácora.
      const msg = e instanceof Error ? e.message : String(e);
      r.errores.push(`${m.message_id}: ${msg}`);
      await db.correo.delete({ where: { id: correo.id } }); // para que la próxima revisión lo vuelva a intentar
    }
  }
  return r;
}
