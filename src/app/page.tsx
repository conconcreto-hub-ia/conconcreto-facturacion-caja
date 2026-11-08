import Link from "next/link";
import { redirect } from "next/navigation";
import { Barra } from "@/components/barra";
import { Bitacora } from "@/components/bitacora";
import { Aja, Cifra, Contenedor, Encabezado, Tarjeta, SeccionEt } from "@/components/ui";
import { IconoBanco, IconoConversa, IconoCorreo, IconoDocumento, IconoEdificio, IconoFlecha } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { db } from "@/lib/db";
import { leerDatos } from "@/lib/datos";
import { disponibleEn, diferenciasMes, flujoSemanal, saldosAlCorte } from "@/lib/finanzas";
import { cop, copCorto } from "@/lib/formato";
import { dia, diaLargo, mesDe, nombreMes, semanaDeRonda, sumarMeses } from "@/lib/fechas";
import { RESPONDIDAS } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const u = await exigirSesion();
  if (!puede(u.rol, "ver.inicio")) redirect("/junta");
  const d = await leerDatos();
  const semana = semanaDeRonda(d.hoy);
  const mesCerrado = sumarMeses(mesDe(d.hoy), -1);
  const [confs, justif, eventos] = await Promise.all([
    db.confirmacion.findMany({ where: { semana: dia(semana) } }),
    db.justificacion.findMany({ where: { estado: "borrador" }, include: { proyecto: true } }),
    db.evento.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { proyecto: { select: { id: true, nombre: true } } } }),
  ]);
  const activos = d.proyectos.filter((p) => p.activo).length;
  const respondieron = confs.filter((c) => RESPONDIDAS.includes(c.estado)).length;
  const ajustes = confs.filter((c) => c.estado === "ajustada" || c.estado === "no_factura").length;
  const saldo = saldosAlCorte(d);
  const fin = flujoSemanal(d, "informado", 12);
  const dic15 = disponibleEn(d, `${d.hoy.slice(0, 4)}-12-15`, "informado");
  const porJustificar = diferenciasMes(d, mesCerrado).filter((x) => x.requiereJustificacion);

  const tarjetas = [
    { href: "/confirmaciones", icono: IconoCorreo, titulo: "Confirmaciones", texto: `La ronda de la semana del ${diaLargo(semana)} con los ${activos} proyectos.` },
    { href: "/facturacion", icono: IconoDocumento, titulo: "Facturación y cartera", texto: "Proyectado, informado y real por cliente, con sus justificaciones." },
    { href: "/caja", icono: IconoBanco, titulo: "Caja", texto: "El disponible por banco, los pagos y el flujo por semana." },
    { href: "/conversar", icono: IconoConversa, titulo: "Conversar", texto: "Pregúntale a los datos. Las cifras las calcula el código." },
    { href: "/junta", icono: IconoEdificio, titulo: "Junta", texto: "Todos los proyectos, su estado financiero y sus hitos." },
  ];

  return (
    <>
      <Barra />
      <Contenedor className="space-y-10 py-10">
        <Encabezado et="Facturación y caja" titulo={<>Lo proyectado, lo informado y lo real, <span className="dorado">junto a la caja</span></>} bajada="Cada semana el agente confirma con los proyectos lo que van a facturar, lo cruza con SAP y con los bancos, y redacta las justificaciones que una persona aprueba." />

        <Tarjeta className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra valor={copCorto(saldo.totalCop)} rotulo="Disponible en bancos" nota={`al ${diaLargo(saldo.corte)}`} />
          <Cifra valor={`${respondieron} de ${activos}`} rotulo="Proyectos que ya confirmaron" nota={`semana del ${diaLargo(semana)}${ajustes ? ` · ${ajustes} con cambios` : ""}`} />
          <Cifra valor={justif.length} rotulo="Justificaciones por aprobar" nota={porJustificar.length ? `${porJustificar.length} diferencia${porJustificar.length === 1 ? "" : "s"} en ${nombreMes(mesCerrado)}` : "sin diferencias que pasen el umbral"} />
          <Cifra valor={copCorto(dic15.disponible)} rotulo="Disponible el 15 de diciembre" nota="si facturan lo que confirmaron" />
        </Tarjeta>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Aja>
              {respondieron
                ? <>Esta semana {respondieron} de los {activos} proyectos ya confirmaron lo que facturan en {nombreMes(mesDe(semana))}{ajustes ? `, y ${ajustes} cambiaron el valor o la fecha` : ""}.</>
                : <>La ronda de esta semana todavía no tiene respuestas.</>}{" "}
                {justif.length ? <>La justificación de {justif.map((j) => j.proyecto.nombre).join(" y ")} está lista para aprobar.</> : null}{" "}
                {fin.minimo && <>La semana más apretada de las próximas doce es la del {diaLargo(fin.minimo.semana)}, con {cop(fin.minimo.saldoFinal)}.</>}
            </Aja>
            <div className="grid gap-3 sm:grid-cols-2">
              {tarjetas.map((t) => (
                <Link key={t.href} href={t.href}>
                  <Tarjeta viva className="flex h-full gap-4 p-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-ctl bg-verde-suave text-verde-profundo"><t.icono className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-display text-[16px] font-bold">{t.titulo}<IconoFlecha className="size-3.5 text-tinta-3" /></span>
                      <span className="mt-1 block text-[13.5px] text-tinta-2">{t.texto}</span>
                    </span>
                  </Tarjeta>
                </Link>
              ))}
            </div>
          </div>
          <aside>
            <Tarjeta className="p-5">
              <SeccionEt>Bitácora</SeccionEt>
              <div className="mt-4"><Bitacora eventos={eventos} conProyecto /></div>
            </Tarjeta>
          </aside>
        </div>
      </Contenedor>
    </>
  );
}
