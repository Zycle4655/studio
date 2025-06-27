
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Schema for registering a payment (abono)
export const AbonoFormSchema = z.object({
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser positivo." }),
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
});
export type AbonoFormData = z.infer<typeof AbonoFormSchema>;

// Schema for the main loan form
export const PrestamoFormSchema = z.object({
  tipoBeneficiario: z.enum(['asociado', 'colaborador'], {
    required_error: "Debe seleccionar un tipo de beneficiario.",
  }),
  beneficiarioId: z.string().min(1, { message: "Debe seleccionar un beneficiario." }),
  monto: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser positivo." })
    .min(1, { message: "El monto debe ser al menos 1." }),
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  observaciones: z.string().max(500, "Las observaciones no deben exceder 500 caracteres.").optional().nullable(),
});
export type PrestamoFormData = z.infer<typeof PrestamoFormSchema>;

// Interface for a single payment in the 'abonos' array
export interface Abono {
  id: string; // Unique ID for the payment, e.g., timestamp + random string
  monto: number;
  fecha: Timestamp;
  observacion?: string; // Optional: To add notes like "From Purchase Invoice #123"
}

// Main document interface for a loan in Firestore
export interface PrestamoDocument {
  id?: string; // Firestore document ID
  userId: string;
  
  tipoBeneficiario: 'asociado' | 'colaborador';
  beneficiarioId: string;
  beneficiarioNombre: string;

  monto: number;
  fecha: Timestamp;
  estado: 'Pendiente' | 'Pagado';
  abonos: Abono[];
  saldoPendiente: number;
  observaciones?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
