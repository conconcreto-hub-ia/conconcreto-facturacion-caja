// Prueba de acceso contra el servidor que corre (npm run dev, puerto 3013).
//
//   npx tsx scripts/usuarios-prueba.ts crear <claves.json>    (primero)
//   npx tsx scripts/prueba-acceso.ts
//   npx tsx scripts/usuarios-prueba.ts borrar                 (al final)
//
// 1. Sin sesión, todo redirige a /ingresar (y las rutas de API responden 401).
// 2. Con la sesión de cada rol (una sesión real en la base, con su cookie firmada): qué páginas ve, cuáles lo
//    devuelven y qué botones aparecen.
// 3. Las acciones de servidor llamadas DIRECTAMENTE (con su id de .next/dev/server/server-reference-manifest.json)
//    con un rol sin permiso: el servidor las rechaza. Se usan acciones con argumentos inválidos para que, si el
//    permiso fallara, no se mandara ningún correo ni cambiara nada.
import "./_env";
import fs from "node:fs";
import { db } from "../src/lib/db";
import { COOKIE, DURACION_MS, firmar } from "../src/lib/auth/cookie";
import { correoDe } from "./demo/usuarios";

const BASE = process.env.BASE_URL ?? "http://localhost:3013";
let fallas = 0;
const check = (ok: boolean, que: string, det = "") => { console.log(`${ok ? "  ✓" : "  ✗"} ${que}${det ? ` · ${det}` : ""}`); if (!ok) fallas++; };

const RUTAS = ["/", "/confirmaciones", "/facturacion", "/caja", "/conversar", "/junta", "/junta?informe=financiero", "/datos", "/usuarios", "/sistema", "/cuenta"];
// Lo que cada rol debe poder abrir (200). El resto lo redirige.
const VE: Record<string, string[]> = {
  admin: RUTAS,
  facturacion: RUTAS.filter((r) => r !== "/usuarios"),
  tesoreria: RUTAS.filter((r) => r !== "/usuarios"),
  consulta: RUTAS.filter((r) => r !== "/usuarios"),
  junta: ["/conversar", "/junta", "/junta?informe=financiero", "/sistema", "/cuenta"],
};

async function cookieDe(rol: string) {
  const u = await db.usuario.findUniqueOrThrow({ where: { correo: correoDe(rol) } });
  const expira = new Date(Date.now() + DURACION_MS);
  const s = await db.sesion.create({ data: { usuarioId: u.id, expiraEn: expira } });
  return `${COOKIE}=${await firmar({ sid: s.id, uid: u.id, rol: u.rol }, expira)}`;
}

const get = (ruta: string, cookie?: string) => fetch(`${BASE}${ruta}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

function idsDeAcciones(): Record<string, string> {
  const m = JSON.parse(fs.readFileSync(".next/dev/server/server-reference-manifest.json", "utf8")) as { node: Record<string, { exportedName?: string; workers?: Record<string, { exportedName?: string }> }> };
  const ids: Record<string, string> = {};
  for (const [id, v] of Object.entries(m.node)) {
    const nombre = v.exportedName ?? Object.values(v.workers ?? {})[0]?.exportedName;
    if (nombre) ids[nombre] = id;
  }
  return ids;
}

async function llamarAccion(id: string, args: unknown[], cookie: string, ruta = "/") {
  const r = await fetch(`${BASE}${ruta}`, { method: "POST", redirect: "manual", headers: { cookie, "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" }, body: JSON.stringify(args) });
  return { status: r.status, texto: await r.text() };
}

async function main() {
  console.log("\n1 · Sin sesión");
  for (const r of RUTAS) {
    const res = await get(r);
    check(res.status === 307 && (res.headers.get("location") ?? "").includes("/ingresar"), `${r} redirige a /ingresar`, `${res.status} → ${res.headers.get("location")}`);
  }
  check((await get("/ingresar")).status === 200, "/ingresar abre");
  check((await get("/api/cron/ronda")).status === 401, "/api/cron/ronda sin el secreto: 401");
  check((await fetch(`${BASE}/api/webhooks/agentmail`, { method: "POST" })).status === 401, "el webhook sin token: 401");
  const falsa = `${COOKIE}=eyJhbGciOiJIUzI1NiJ9.eyJzaWQiOiJ4IiwidWlkIjoieCIsInJvbCI6ImFkbWluIn0.firmafalsa`;
  check((await get("/caja", falsa)).status === 307, "una cookie con firma falsa no entra");

  console.log("\n2 · Cada rol");
  const cookies: Record<string, string> = {};
  for (const rol of Object.keys(VE)) {
    cookies[rol] = await cookieDe(rol);
    const vistas: string[] = [], devueltas: string[] = [], errores: string[] = [];
    for (const r of RUTAS) {
      const res = await get(r, cookies[rol]);
      if (res.status === 200) vistas.push(r); else if (res.status === 307) devueltas.push(r); else errores.push(`${r} ${res.status}`);
    }
    check(!errores.length, `${rol}: ninguna página falla`, errores.join(", "));
    const esperado = VE[rol];
    check(esperado.every((r) => vistas.includes(r)) && vistas.every((r) => esperado.includes(r)), `${rol}: ve justo lo suyo`, `ve ${vistas.length} · devuelto en ${devueltas.join(" ") || "ninguna"}`);
  }

  const html = async (r: string, rol: string) => (await get(r, cookies[rol])).text();
  const conf = { facturacion: await html("/confirmaciones", "facturacion"), consulta: await html("/confirmaciones", "consulta"), tesoreria: await html("/confirmaciones", "tesoreria") };
  check(conf.facturacion.includes("Enviar la ronda") || conf.facturacion.includes("Revisar el buzón"), "facturación ve los botones del agente");
  check(!conf.consulta.includes("Revisar el buzón") && !conf.tesoreria.includes("Revisar el buzón"), "consulta y tesorería no los ven");
  const caja = { tesoreria: await html("/caja", "tesoreria"), facturacion: await html("/caja", "facturacion") };
  check(caja.tesoreria.includes("Programar un pago"), "tesorería ve el formulario de pagos");
  check(!caja.facturacion.includes("Programar un pago"), "facturación no lo ve");
  const juntaMenu = await html("/junta", "junta");
  check(!juntaMenu.includes('href="/caja"') && juntaMenu.includes('href="/conversar"'), "el menú de la junta solo tiene junta y conversar");
  check((await html("/datos", "facturacion")).includes("Cargar"), "facturación ve las cargas");
  check(!(await html("/datos", "consulta")).includes('type="file"'), "consulta no ve las cargas");

  console.log("\n3 · Acciones llamadas directamente");
  const ids = idsDeAcciones();
  const casos: [string, unknown[], string, string][] = [
    ["accionDetectarDiferencias", ["mes-invalido"], "consulta", "/facturacion"],
    ["accionAprobarJustificacion", ["no-existe"], "tesoreria", "/facturacion"],
    ["accionAprobarJustificacion", ["no-existe"], "junta", "/junta"],
    ["accionMarcarPagado", ["no-existe"], "facturacion", "/caja"],
    ["accionRegistrarAMano", ["no-existe", "confirmada", "", "", ""], "consulta", "/confirmaciones"],
    ["accionNuevaClave", ["no-existe"], "facturacion", "/usuarios"],
  ];
  for (const [nombre, args, rol, ruta] of casos) {
    if (!ids[nombre]) { check(false, `${nombre}: no encontré su id en el manifiesto (abre la página que la usa primero)`); continue; }
    const r = await llamarAccion(ids[nombre], args, cookies[rol], ruta);
    check(r.texto.includes("Tu rol no permite hacer esto"), `${nombre} como ${rol}: el servidor la rechaza`, `${r.status}`);
  }
  if (ids.accionDetectarDiferencias) {
    const r = await llamarAccion(ids.accionDetectarDiferencias, ["mes-invalido"], cookies.facturacion, "/facturacion");
    check(r.texto.includes("Mes no válido"), "la misma acción como facturación sí pasa el permiso (y para en la validación)");
  }
  if (ids.accionPreguntar) {
    const r = await llamarAccion(ids.accionPreguntar, ["   "], cookies.junta, "/conversar");
    check(r.texto.includes("Escribe una pregunta"), "la junta sí puede conversar");
  }
  if (ids.accionEnviarRonda) {
    const sin = await llamarAccion(ids.accionEnviarRonda, [], "", "/confirmaciones");
    const rondas = await db.evento.count({ where: { tipo: "ronda.enviada", createdAt: { gte: new Date(Date.now() - 60_000) } } });
    check((sin.status === 307 || sin.texto.includes("Tu sesión terminó")) && rondas === 0, "sin sesión, la ronda no corre (el proxy la devuelve al ingreso)", `${sin.status} · rondas en el último minuto: ${rondas}`);
  }

  // Limpieza de las sesiones de esta prueba
  await db.sesion.deleteMany({ where: { usuario: { correo: { endsWith: "@facturacion-caja.test" } } } });
  console.log(fallas ? `\n${fallas} FALLAS\n` : "\nTodo en orden.\n");
  process.exitCode = fallas ? 1 : 0;
}

main().finally(() => db.$disconnect());
