"use client";
import { Boton } from "@/components/ui";
import { IconoImprimir } from "@/components/iconos";

export function Imprimir() {
  return <Boton chico onClick={() => window.print()}><IconoImprimir />Imprimir</Boton>;
}
