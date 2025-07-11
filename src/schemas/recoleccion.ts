
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Simple item for the collection list
export const RecoleccionItemSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  materialName: z.string(),
  peso: z.coerce.number().positive("El peso debe ser un número positivo."),
  precioUnitario: z.coerce.number().min(0, "El precio no puede ser negativo.").default(0),
  subtotal: z.coerce.number().min(0).default(0),
});
export type RecoleccionItem = z.infer<typeof RecoleccionItemSchema>;

// Schema for the main collection form
export const RecoleccionFormSchema = z.object({
  fuenteId: z.string().min(1, "Debe seleccionar una fuente."),
  items: z.array(RecoleccionItemSchema).min(1, "Debe agregar al menos un material."),
  firmaDataUrl: z.string().min(1, "Se requiere la firma del encargado."),
  selloFile: z.instanceof(File).optional().nullable(),
  observaciones: z.string().max(500, "Las observaciones no pueden exceder 500 caracteres.").optional().nullable(),
});
export type RecoleccionFormData = z.infer<typeof RecoleccionFormSchema>;

// Document stored in Firestore
export interface RecoleccionDocument {
  id?: string;
  userId: string;
  fuenteId: string;
  fuenteNombre: string;
  encargadoNombre: string;
  vehiculoId?: string | null;
  vehiculoPlaca?: string | null;
  registradoPorNombre?: string;
  fecha: Timestamp;
  items: RecoleccionItem[];
  totalPeso: number;
  totalValor: number;
  firmaDataUrl: string; // The base64 data URL of the signature
  selloImageUrl?: string | null; // URL to the image in Firebase Storage
  observaciones?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
