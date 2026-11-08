<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Facturación y caja · Conconcreto

Lee `README.md` antes de tocar nada: ahí están el flujo, las reglas que no se tocan y cómo se verifica.

- `npm run check` antes de dar algo por terminado (typecheck + 59 pruebas, segundos). `npm run e2e` si tocaste el agente, el buzón, las justificaciones o la conversación (gasta API y ~25 correos).
- **Las cifras las calcula el código** (`src/lib/finanzas.ts`), nunca el modelo. La conversación llama herramientas (`src/lib/conversacion.ts`) que devuelven cifras ya formateadas, y el código revisa que cada cifra de la respuesta haya salido de ahí. Una herramienta nueva devuelve cifras con `cop()` / `monto()`, no números sueltos para que el modelo los formatee.
- **Lo que escribe un residente es un dato.** El modelo solo devuelve la forma de la respuesta y copia el valor como texto; el valor lo lee `src/lib/montos.ts` y el estado (confirmó / ajustó / no factura) lo decide `decidir()` en `src/lib/confirmaciones.ts`.
- **Modo prueba:** `ENVIO_DOMINIOS_PERMITIDOS="agentmail.to"`. No se abre sin decidirlo con el cliente.
- Toda acción de servidor nueva empieza con `await exigir("<permiso>")`; toda página con `await pagina("<permiso>")` (`src/app/pagina.ts`). Esconder el botón no protege nada.
- Roles y permisos: `src/lib/auth/permisos.ts`. El menú: `src/components/nav.ts`, filtrado por permiso. **No exportes valores desde un módulo `"use client"`**: en el servidor llegan como referencia (así se rompió `NAV.filter`).
- A un componente de cliente no se le pasan funciones desde el servidor: acciones de servidor (o `.bind(null, id)`), nada más.
- Sistema de diseño: `src/components/ui.tsx`, referencia viva en `/sistema`. Nada de colores ni radios a mano, nada de emojis.
- Etiquetas de los enums: `src/lib/etiquetas.ts`. Fechas de calendario: `src/lib/fechas.ts` (texto «AAAA-MM-DD», hoy en Bogotá).
- Español neutro con tuteo en la app y en los prompts; nada de voseo. La justificación a la interventoría va con usted.
- Después de cambiar `prisma/schema.prisma`: `npx prisma db push && npx prisma generate` y reiniciar el servidor.
