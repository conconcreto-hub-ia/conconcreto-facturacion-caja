import { describe, it, expect, beforeEach } from "vitest";
import { leerMonto } from "../montos";
import { decidir } from "../confirmaciones";
import { puedeEnviarA } from "../envio";
import { cifrasDe, cifrasNoAutorizadas } from "../justificaciones";
import { partirRemitente } from "../agentmail";

describe("leer un valor escrito por una persona", () => {
  it.each([
    ["$1.200 millones", 1_200_000_000, "COP"],
    ["1.200 M", 1_200_000_000, null], // sin moneda: se toma la del proyecto
    ["$1.200.000.000", 1_200_000_000, "COP"],
    ["1,2 mil millones", 1_200_000_000, "COP"],
    ["850 millones de pesos", 850_000_000, "COP"],
    ["USD 1.2 millones", 1_200_000, "USD"],
    ["US$1,200,000", 1_200_000, "USD"],
    ["$2.300,5 millones", 2_300_500_000, "COP"],
  ])("«%s»", (t, v, m) => expect(leerMonto(t)).toEqual({ valor: v, moneda: m }));
  it("sin número, nada", () => expect(leerMonto("lo de siempre")).toBeNull());
});

describe("qué se registra con la respuesta del residente", () => {
  const c = { valorPreguntado: 1_650_000_000, fechaPreguntada: "2026-11-12", moneda: "COP" as const };
  const hoy = "2026-11-09";
  const l = (x: Partial<Parameters<typeof decidir>[0]>) => ({ tipo: "confirma" as const, valor_texto: null, fecha_radicacion: null, explicacion: "", pide_algo_al_sistema: false, ...x });
  it("confirma: el valor preguntado", () => expect(decidir(l({}), c, hoy)).toMatchObject({ estado: "confirmada", valor: 1_650_000_000, fecha: "2026-11-12" }));
  it("«confirmo» con otro valor es un ajuste", () => expect(decidir(l({ valor_texto: "$1.200 millones" }), c, hoy)).toMatchObject({ estado: "ajustada", valor: 1_200_000_000 }));
  it("ajusta solo la fecha", () => expect(decidir(l({ tipo: "ajusta", fecha_radicacion: "2026-12-05" }), c, hoy)).toMatchObject({ estado: "ajustada", valor: 1_650_000_000, fecha: "2026-12-05" }));
  it("no factura: cero", () => expect(decidir(l({ tipo: "no_factura", explicacion: "suspendido" }), c, hoy)).toMatchObject({ estado: "no_factura", valor: 0 }));
  it("una pregunta queda por revisar", () => expect(decidir(l({ tipo: "pregunta" }), c, hoy).estado).toBe("por_revisar"));
  it("un valor en dólares para un proyecto en pesos no se registra", () => expect(decidir(l({ tipo: "ajusta", valor_texto: "USD 300.000" }), c, hoy).estado).toBe("por_revisar"));
  it("una fecha de un mes ya pasado no se toma", () => expect(decidir(l({ fecha_radicacion: "2025-11-20" }), c, hoy).fecha).toBe("2026-11-12"));
});

describe("modo prueba", () => {
  beforeEach(() => { process.env.ENVIO_DOMINIOS_PERMITIDOS = "agentmail.to"; });
  it("deja el buzón de prueba", () => expect(puedeEnviarA("prueba-jhon-cc@agentmail.to")).toBe(true));
  it("bloquea un correo de Conconcreto", () => expect(puedeEnviarA("residente@conconcreto.com")).toBe(false));
  it("no se engaña con un dominio parecido", () => expect(puedeEnviarA("x@notagentmail.to")).toBe(false));
  it("sin variable, solo agentmail.to", () => { delete process.env.ENVIO_DOMINIOS_PERMITIDOS; expect(puedeEnviarA("tesoreria@gmail.com")).toBe(false); });
  it("parte el remitente", () => expect(partirRemitente("Jhon Bedoya <Prueba-Jhon-CC@agentmail.to>")).toEqual({ nombre: "Jhon Bedoya", correo: "prueba-jhon-cc@agentmail.to" }));
});

describe("las cifras de un texto se verifican contra los datos", () => {
  it("encuentra pesos, dólares y porcentajes", () => expect(cifrasDe("Se facturaron $1.120 millones de $1.850 millones (60,5 %), y US$1.150.000.")).toEqual(["$1.120 millones", "$1.850 millones", "60,5 %", "US$1.150.000"]));
  it("detecta una cifra inventada", () => expect(cifrasNoAutorizadas("Faltan $730 millones y $99 millones.", ["$730 millones"])).toEqual(["$99 millones"]));
  it("una diferencia negativa cuenta como la misma cifra", () => expect(cifrasNoAutorizadas("La diferencia es -$730 millones.", ["$730 millones"])).toEqual([]));
});
