// Usuarios de prueba, uno por rol, para las pruebas de acceso y de pantallas.
//
//   npx tsx scripts/usuarios-prueba.ts crear <archivo.json>   crea los cinco y escribe sus claves en ese archivo (fuera del repo)
//   npx tsx scripts/usuarios-prueba.ts borrar                 los borra con sus sesiones
//
// Las claves son al azar y no se imprimen. Al terminar de probar, se borran: no se dejan cuentas con claves conocidas.
import "./_env";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { cifrarClave } from "../src/lib/auth/clave";
import { PRUEBA, correoDe } from "./demo/usuarios";

(async () => {
  const [orden, archivo] = process.argv.slice(2);
  if (orden === "crear") {
    if (!archivo) throw new Error("Falta el archivo donde guardar las claves.");
    const claves: Record<string, { correo: string; clave: string }> = {};
    for (const u of PRUEBA) {
      const clave = `Pr${randomBytes(9).toString("base64url")}9`;
      const correo = correoDe(u.rol);
      await db.usuario.upsert({ where: { correo }, update: { nombre: u.nombre, rol: u.rol, hash: await cifrarClave(clave), debeCambiarClave: false, activo: true }, create: { correo, nombre: u.nombre, rol: u.rol, hash: await cifrarClave(clave), debeCambiarClave: false } });
      claves[u.rol] = { correo, clave };
    }
    fs.writeFileSync(archivo, JSON.stringify(claves, null, 2));
    console.log(`Creados ${PRUEBA.length} usuarios de prueba. Claves en ${archivo}.`);
  } else if (orden === "borrar") {
    const r = await db.usuario.deleteMany({ where: { correo: { endsWith: "@facturacion-caja.test" } } });
    await db.intentoIngreso.deleteMany({ where: { correo: { endsWith: "@facturacion-caja.test" } } });
    console.log(`Borrados ${r.count} usuarios de prueba.`);
  } else {
    console.error("Uso: crear <archivo.json> | borrar");
    process.exit(1);
  }
})().finally(() => db.$disconnect());
