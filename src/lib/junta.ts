// El estado de cada proyecto para la junta y para el equipo financiero. Las cifras y el semáforo los pone el
// código, con reglas a la vista (abajo), no el modelo.
//
// Semáforo:
//   rojo  · un hito vencido sin cumplir · una diferencia del mes cerrado por justificar · no factura este mes
//   oro   · no ha confirmado esta semana · ajustó a la baja más del 10 % · el avance físico le lleva más de 8 puntos
//           a lo facturado (factura atrasada respecto a la obra) · tiene cartera vencida
//   verde · nada de lo anterior
import { db } from "./db";
import { leerDatos } from "./datos";
import { aCop, diferenciasMes, informadoVigente, recaudosEsperados, suma, type Datos } from "./finanzas";
import { dia, iso, mesDe, semanaDeRonda, sumarMeses } from "./fechas";
import type { Tono } from "./etiquetas";

export async function estadoDeProyectos(d?: Datos) {
  d ??= await leerDatos();
  const mesHoy = mesDe(d.hoy), mesCerrado = sumarMeses(mesHoy, -1), semana = semanaDeRonda(d.hoy);
  const [proyectos, confs, justifs] = await Promise.all([
    db.proyecto.findMany({ where: { activo: true }, include: { cliente: true, hitos: { orderBy: { fecha: "asc" } } }, orderBy: { codigo: "asc" } }),
    db.confirmacion.findMany({ where: { semana: dia(semana) } }),
    db.justificacion.findMany({ where: { mes: dia(mesCerrado) } }),
  ]);
  const difs = new Map(diferenciasMes(d, mesCerrado).map((x) => [x.proyectoId, x]));
  const cartera = recaudosEsperados(d, "facturado");
  const trimestre = d.proyecciones.map((p) => p.mes).filter((m) => m.slice(0, 4) === mesHoy.slice(0, 4) && Math.floor((Number(m.slice(5, 7)) - 1) / 3) === Math.floor((Number(mesHoy.slice(5, 7)) - 1) / 3));

  const orden: Record<Tono, number> = { rojo: 0, oro: 1, verde: 2, neutro: 3, noche: 3 };
  return proyectos.map((p) => {
    const facturas = d!.facturas.filter((f) => f.proyectoId === p.id && !f.anulada);
    const facturado = Number(p.facturadoAnterior) + suma(facturas, (f) => f.base);
    const contrato = Number(p.valorContrato);
    const pctFacturado = contrato ? (facturado / contrato) * 100 : 0;
    const proyTrim = suma(d!.proyecciones.filter((x) => x.proyectoId === p.id && trimestre.includes(x.mes)), (x) => x.valor);
    const realTrim = suma(facturas.filter((f) => trimestre.includes(f.mes)), (f) => f.base);
    const conf = confs.find((c) => c.proyectoId === p.id);
    const infMes = informadoVigente(d!, p.id, mesHoy);
    const proyMes = d!.proyecciones.find((x) => x.proyectoId === p.id && x.mes === mesHoy)?.valor ?? 0;
    const car = cartera.filter((r) => r.proyectoId === p.id);
    const dif = difs.get(p.id);
    const j = justifs.find((x) => x.proyectoId === p.id);

    const razones: { tono: Tono; texto: string }[] = [];
    for (const h of p.hitos) if (!h.cumplido && iso(h.fecha) < d!.hoy) razones.push({ tono: "rojo", texto: `Hito vencido: ${h.nombre}` });
    if (dif?.requiereJustificacion && j?.estado !== "aprobada") razones.push({ tono: "rojo", texto: "Diferencia del mes cerrado por justificar ante la interventoría" });
    if (conf?.estado === "no_factura") razones.push({ tono: "rojo", texto: "Informó que este mes no factura" });
    if (!conf || ["borrador", "enviada", "recordada", "por_revisar"].includes(conf.estado)) razones.push({ tono: "oro", texto: "No ha confirmado la facturación de esta semana" });
    if (infMes && proyMes && infMes.total < proyMes * 0.9 && conf?.estado !== "no_factura") razones.push({ tono: "oro", texto: "Ajustó a la baja la facturación del mes" });
    if (p.avance - pctFacturado > 8) razones.push({ tono: "oro", texto: "La facturación va atrasada respecto al avance de obra" });
    if (car.some((r) => r.vencida)) razones.push({ tono: "oro", texto: "Tiene cartera vencida" });
    const tono: Tono = razones.some((r) => r.tono === "rojo") ? "rojo" : razones.length ? "oro" : "verde";

    return {
      id: p.id, codigo: p.codigo, nombre: p.nombre, linea: p.linea, ciudad: p.ciudad, pais: p.pais, moneda: p.moneda, cliente: p.cliente.nombre, director: p.director,
      contrato, contratoCop: aCop(contrato, p.moneda, d!.trm), facturado, facturadoCop: aCop(facturado, p.moneda, d!.trm), pctFacturado, avance: p.avance,
      proyTrim, realTrim, proyMes, informadoMes: infMes?.total ?? null,
      cartera: suma(car, (r) => r.neto), carteraVencida: suma(car.filter((r) => r.vencida), (r) => r.neto),
      anticipoCliente: p.cliente.anticipoSaldo ? Number(p.cliente.anticipoSaldo) : 0,
      difMesCerrado: dif?.difInformado ?? null, justificacion: j?.estado ?? null,
      hitos: p.hitos.filter((h) => !h.cumplido).slice(0, 3).map((h) => ({ nombre: h.nombre, fecha: iso(h.fecha), financiero: h.financiero, vencido: iso(h.fecha) < d!.hoy })),
      tono, razones,
    };
  }).sort((a, b) => orden[a.tono] - orden[b.tono]);
}
