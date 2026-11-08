// Markdown mínimo para las respuestas de la conversación: párrafos, negrilla, listas, tablas y títulos.
// Sin HTML crudo: todo se arma como elementos de React, así que nada del texto se interpreta como código.
import type { ReactNode } from "react";

function enLinea(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-tinta">{p.slice(2, -2)}</strong> : p));
}

export function Markdown({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r/g, "").split("\n");
  const bloques: ReactNode[] = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) { i++; continue; }
    if (/^\s*\|/.test(l)) {
      const filas: string[][] = [];
      while (i < lineas.length && /^\s*\|/.test(lineas[i])) {
        const celdas = lineas[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!celdas.every((c) => /^:?-{2,}:?$/.test(c))) filas.push(celdas);
        i++;
      }
      const [enc, ...cuerpo] = filas;
      bloques.push(
        <div key={i} className="my-3 overflow-x-auto rounded-ctl border border-linea">
          <table className="w-full text-[13.5px]">
            <thead><tr className="bg-fondo text-left">{enc.map((c, k) => <th key={k} className="px-3 py-2 font-display text-[12.5px] font-semibold text-tinta-2">{enLinea(c)}</th>)}</tr></thead>
            <tbody>{cuerpo.map((f, k) => <tr key={k} className="border-t border-linea-2">{f.map((c, m) => <td key={m} className={`px-3 py-2 ${/^-?(US)?\$|^\d/.test(c) ? "tabular text-right" : ""}`}>{enLinea(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordenada = /^\s*\d+\./.test(l);
      const items: string[] = [];
      while (i < lineas.length && /^\s*([-*]|\d+\.)\s/.test(lineas[i])) { items.push(lineas[i].replace(/^\s*([-*]|\d+\.)\s/, "")); i++; }
      const Lista = ordenada ? "ol" : "ul";
      bloques.push(<Lista key={i} className={`my-2 space-y-1 pl-5 ${ordenada ? "list-decimal" : "list-disc"}`}>{items.map((t, k) => <li key={k}>{enLinea(t)}</li>)}</Lista>);
      continue;
    }
    const h = l.match(/^#{1,4}\s+(.*)$/);
    if (h) { bloques.push(<h4 key={i} className="mb-1 mt-4 text-[15px] font-bold">{enLinea(h[1])}</h4>); i++; continue; }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i].trim() && !/^\s*(\||[-*]\s|\d+\.\s|#)/.test(lineas[i])) { parrafo.push(lineas[i]); i++; }
    bloques.push(<p key={i} className="my-2">{enLinea(parrafo.join(" "))}</p>);
  }
  return <div className="text-[14.5px] leading-relaxed text-tinta-2">{bloques}</div>;
}
