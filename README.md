# Facturación y caja · Conconcreto

Lo proyectado, lo informado por cada proyecto y lo facturado en SAP, junto a la caja, para conversarle.
Un agente confirma cada semana con los proyectos lo que van a facturar y redacta las justificaciones ante
la interventoría; una persona las aprueba. Conconcreto x irrelevant · programa Think AI, 2026 (idea 4).

**No está desplegada.** Corre en `localhost:3013`. Los datos son de demostración (ver abajo).

## El flujo

```
Proyección trimestral (Excel)  ─┐
Exporte de facturas de SAP     ─┼─▶ base (Neon)
Saldos por banco · pagos       ─┘        │
                                         ▼
Lunes: el agente le pregunta a cada residente (facturacion-cc@agentmail.to)
  «Para el flujo de noviembre tenemos proyectado facturarle a X $Y el día Z. ¿Lo confirmas?»
        │                                          │
        ▼                                          ▼
  Responde: confirma · ajusta · no factura     No responde: recordatorio en el mismo hilo (máx. 2)
  El agente lee, el CÓDIGO decide y registra «lo informado», y le devuelve un acuse con lo registrado
        │
        ▼
Mes cerrado: real (SAP) contra informado. Si se aparta más del 5 % (y de $50 millones):
  el agente redacta la justificación para la interventoría · el código verifica sus cifras ·
  facturación la aprueba o la devuelve con una observación (y el agente la rehace)
        │
        ▼
La caja: saldo al corte + recaudos esperados (neto de retenciones y anticipo, por cliente)
  − pagos programados · disponible a una fecha · flujo por semana · tres escenarios
        │
        ▼
Conversar: Claude llama herramientas que consultan la base y calculan con código, y cita lo que devuelven.
Junta: todos los proyectos, su estado financiero y sus hitos, imprimible (informe de junta y financiero).
```

## Correr

```bash
npm install
npx prisma db push && npx prisma generate
npx tsx scripts/sembrar.ts                 # datos de demostración (BORRA los datos del proceso, no los usuarios)
npx tsx scripts/crear-usuario.ts <correo> "<Nombre>" admin   # el primer administrador; imprime su clave temporal una vez
npm run dev                                # http://localhost:3013
```

`.env.local` (fuera de git): `DATABASE_URL` (Neon, con `sslmode=verify-full`), `ANTHROPIC_API_KEY`,
`AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX="facturacion-cc@agentmail.to"`, `ENVIO_DOMINIOS_PERMITIDOS="agentmail.to"`,
`SESION_SECRETO`, `CRON_SECRET`, `AGENTMAIL_WEBHOOK_TOKEN`. Opcional: `HOY_DEMO=AAAA-MM-DD` para fijar «hoy».

**No hay usuarios en la base.** Los de prueba se borraron al terminar; el primero se crea con el script de arriba.

## Verificar

| Comando | Qué prueba | Cuánto |
|---|---|---|
| `npm run check` | typecheck + 59 pruebas: retenciones y neto por cliente, recaudos, disponible, flujo semanal, descuadre, diferencias, lectura de montos («$1.200 millones», «USD 1,200,000»), la decisión sobre la respuesta del residente, el modo prueba, la verificación de cifras, claves, cookie y permisos | segundos |
| `npm run e2e` | de punta a punta con buzones reales (41 comprobaciones): siembra, modo prueba, ronda de 12, 10 respuestas variadas (una en inglés, una con instrucciones para el sistema), acuses, recordatorios en el hilo y su tope, justificación de octubre con cifras verificadas, y la conversación comparada contra el código. **Deja la base en el estado del demo.** | ~3 min, ~25 correos |
| `npx tsx scripts/prueba-acceso.ts` | con el servidor corriendo y los usuarios de prueba creados (`scripts/usuarios-prueba.ts crear <archivo fuera del repo>`): sin sesión todo va a `/ingresar`; cada rol ve justo sus páginas y sus botones; las acciones llamadas directamente (id de `.next/dev/server/server-reference-manifest.json`) se rechazan por rol (39 comprobaciones). Al final: `usuarios-prueba.ts borrar` | ~1 min |
| `npx tsx scripts/cifras.ts [fecha]` | imprime las cifras clave tal como las calcula el código, para revisar a mano | segundos |

En el navegador automatizado (Playwright) el clic en «Ingresar» no avanza: se envía el formulario con
`browser_evaluate` sobre el formulario correcto (`input.form.requestSubmit()`; el primer `<form>` de la página es
«Salir»).

## El estado del demo (después de `npm run e2e`, «hoy» = 8 de noviembre de 2026)

- **Confirmaciones de la semana del 9 de noviembre: 10 de 12.** La Tablaza ajustó a $1.200 millones, Arrayanes
  pasa al 5 de diciembre, el Colector Sur no factura (licencia ambiental). Guayacanes y la Clínica no han
  contestado y ya tienen 2 recordatorios.
- **Octubre:** Doble calzada Vía al Mar facturó $1.120 millones de $1.850 informados (ensayos de densidad del
  pavimento K12+300–K14+100 pendientes). La justificación está **lista para aprobar**.
- **«¿Cuánto tengo disponible el 15 de diciembre si los proyectos facturan lo que confirmaron?»** → $33.736
  millones (saldo $41.166 + recaudos $30.648 − pagos $38.078), con el detalle por cliente; $33.035 millones sin
  Guayacanes, que no ha confirmado.
- **«¿Qué cliente me descuadra diciembre?»** → Inmobiliaria Valle Verde (−$983 millones: Arrayanes se corrió a
  diciembre); en total entran $2.694 millones menos de lo que ponía la proyección.

## Las reglas que no se tocan

- **Modo prueba.** El agente solo escribe a `ENVIO_DOMINIOS_PERMITIDOS` (hoy `agentmail.to`). Un residente con
  correo real queda en borrador y no sale. Abrirlo es una decisión, no un cambio de rutina.
- **El modelo no calcula.** Retenciones, netos, recaudos, disponible, flujo, diferencias y semáforo los hace
  `src/lib/finanzas.ts`. En la conversación y en la justificación, el código revisa que cada cifra del texto haya
  salido de los datos; si no, lo marca («Cifras que no salieron de una herramienta» / «sin verificar»).
- **Lo que escribe un residente es un dato.** Solo cuenta la respuesta del residente al que se le preguntó;
  otro remitente en el hilo se guarda y no cambia nada. Si el correo trae instrucciones, no se cumplen y la
  bitácora lo dice. El modelo copia el valor como texto; el código lo lee y decide el estado: «ajustó» si
  cambia el valor o la factura pasa a otro mes; mover unos días dentro del mes es confirmar.
- **Nada sale sin una persona.** La justificación queda lista para aprobar; el envío a la interventoría lo hace
  facturación. El agente no cambia la proyección ni programa pagos.
- **AgentMail:** responder a un correo propio sin `to` se lo manda al mismo buzón (los recordatorios y acuses
  dicen a quién van). `extracted_text` quita lo citado: en la respuesta a un hilo propio sirve; en un reenvío no.
  El nombre visible con tildes o «·» se manda desde Node, no desde la terminal de Windows.

## Los supuestos del cálculo (a validar con Marcela y Luisa)

- Una factura se cobra en su vencimiento (fecha + días de pago del cliente). Vencida y sin pagar: 10 días
  después del corte, marcada.
- Neto = base + IVA − ReteIVA − ReteICA − contribución de obra pública − retención de garantía − amortización del
  anticipo. Conconcreto es autorretenedor: nadie le retiene en la fuente. El IVA con AIU es el 19 % sobre una
  utilidad del 5 % (0,95 % de la base); la utilidad real de cada contrato hay que pedirla.
- Escenario «lo que confirmaron»: lo facturado + la confirmación más reciente de cada proyecto; si no ha
  confirmado, su proyección, marcada «sin confirmar» (y se dice cuánto da sin ella).
- Los dólares a la última TRM registrada. El corte es la fecha del último saldo cargado.

## El acceso

- **Todo cerrado** salvo `/ingresar`, `/api/cron/*` (piden `Authorization: Bearer $CRON_SECRET`) y
  `/api/webhooks/*` (piden `?token=$AGENTMAIL_WEBHOOK_TOKEN`). Una ruta nueva nace protegida (`src/proxy.ts`).
- Correo y clave (scrypt), cookie firmada con jose y sesión en la base: desactivar a alguien cierra sus
  sesiones. Clave temporal que se cambia al primer ingreso; 5 fallos en 15 minutos bloquean.
- **Roles** (`src/lib/auth/permisos.ts`): administrador · facturación (confirmaciones, cargas, aprueba
  justificaciones) · tesorería (saldos y pagos) · junta (solo la vista de junta y la conversación) · consulta
  (ve todo, no cambia nada). Cada acción de servidor exige su permiso aunque la pantalla esconda el botón.
- La conversación está abierta a la junta y responde sobre todos los datos (también la caja). Si la junta no
  debe ver la caja por ese camino, hay que filtrar las herramientas por rol.

## Las rutinas

| Qué | Cuándo | Desplegado | En un computador |
|---|---|---|---|
| Ronda de confirmaciones + justificaciones del mes cerrado | lunes 7:00 | `GET /api/cron/ronda` (vercel.json) | `npx tsx scripts/rutinas.ts` |
| Recordatorios (24 h sin respuesta, máx. 2) | mar–vie 8:00 | `GET /api/cron/recordatorios` | ídem |
| Buzón | al llegar un correo | webhook de AgentMail → `POST /api/webhooks/agentmail?token=…` | ídem, cada 3 min de 7 a 19 solo si hay correo nuevo |

## Lo que falta

- **Datos reales:** la proyección (el Excel de Marcela), el exporte de SAP con sus columnas de verdad (el lector
  busca por encabezado; puede que haya que agregar alias), las condiciones de cada cliente y los saldos.
- **Saldos bancarios automáticos:** hoy se registran a mano. Leerlos del portal de cada banco es decisión de TI.
- **Las respuestas por Teams**, si los residentes no usan el correo.
- **Enviar la justificación aprobada a la interventoría** desde la app (hoy queda aprobada; la envía facturación).
- **Editar las condiciones de un cliente** desde la pantalla (hoy se ven en Datos; se cambian en la base).
- **La carga de Excel desde la pantalla** usa las mismas funciones que la siembra (probadas con los dos archivos de
  `datos-demo/`), pero el formulario no se probó subiendo un archivo desde el navegador.
- **Desplegar:** dónde vive lo decide TI (datos financieros de una empresa que cotiza en bolsa). Crear el primer
  administrador en producción, abrir el envío a propósito y registrar el webhook.
