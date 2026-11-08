// La referencia viva del sistema de diseño. Si una pieza no está aquí, todavía no existe.

import { exigirSesion } from "@/lib/auth/sesion";
import { Barra } from "@/components/barra";
import { Aja, Boton, Chip, Cifra, Contenedor, Dato, Encabezado, Encaje, Insignia, Marca, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoCorreo, IconoAgente, IconoBanco, IconoConversa, IconoCalendario, IconoDocumento, IconoEdificio, IconoImprimir, IconoSubir, IconoEscudo, IconoTendencia, IconoFlecha } from "@/components/iconos";
import { ESTADO_CONFIRMACION, ESTADO_JUSTIFICACION } from "@/lib/etiquetas";

const COLORES = [
  ["noche", "#07130c"], ["noche-2", "#0d2216"], ["verde-profundo", "#07582b"], ["verde", "#3dae2b"], ["verde-suave", "#eaf6e7"],
  ["oro", "#efbf01"], ["naranja", "#d8800d"], ["tinta", "#141a16"], ["tinta-2", "#48514b"], ["tinta-3", "#7b847e"], ["linea", "#e2e7e3"], ["fondo", "#f6f8f5"],
];

export default async function Sistema() {
  await exigirSesion();
  return (
    <>
      <Barra />
      <Contenedor className="space-y-14 py-10">
        <Encabezado et="Sistema de diseño" titulo="Conconcreto x irrelevant" bajada="Sale del material de la sesión 1: noche y verde Conconcreto, con el degradado oro del logo para lo que importa. Borde antes que sombra, un solo radio, Montserrat para títulos y cifras." />

        <section className="space-y-4">
          <SeccionEt>Marca</SeccionEt>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="banda rounded-sup p-8"><Marca /></div>
            <Tarjeta className="p-8"><Marca fondo="claro" /></Tarjeta>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Color</SeccionEt>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLORES.map(([n, h]) => (
              <div key={n}>
                <div className="h-14 rounded-ctl border border-linea" style={{ background: h }} />
                <div className="mt-1.5 font-display text-[12.5px] font-semibold">{n}</div>
                <div className="font-mono text-[11.5px] text-tinta-3">{h}</div>
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full [background:var(--degradado)]" />
        </section>

        <section className="space-y-4">
          <SeccionEt>Tipografía</SeccionEt>
          <Tarjeta className="space-y-3 p-6">
            <h1 className="text-[44px] font-extrabold leading-none">Lo informado contra <span className="dorado">lo facturado</span></h1>
            <h2 className="text-[26px] font-extrabold">Título de sección · Montserrat 800</h2>
            <h3 className="text-[18px] font-bold">Título de tarjeta · Montserrat 700</h3>
            <p className="max-w-[640px] text-tinta-2">Texto corrido en Work Sans. El agente le pregunta a cada proyecto lo que factura, lo cruza con SAP y redacta la justificación; una persona la aprueba.</p>
            <p className="font-mono text-[13px] text-tinta-2">CC-VIA-01 · 9000412580 · JetBrains Mono para códigos</p>
          </Tarjeta>
        </section>

        <section className="space-y-4">
          <SeccionEt>Botones</SeccionEt>
          <div className="flex flex-wrap gap-3">
            <Boton variante="primario">Aprobar la justificación <IconoFlecha /></Boton>
            <Boton>Secundario</Boton>
            <Boton variante="oscuro">Oscuro</Boton>
            <Boton variante="fantasma">Fantasma</Boton>
            <Boton variante="peligro">Devolver</Boton>
            <Boton variante="primario" chico>Chico</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Estados</SeccionEt>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO_CONFIRMACION).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO_JUSTIFICACION).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2"><Chip>Infraestructura</Chip><Chip>Público</Chip><Chip>AIU</Chip></div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Cifras y encaje</SeccionEt>
          <Tarjeta className="flex flex-wrap gap-10 p-6">
            <Cifra valor="10 de 12" rotulo="Proyectos que ya confirmaron" nota="semana del 9 de noviembre" />
            <Cifra valor="$41.166 M" rotulo="Disponible en bancos" />
            <Cifra valor="1" rotulo="Justificaciones por aprobar" />
            <div className="space-y-2 pt-1"><Encaje valor={86} /><Encaje valor={54} /><Encaje valor={null} /></div>
          </Tarjeta>
          <div className="banda flex flex-wrap gap-10 rounded-sup p-6">
            <Cifra oscuro valor="12" rotulo="Proyectos activos" />
            <Cifra oscuro valor="5" rotulo="Bancos" />
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Bloques</SeccionEt>
          <div className="grid gap-4 md:grid-cols-2">
            <Aja>Doble calzada Vía al Mar facturó $1.120 millones de los $1.850 millones que confirmó: la interventoría dejó por fuera el pavimento del K12+300 al K14+100. La justificación está lista para aprobar.</Aja>
            <Tarjeta className="p-5">
              <dl className="m-0">
                <Dato k="Cliente">Instituto Departamental de Vías</Dato>
                <Dato k="IVA">AIU: 19 % sobre la utilidad</Dato>
                <Dato k="Paga a">60 días</Dato>
              </dl>
            </Tarjeta>
          </div>
          <Vacio icono={<IconoCorreo className="size-5" />} titulo="La ronda de esta semana no ha salido" accion={<Boton variante="primario">Enviar la ronda</Boton>}>
            Con «Enviar la ronda», el agente le escribe a cada residente con lo proyectado para el mes.
          </Vacio>
        </section>

        <section className="space-y-4">
          <SeccionEt>Íconos</SeccionEt>
          <div className="flex flex-wrap gap-4 text-tinta-2">
            {[IconoCorreo, IconoAgente, IconoBanco, IconoConversa, IconoCalendario, IconoDocumento, IconoEdificio, IconoImprimir, IconoSubir, IconoEscudo, IconoTendencia].map((I, i) => (
              <div key={i} className="grid size-11 place-items-center rounded-ctl border border-linea bg-papel"><I className="size-5" /></div>
            ))}
          </div>
        </section>
      </Contenedor>
    </>
  );
}
