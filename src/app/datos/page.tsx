import { Barra } from "@/components/barra";
import { Contenedor, Encabezado, SeccionEt, Tarjeta } from "@/components/ui";
import { pagina } from "@/app/pagina";
import { db } from "@/lib/db";
import { fechaHora, monto } from "@/lib/formato";
import { FormCarga } from "./carga";

export const dynamic = "force-dynamic";

export default async function Datos() {
  const u = await pagina("ver.facturacion");
  const [clientes, cargas] = await Promise.all([
    db.cliente.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { proyectos: true } } } }),
    db.carga.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <Encabezado et="Datos" titulo="De dónde salen las cifras" bajada="La proyección trimestral (Excel), el exporte de facturas de SAP (Excel) y las condiciones tributarias de cada cliente, que reemplazan el Excel por cliente. Cargar un archivo no borra nada: actualiza por proyecto y mes, o por número de factura." />

        {u.puede("datos.cargar") && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormCarga tipo="proyeccion" titulo="Proyección trimestral" detalle="Una fila por proyecto con su «Elemento PEP», el «Día de radicación» y una columna por mes (oct-2026, nov-2026…), antes de IVA." />
            <FormCarga tipo="sap" titulo="Exporte de facturas de SAP" detalle="Columnas «Doc.factura», «Fecha factura», «Solicitante», «Elemento PEP», «Valor neto», «Impuesto», «Moneda», «Venc.neto», «Compensado»." />
          </div>
        )}

        <section className="space-y-3">
          <SeccionEt>Clientes y sus condiciones</SeccionEt>
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">IVA</th><th className="px-3 py-3 text-right font-medium">ReteIVA</th><th className="px-3 py-3 text-right font-medium">ReteICA</th><th className="px-3 py-3 text-right font-medium">Contribución</th><th className="px-3 py-3 text-right font-medium">Garantía</th><th className="px-3 py-3 text-right font-medium">Anticipo</th><th className="px-5 py-3 text-right font-medium">Paga a</th></tr></thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-t border-linea-2 align-top">
                    <td className="px-5 py-3"><div className="font-semibold">{c.nombre}</div><div className="text-[12px] text-tinta-3">{c.tipo === "publico" ? "Público" : "Privado"} · NIT {c.nit} · SAP {c.codigoSap} · {c._count.proyectos} proyecto{c._count.proyectos === 1 ? "" : "s"}</div>{c.notas && <div className="mt-1 max-w-[340px] text-[12px] text-tinta-3">{c.notas}</div>}</td>
                    <td className="px-3 py-3 text-tinta-2">{c.esquemaIva}</td>
                    <td className="num px-3 py-3 text-right">{c.reteIvaPct} %</td>
                    <td className="num px-3 py-3 text-right">{c.reteIcaPorMil.toLocaleString("es-CO")} ‰</td>
                    <td className="num px-3 py-3 text-right">{c.contribucionPct} %</td>
                    <td className="num px-3 py-3 text-right">{c.garantiaPct} %</td>
                    <td className="num px-3 py-3 text-right">{c.anticipoPct} %{Number(c.anticipoSaldo) > 0 && <div className="text-[11.5px] font-normal text-tinta-3">faltan {monto(Number(c.anticipoSaldo), c.moneda)}</div>}</td>
                    <td className="num px-5 py-3 text-right">{c.diasPago} días</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
          <p className="text-[12.5px] text-tinta-3">Conconcreto es autorretenedor: ningún cliente le practica retención en la fuente. La contribución de obra pública (5 %) la descuentan las entidades públicas en contratos de obra. Datos de demostración.</p>
        </section>

        <section className="space-y-3">
          <SeccionEt>Últimas cargas</SeccionEt>
          <Tarjeta className="divide-y divide-linea-2">
            {cargas.map((c) => {
              const errores = ((c.detalle as { errores?: string[] } | null)?.errores ?? []);
              return <div key={c.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-[13.5px]"><span><b className="font-semibold">{c.tipo === "sap" ? "SAP" : "Proyección"}</b> · {c.archivo} · {c.filas} filas{errores.length ? ` · ${errores.length} avisos` : ""}</span><span className="text-tinta-3">{c.quien} · {fechaHora(c.createdAt)}</span></div>;
            })}
          </Tarjeta>
        </section>
      </Contenedor>
    </>
  );
}
