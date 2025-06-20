
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

export const MaterialFormSchema = z.object({
  name: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
    .max(100, { message: "El nombre no puede exceder los 100 caracteres." }),
  price: z.coerce // Convierte el string del input a número
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive({ message: "El precio debe ser un número positivo." })
    .min(0.01, { message: "El precio debe ser mayor a $0.01." })
    // Para asegurar un máximo de dos decimales, la validación se puede hacer en el submit
    // o confiar en el step="0.01" del input, Zod no tiene una forma directa sencilla para esto.
  ,
  code: z.string()
    .max(50, { message: "El código no puede exceder los 50 caracteres." })
    .optional()
    .nullable(), // El código es opcional
});

export type MaterialFormData = z.infer<typeof MaterialFormSchema>;

// Interface para el documento de Material como se guarda/lee de Firestore
export interface MaterialDocument {
  id: string; // ID del documento de Firestore
  name: string;
  price: number;
  code?: string | null; // Nuevo campo para el código del material
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
