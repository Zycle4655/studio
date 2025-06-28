
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Schema for the form to add/edit a source point
export const FuenteFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre de la fuente debe tener al menos 3 caracteres." }).max(100),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  tipo: z.enum(['venta', 'donacion'], {
    required_error: "Debe seleccionar si la fuente es de venta o donación.",
  }),
  encargadoNombre: z.string().min(3, { message: "El nombre del encargado debe tener al menos 3 caracteres." }).max(100),
  encargadoTelefono: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }).max(15),
  encargadoEmail: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().nullable(),
});

export type FuenteFormData = z.infer<typeof FuenteFormSchema>;

// Interface for the Fuente document in Firestore
export interface FuenteDocument {
  id: string; // Firestore document ID
  nombre: string;
  direccion: string;
  tipo: 'venta' | 'donacion';
  encargadoNombre: string;
  encargadoTelefono: string;
  encargadoEmail?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
