// Modo prueba: el agente solo le escribe a los dominios de ENVIO_DOMINIOS_PERMITIDOS (hoy agentmail.to).
// Cualquier correo real (de Conconcreto, de un cliente, de la interventoría) queda en borrador y no sale.
// Abrirlo es una decisión, no un cambio de rutina.

export function puedeEnviarA(correo: string): boolean {
  const permitidos = (process.env.ENVIO_DOMINIOS_PERMITIDOS ?? "agentmail.to").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const dominio = correo.split("@")[1]?.toLowerCase() ?? "";
  return permitidos.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}
