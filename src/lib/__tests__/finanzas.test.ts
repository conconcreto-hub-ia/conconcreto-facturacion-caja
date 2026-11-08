import { describe, it, expect } from "vitest";
import { liquidar, disponibleEn, recaudosEsperados, diferenciasMes, flujoSemanal, descuadreMes, type Datos, type ClienteD } from "../finanzas";
import { semanaDeRonda, lunesDe, diaDelMes } from "../fechas";

const M = 1_000_000;
const publico: ClienteD = { id: "c1", nombre: "Instituto", tipo: "publico", moneda: "COP", ivaPct: 0.95, reteIvaPct: 15, reteIcaPorMil: 7, contribucionPct: 5, garantiaPct: 0, anticipoPct: 20, anticipoSaldo: 300 * M, diasPago: 60 };
const usa: ClienteD = { id: "c2", nombre: "Bayside", tipo: "privado", moneda: "USD", ivaPct: 0, reteIvaPct: 0, reteIcaPorMil: 0, contribucionPct: 0, garantiaPct: 10, anticipoPct: 0, anticipoSaldo: 0, diasPago: 15 };

describe("liquidar: el neto de una factura con las condiciones del cliente", () => {
  it("entidad pública con AIU, ReteIVA, ReteICA, contribución y anticipo", () => {
    const l = liquidar(1_000 * M, publico);
    expect(l.iva).toBe(9_500_000); // 0,95 %
    expect(l.reteIva).toBe(1_425_000); // 15 % del IVA
    expect(l.reteIca).toBe(7_000_000); // 7 por mil
    expect(l.contribucion).toBe(50_000_000); // 5 %
    expect(l.anticipo).toBe(200_000_000); // 20 %
    expect(l.neto).toBe(1_000 * M + 9_500_000 - 1_425_000 - 7_000_000 - 50_000_000 - 200_000_000);
  });
  it("el anticipo no se amortiza más allá de su saldo", () => expect(liquidar(2_000 * M, publico, { anticipoDisponible: 100 * M }).anticipo).toBe(100 * M));
  it("el IVA de SAP manda sobre el calculado", () => expect(liquidar(1_000 * M, publico, { iva: 9_000_000 }).iva).toBe(9_000_000));
  it("Estados Unidos: solo retainage", () => expect(liquidar(1_000_000, usa).neto).toBe(900_000));
});

function datos(): Datos {
  return {
    hoy: "2026-11-08",
    clientes: [publico, usa],
    proyectos: [
      { id: "p1", codigo: "P1", nombre: "Vía", linea: "infraestructura", moneda: "COP", clienteId: "c1", diaRadicacion: 25, activo: true },
      { id: "p2", codigo: "P2", nombre: "Miami", linea: "internacional", moneda: "USD", clienteId: "c2", diaRadicacion: 25, activo: true },
    ],
    proyecciones: [
      { proyectoId: "p1", mes: "2026-10-01", valor: 1_000 * M, fechaRadicacion: "2026-10-25" },
      { proyectoId: "p1", mes: "2026-11-01", valor: 1_000 * M, fechaRadicacion: "2026-11-10" },
      { proyectoId: "p2", mes: "2026-11-01", valor: 100_000, fechaRadicacion: "2026-11-20" },
    ],
    confirmaciones: [
      { proyectoId: "p1", mes: "2026-10-01", semana: "2026-10-26", estado: "confirmada", facturadoAntes: 0, valorPreguntado: 1_000 * M, valorInformado: 1_000 * M, fechaInformada: "2026-10-25", explicacion: "ok" },
      { proyectoId: "p1", mes: "2026-11-01", semana: "2026-11-09", estado: "ajustada", facturadoAntes: 0, valorPreguntado: 1_000 * M, valorInformado: 600 * M, fechaInformada: "2026-11-12", explicacion: "lluvias" },
    ],
    facturas: [
      { numero: "F1", proyectoId: "p1", clienteId: "c1", fecha: "2026-10-25", mes: "2026-10-01", moneda: "COP", base: 700 * M, iva: 6_650_000, fechaVencimiento: "2026-12-24", pagada: false, anulada: false, texto: null },
      { numero: "F0", proyectoId: "p1", clienteId: "c1", fecha: "2026-08-01", mes: "2026-08-01", moneda: "COP", base: 100 * M, iva: 950_000, fechaVencimiento: "2026-09-30", pagada: false, anulada: false, texto: null },
    ],
    saldos: [
      { bancoId: "b1", banco: "Banco", moneda: "COP", fecha: "2026-11-06", saldo: 10_000 * M },
      { bancoId: "b1", banco: "Banco", moneda: "COP", fecha: "2026-11-05", saldo: 1 },
      { bancoId: "b2", banco: "Miami", moneda: "USD", fecha: "2026-11-06", saldo: 1_000 },
    ],
    pagos: [
      { fecha: "2026-11-13", beneficiario: "Nómina", concepto: "Nómina", categoria: "nomina", valor: 2_000 * M, moneda: "COP", pagado: false },
      { fecha: "2026-11-05", beneficiario: "Viejo", concepto: "Ya pasó", categoria: "nomina", valor: 999 * M, moneda: "COP", pagado: false },
      { fecha: "2027-01-05", beneficiario: "Después", concepto: "Después", categoria: "nomina", valor: 1 * M, moneda: "COP", pagado: false },
    ],
    trm: 4_000, trmFecha: "2026-11-06",
  };
}

describe("recaudos y disponible", () => {
  it("el saldo inicial es el último de cada banco, con los dólares a la TRM", () => {
    const x = disponibleEn(datos(), "2026-11-07", "facturado");
    expect(x.saldoInicial.totalCop).toBe(10_000 * M + 4_000_000);
    expect(x.corte).toBe("2026-11-06");
  });
  it("una factura vencida sin pagar se espera 10 días después del corte", () => {
    const f0 = recaudosEsperados(datos(), "facturado").find((r) => r.factura === "F0")!;
    expect(f0.vencida).toBe(true);
    expect(f0.fechaRecaudo).toBe("2026-11-16");
  });
  it("informado usa lo que confirmó el proyecto; proyectado, la proyección", () => {
    const inf = recaudosEsperados(datos(), "informado").find((r) => r.proyectoId === "p1" && r.origen !== "factura")!;
    expect(inf.base).toBe(600 * M);
    expect(inf.fechaFactura).toBe("2026-11-12");
    expect(inf.fechaRecaudo).toBe("2027-01-11");
    const proy = recaudosEsperados(datos(), "proyectado").find((r) => r.proyectoId === "p1" && r.origen !== "factura")!;
    expect(proy.base).toBe(1_000 * M);
  });
  it("lo que no ha confirmado se marca y se puede restar", () => {
    const x = disponibleEn(datos(), "2026-12-31", "informado");
    expect(x.sinConfirmar.proyectos.map((p) => p.proyecto)).toEqual(["Miami"]);
    expect(x.sinConfirmar.totalCop).toBe(100_000 * 0.9 * 4_000);
    expect(x.sinConfirmar.disponibleSinEllos).toBe(x.disponible - x.sinConfirmar.totalCop);
  });
  it("el disponible = saldo + recaudos − pagos, sin pagos anteriores al corte ni posteriores a la fecha", () => {
    const x = disponibleEn(datos(), "2026-12-31", "facturado");
    const recaudos = liquidar(700 * M, publico, { iva: 6_650_000 }).neto + liquidar(100 * M, publico, { iva: 950_000 }).neto;
    expect(x.recaudos.totalCop).toBe(recaudos);
    expect(x.pagos.totalCop).toBe(2_000 * M);
    expect(x.disponible).toBe(10_004 * M + recaudos - 2_000 * M);
  });
  it("el flujo semanal cuadra: el saldo final de una semana es el inicial de la siguiente", () => {
    const f = flujoSemanal(datos(), "informado", 10);
    for (let i = 1; i < f.filas.length; i++) expect(f.filas[i].saldoInicial).toBe(f.filas[i - 1].saldoFinal);
    const ultima = f.filas.at(-1)!;
    expect(ultima.saldoFinal).toBe(10_004 * M + f.filas.reduce((a, w) => a + w.recaudos - w.pagos, 0));
  });
});

describe("diferencias y descuadre", () => {
  it("octubre cerrado: 700 de 1.000 informados pide justificación", () => {
    const r = diferenciasMes(datos(), "2026-10-01").find((x) => x.proyectoId === "p1")!;
    expect(r.difInformado).toBe(-300 * M);
    expect(r.requiereJustificacion).toBe(true);
  });
  it("un mes abierto no pide justificación", () => expect(diferenciasMes(datos(), "2026-11-01").every((r) => !r.requiereJustificacion)).toBe(true));
  it("el descuadre de diciembre muestra lo que dejó de entrar del cliente", () => {
    const d = descuadreMes(datos(), "2026-12-01");
    const c = d.clientes.find((x) => x.cliente === "Instituto")!;
    expect(c.planCop).toBe(liquidar(1_000 * M, publico).neto); // octubre proyectado, vence el 24 de diciembre
    expect(c.esperadoCop).toBe(liquidar(700 * M, publico, { iva: 6_650_000 }).neto);
  });
});

describe("fechas", () => {
  it("la ronda del domingo es para la semana que empieza", () => { expect(semanaDeRonda("2026-11-08")).toBe("2026-11-09"); expect(semanaDeRonda("2026-11-11")).toBe("2026-11-09"); });
  it("lunes", () => expect(lunesDe("2026-11-08")).toBe("2026-11-02"));
  it("el día 31 en noviembre es el 30", () => expect(diaDelMes("2026-11-01", 31)).toBe("2026-11-30"));
});
