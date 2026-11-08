"use client";
import { useActionState, useState } from "react";
import { Boton, Tarjeta } from "@/components/ui";
import { accionNuevoPago, accionRegistrarSaldo } from "@/app/acciones";

const campo = "mt-1 h-9 w-full rounded-ctl border border-linea bg-fondo px-2.5 text-[13.5px] outline-none focus:border-verde";

export function FormSaldos({ bancos, hoy }: { bancos: { id: string; nombre: string; moneda: string }[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState(accionRegistrarSaldo, {});
  if (!abierto) return <Boton chico onClick={() => setAbierto(true)}>Registrar los saldos de hoy</Boton>;
  return (
    <Tarjeta className="p-4">
      <form action={accion} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <label className="text-[12.5px] font-semibold">Fecha<input type="date" name="fecha" defaultValue={hoy} max={hoy} className={campo} /></label>
        {bancos.map((b) => <label key={b.id} className="text-[12.5px] font-semibold">{b.nombre}<input name={`saldo-${b.id}`} placeholder={b.moneda === "USD" ? "US$" : "$ millones o pesos"} className={campo} /></label>)}
        <div className="flex items-end gap-2"><Boton type="submit" chico variante="primario" disabled={pendiente}>Guardar</Boton></div>
      </form>
      {estado.error && <p className="mt-2 text-[12.5px] text-rojo">{estado.error}</p>}
      {estado.ok && <p className="mt-2 text-[12.5px] text-verde-profundo">Saldos guardados.</p>}
    </Tarjeta>
  );
}

export function FormPago() {
  const [estado, accion, pendiente] = useActionState(accionNuevoPago, {});
  return (
    <Tarjeta className="p-5">
      <h3 className="text-[15px] font-bold">Programar un pago</h3>
      <form action={accion} className="mt-3 space-y-2.5">
        <label className="block text-[12.5px] font-semibold">Fecha<input type="date" name="fecha" required className={campo} /></label>
        <label className="block text-[12.5px] font-semibold">Concepto<input name="concepto" required className={campo} /></label>
        <label className="block text-[12.5px] font-semibold">Beneficiario<input name="beneficiario" required className={campo} /></label>
        <div className="grid grid-cols-[1fr_90px] gap-2">
          <label className="block text-[12.5px] font-semibold">Valor<input name="valor" required placeholder="$850 millones" className={campo} /></label>
          <label className="block text-[12.5px] font-semibold">Moneda<select name="moneda" className={campo}><option>COP</option><option>USD</option></select></label>
        </div>
        <label className="block text-[12.5px] font-semibold">Tipo
          <select name="categoria" className={campo}>
            <option value="proveedores">Proveedores y subcontratistas</option><option value="nomina">Nómina</option><option value="seguridad_social">Seguridad social</option><option value="impuestos">Impuestos</option><option value="credito">Obligaciones financieras</option>
          </select>
        </label>
        {estado.error && <p className="text-[12.5px] text-rojo">{estado.error}</p>}
        {estado.ok && <p className="text-[12.5px] text-verde-profundo">Pago programado.</p>}
        <Boton type="submit" variante="primario" className="w-full" disabled={pendiente}>{pendiente ? "Guardando…" : "Programar"}</Boton>
      </form>
    </Tarjeta>
  );
}
