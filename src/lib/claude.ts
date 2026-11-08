// Las dos formas de hablar con Claude en esta app:
//   · pedirEstructurado: una herramienta con su esquema, para leer un correo o redactar un texto.
//   · conversarConHerramientas: el bucle de la conversación, donde Claude llama herramientas que consultan la
//     base y hacen las cuentas con código, y redacta citando lo que le devolvieron.
// Sonnet 5.5 piensa siempre: no se le pasa `temperature`, y `effort: low` deja el pensamiento justo.
// Trampas de este modelo: no acepta tool_choice forzado (se pide la herramienta en el prompt) y el contenido
// de cada respuesta se devuelve COMPLETO en el turno siguiente, con sus bloques de pensamiento sin tocar.

export const MODELO = process.env.MODELO_AGENTE || "claude-sonnet-5-5";

export type Herramienta = { name: string; description: string; input_schema: Record<string, unknown> };
type Bloque = { type: string; name?: string; id?: string; input?: unknown; text?: string; [k: string]: unknown };
type Respuesta = { content: Bloque[]; stop_reason: string; usage?: Record<string, number> };

async function llamar(cuerpo: Record<string, unknown>): Promise<Respuesta> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO, output_config: { effort: "low" }, ...cuerpo }),
  });
  if (!res.ok) throw new Error(`Claude respondió ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return (await res.json()) as Respuesta;
}

export async function pedirEstructurado<T>(args: { sistema: string; usuario: string; herramienta: Herramienta; maxTokens?: number }): Promise<T> {
  const sistema = `${args.sistema}\n\nResponde usando la herramienta ${args.herramienta.name}.`;
  for (let intento = 0; intento < 2; intento++) {
    const json = await llamar({ max_tokens: args.maxTokens ?? 4000, system: sistema, tools: [args.herramienta], messages: [{ role: "user", content: args.usuario }] });
    if (json.stop_reason === "refusal") throw new Error("Claude no quiso responder esta solicitud.");
    const uso = json.content.find((c) => c.type === "tool_use" && c.name === args.herramienta.name);
    if (uso?.input) return uso.input as T;
  }
  throw new Error(`Claude no usó la herramienta ${args.herramienta.name}.`);
}

export type LlamadaHerramienta = { nombre: string; entrada: unknown; salida: unknown; error?: string; ms: number };

/** El bucle de herramientas. `ejecutar` corre en el servidor y devuelve lo que el código calculó. */
export async function conversarConHerramientas(args: {
  sistema: string;
  mensajes: { role: "user" | "assistant"; content: string }[];
  herramientas: Herramienta[];
  ejecutar: (nombre: string, entrada: Record<string, unknown>) => Promise<unknown>;
  maxVueltas?: number;
}): Promise<{ texto: string; llamadas: LlamadaHerramienta[]; vueltas: number }> {
  const mensajes: { role: string; content: unknown }[] = [...args.mensajes];
  const llamadas: LlamadaHerramienta[] = [];
  const max = args.maxVueltas ?? 8;
  for (let vuelta = 1; vuelta <= max; vuelta++) {
    const r = await llamar({ max_tokens: 8000, system: args.sistema, tools: args.herramientas, messages: mensajes });
    if (r.stop_reason === "refusal") return { texto: "No puedo responder esa pregunta.", llamadas, vueltas: vuelta };
    // El contenido completo, con el pensamiento, vuelve tal cual.
    mensajes.push({ role: "assistant", content: r.content });
    const usos = r.content.filter((b) => b.type === "tool_use");
    if (r.stop_reason !== "tool_use" || !usos.length) {
      const texto = r.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
      return { texto: texto || "No encontré cómo responder eso con los datos que tengo.", llamadas, vueltas: vuelta };
    }
    // Todas las respuestas de herramientas en un solo mensaje.
    const resultados = await Promise.all(usos.map(async (u) => {
      const t0 = Date.now();
      try {
        const salida = await args.ejecutar(u.name!, (u.input ?? {}) as Record<string, unknown>);
        llamadas.push({ nombre: u.name!, entrada: u.input, salida, ms: Date.now() - t0 });
        return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(salida) };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        llamadas.push({ nombre: u.name!, entrada: u.input, salida: null, error, ms: Date.now() - t0 });
        return { type: "tool_result", tool_use_id: u.id, content: `Error: ${error}`, is_error: true };
      }
    }));
    mensajes.push({ role: "user", content: resultados });
  }
  return { texto: "La pregunta necesitó demasiadas consultas. Prueba a hacerla más concreta.", llamadas, vueltas: max };
}
