
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Schema for the form to open the cash box
export const AbrirCajaFormSchema = z.object({
  baseInicial: z.coerce
    .number({ invalid_type_error: "La base debe ser un número." })
    .min(0, "La base inicial no puede ser negativa."),
});
export type AbrirCajaFormData = z.infer<typeof AbrirCajaFormSchema>;

// Schema for the form to close the cash box
export const CerrarCajaFormSchema = z.object({
  saldoReal: z.coerce
    .number({ invalid_type_error: "El saldo real debe ser un número." })
    .min(0, "El saldo real no puede ser negativo."),
  observaciones: z.string().max(500, "Las observaciones no deben exceder 500 caracteres.").optional().nullable(),
});
export type CerrarCajaFormData = z.infer<typeof CerrarCajaFormSchema>;

// Interface for the daily cash box document in Firestore
export interface CajaDiariaDocument {
  id?: string; // YYYY-MM-DD
  fecha: Timestamp;
  baseInicial: number;
  totalComprasEfectivo: number;
  totalVentasEfectivo: number;
  saldoEsperado: number;
  saldoReal: number | null; // Null until closed
  diferencia: number | null; // Null until closed
  estado: 'Abierta' | 'Cerrada';
  observaciones?: string | null;
  abiertoPor: { uid: string, email: string | null };
  cerradoPor?: { uid:string, email: string | null } | null; // Null until closed
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
