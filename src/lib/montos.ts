// Leer un valor escrito por una persona: «$1.200 millones», «1.200 M», «$1.200.000.000», «1,2 mil millones»,
// «USD 1.2 millones», «US$1,200,000». El modelo copia el texto tal cual; la cuenta la hace este código.

export type MontoLeido = { valor: number; moneda: "COP" | "USD" | null };

export function leerMonto(texto: string | null | undefined): MontoLeido | null {
  if (!texto) return null;
  const s = texto.toLowerCase().replace(/\s+/g, " ").trim();
  const moneda: MontoLeido["moneda"] = /us\$|usd|d[oó]lares/.test(s) ? "USD" : /\$|cop|pesos|millones|mil millones/.test(s) ? "COP" : null;
  const m = s.match(/(\d[\d.,]*)/);
  if (!m) return null;
  let num = m[1];
  // Separadores: «1.200.000», «1,200,000», «1.200,5», «1,2», «1.2»
  const puntos = (num.match(/\./g) ?? []).length, comas = (num.match(/,/g) ?? []).length;
  if (puntos && comas) num = num.lastIndexOf(",") > num.lastIndexOf(".") ? num.replace(/\./g, "").replace(",", ".") : num.replace(/,/g, "");
  else if (puntos > 1 || (puntos === 1 && /\.\d{3}$/.test(num))) num = num.replace(/\./g, "");
  else if (comas > 1 || (comas === 1 && /,\d{3}$/.test(num))) num = num.replace(/,/g, "");
  else num = num.replace(",", ".");
  let valor = Number(num);
  if (!Number.isFinite(valor)) return null;
  const resto = s.slice((m.index ?? 0) + m[1].length);
  if (/^\s*(mil millones|mm\b|mmm\b)/.test(resto)) valor *= 1_000_000_000;
  else if (/^\s*(millones|millón|millon|m\b|mill)/.test(resto)) valor *= 1_000_000;
  else if (/^\s*(mil\b|k\b)/.test(resto)) valor *= 1_000;
  return { valor: Math.round(valor), moneda };
}
