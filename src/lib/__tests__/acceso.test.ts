import { describe, it, expect, beforeAll } from "vitest";
import { cifrarClave, claveCorrecta, problemaDeClave, claveTemporal } from "../auth/clave";
import { firmar, leer } from "../auth/cookie";
import { puede } from "../auth/permisos";
import { destinoSeguro } from "../auth/destino";

describe("claves", () => {
  it("la correcta pasa y otra no", async () => {
    const h = await cifrarClave("Licitaciones2026x");
    expect(await claveCorrecta("Licitaciones2026x", h)).toBe(true);
    expect(await claveCorrecta("licitaciones2026x", h)).toBe(false);
  });
  it("la misma clave da hashes distintos (sal)", async () => expect(await cifrarClave("Abcdefghij1")).not.toBe(await cifrarClave("Abcdefghij1")));
  it("un hash dañado no pasa", async () => expect(await claveCorrecta("x", "basura")).toBe(false));
  it("exige 10 caracteres con letras y números", () => {
    expect(problemaDeClave("corta1")).toMatch(/10/);
    expect(problemaDeClave("soloLetrasLargas")).toMatch(/números/);
    expect(problemaDeClave("Conconcreto2026")).toBeNull();
  });
  it("la temporal tiene el formato xxxx-xxxxx-xxxxx y cumple la regla", () => {
    const c = claveTemporal();
    expect(c).toMatch(/^.{4}-.{5}-.{5}$/);
  });
});

describe("cookie firmada", () => {
  beforeAll(() => { process.env.SESION_SECRETO = "s".repeat(48); });
  it("se lee lo que se firmó", async () => {
    const t = await firmar({ sid: "s1", uid: "u1", rol: "admin" }, new Date(Date.now() + 60_000));
    expect(await leer(t)).toEqual({ sid: "s1", uid: "u1", rol: "admin" });
  });
  it("una alterada no se acepta", async () => {
    const t = await firmar({ sid: "s1", uid: "u1", rol: "consulta" }, new Date(Date.now() + 60_000));
    const [h, , f] = t.split(".");
    const otra = Buffer.from(JSON.stringify({ sid: "s1", uid: "u1", rol: "admin", exp: 9999999999 })).toString("base64url");
    expect(await leer(`${h}.${otra}.${f}`)).toBeNull();
  });
  it("una vencida no se acepta", async () => expect(await leer(await firmar({ sid: "s", uid: "u", rol: "admin" }, new Date(Date.now() - 1000)))).toBeNull());
  it("una firmada con otro secreto no se acepta", async () => {
    const t = await firmar({ sid: "s", uid: "u", rol: "admin" }, new Date(Date.now() + 60_000));
    process.env.SESION_SECRETO = "o".repeat(48);
    expect(await leer(t)).toBeNull();
    process.env.SESION_SECRETO = "s".repeat(48);
  });
});

describe("permisos", () => {
  it("facturación aprueba justificaciones, tesorería no", () => { expect(puede("facturacion", "justificaciones.aprobar")).toBe(true); expect(puede("tesoreria", "justificaciones.aprobar")).toBe(false); });
  it("tesorería edita la caja, facturación no", () => { expect(puede("tesoreria", "caja.editar")).toBe(true); expect(puede("facturacion", "caja.editar")).toBe(false); });
  it("la junta solo ve la junta y conversa", () => {
    expect(puede("junta", "ver.junta")).toBe(true);
    expect(puede("junta", "conversar")).toBe(true);
    for (const p of ["ver.inicio", "ver.facturacion", "ver.caja", "confirmaciones.enviar", "justificaciones.aprobar", "datos.cargar", "caja.editar", "usuarios.administrar"] as const) expect(puede("junta", p)).toBe(false);
  });
  it("consulta ve todo y no cambia nada", () => {
    for (const p of ["confirmaciones.enviar", "confirmaciones.registrar", "justificaciones.redactar", "justificaciones.aprobar", "datos.cargar", "caja.editar", "usuarios.administrar"] as const) expect(puede("consulta", p)).toBe(false);
    for (const p of ["ver.inicio", "ver.facturacion", "ver.caja", "ver.junta", "conversar"] as const) expect(puede("consulta", p)).toBe(true);
  });
  it("solo el administrador maneja usuarios", () => { expect(puede("admin", "usuarios.administrar")).toBe(true); expect(puede("facturacion", "usuarios.administrar")).toBe(false); });
  it("sin rol, nada", () => expect(puede(null, "ver.junta")).toBe(false));
});

describe("a dónde volver después de ingresar", () => {
  it("una ruta interna se respeta", () => expect(destinoSeguro("/oportunidades/abc?x=1")).toBe("/oportunidades/abc?x=1"));
  it("otro sitio no", () => { expect(destinoSeguro("//evil.com")).toBe("/"); expect(destinoSeguro("https://evil.com")).toBe("/"); expect(destinoSeguro(String.raw`/\evil.com`)).toBe("/"); });
  it("vacío o el mismo ingreso, al inicio", () => { expect(destinoSeguro("")).toBe("/"); expect(destinoSeguro("/ingresar")).toBe("/"); });
});
