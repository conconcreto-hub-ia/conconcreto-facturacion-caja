import { Barra } from "@/components/barra";
import { Contenedor, Encabezado } from "@/components/ui";
import { pagina } from "@/app/pagina";
import { db } from "@/lib/db";
import { Chat, type Turno } from "./chat";

export const dynamic = "force-dynamic";

const EJEMPLOS = [
  "¿Cuánto tengo disponible el 15 de diciembre si los proyectos facturan lo que confirmaron?",
  "¿Qué cliente me descuadra el flujo de diciembre?",
  "¿Qué proyectos no han confirmado esta semana?",
  "¿Cuál es la semana más apretada de caja de aquí a enero?",
  "¿Qué diferencias de octubre hay que justificar ante la interventoría?",
  "¿Cuánto nos debe el Instituto Departamental de Vías y qué está vencido?",
];

export default async function Conversar() {
  const u = await pagina("conversar");
  const previas = await db.consulta.findMany({ where: { usuarioId: u.id }, orderBy: { createdAt: "desc" }, take: 8 });
  const turnos: Turno[] = previas.reverse().map((c) => ({
    id: c.id, pregunta: c.pregunta, respuesta: c.respuesta, sinVerificar: c.sinVerificar, ms: c.ms,
    llamadas: (c.herramientas as { nombre: string; entrada: unknown; error?: string }[]).map((l) => ({ nombre: l.nombre, entrada: l.entrada, error: l.error ?? null })),
  }));
  return (
    <>
      <Barra />
      <Contenedor className="space-y-6 py-10">
        <Encabezado et="Conversar" titulo="Pregúntale a la facturación y a la caja" bajada="Claude no calcula: llama herramientas que consultan la base y hacen las cuentas con código, y redacta citando las cifras que le devolvieron. Debajo de cada respuesta se ve qué consultó y si todas sus cifras salieron de ahí. Si una pregunta no se puede responder con los datos, lo dice." />
        <Chat turnosIniciales={turnos} ejemplos={EJEMPLOS} />
      </Contenedor>
    </>
  );
}
