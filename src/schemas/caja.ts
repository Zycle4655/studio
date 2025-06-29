
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Schema for the form to open the cash box
export const AbrirCajaFormSchema = z.object({
  baseInicial: z.coerce
    .number({ invalid_type_error: "La base debe ser un número." })
    .min(0, "La base inicial no puede ser negativa."),
});
export type AbrirCajaFormData = z.infer<typeof AbrirCajaFormSchema>;

// Schema for adding money to the cash box
export const IngresoCajaFormSchema = z.object({
  monto: z.coerce
    .number({ required_error: "El monto es obligatorio.", invalid_type_error: "El monto debe ser un número." })
    .positive("El monto debe ser un número positivo."),
  observacion: z.string().max(100, "La observación no debe exceder 100 caracteres.").optional().nullable(),
});
export type IngresoCajaFormData = z.infer<typeof IngresoCajaFormSchema>;

// Schema for adding an expense
export const GastoCajaFormSchema = z.object({
    monto: z.coerce
        .number({ required_error: "El monto es obligatorio.", invalid_type_error: "El monto debe ser un número." })
        .positive("El monto debe ser un número positivo."),
    categoria: z.enum(["combustible", "peajes", "general"], { required_error: "Debe seleccionar una categoría." }),
    observacion: z.string().max(100, "La observación no debe exceder 100 caracteres.").optional().nullable(),
});
export type GastoCajaFormData = z.infer<typeof GastoCajaFormSchema>;


// Schema for the form to close the cash box
export const CerrarCajaFormSchema = z.object({
  saldoReal: z.coerce
    .number({ invalid_type_error: "El saldo real debe ser un número." })
    .min(0, "El saldo real no puede ser negativo."),
  observaciones: z.string().max(500, "Las observaciones no deben exceder 500 caracteres.").optional().nullable(),
});
export type CerrarCajaFormData = z.infer<typeof CerrarCajaFormSchema>;

interface TransaccionBase {
    id: string; // Unique ID for the transaction
    monto: number;
    fecha: Timestamp;
    observacion: string | null;
    registradoPor: { uid: string, email: string | null };
}

export interface IngresoAdicionalItem extends TransaccionBase {}

export interface GastoItem extends TransaccionBase {
    categoria: 'combustible' | 'peajes' | 'general';
}


// Interface for the daily cash box document in Firestore
export interface CajaDiariaDocument {
  id?: string; // YYYY-MM-DD
  fecha: Timestamp;
  baseInicial: number;
  
  totalVentasEfectivo: number;
  totalComprasEfectivo: number;

  totalIngresosAdicionales: number; 
  ingresosAdicionales: IngresoAdicionalItem[]; 
  
  totalGastos: number;
  gastos: GastoItem[];

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
