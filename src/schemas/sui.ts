
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Mapping for document types, making it reusable and the single source of truth.
export const TIPOS_IDENTIFICACION = {
  "1": "CC",
  "2": "CE",
  "3": "Pasaporte",
  "4": "NIT",
} as const;

// This creates a type from the keys of the mapping object (e.g., "1" | "2" | "3" | "4")
export type TipoIdentificacionKey = keyof typeof TIPOS_IDENTIFICACION;

// The Zod enum is now created dynamically from the keys of our mapping object.
export const TipoIdentificacionEnum = z.enum(Object.keys(TIPOS_IDENTIFICACION) as [TipoIdentificacionKey, ...TipoIdentificacionKey[]], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de identificación válido." }),
});

// Full labels for better user experience in dropdowns
export const TIPO_ID_LABELS: Record<TipoIdentificacionKey, string> = {
  "1": "Cédula de Ciudadanía (CC)",
  "2": "Cédula de Extranjería (CE)",
  "3": "Pasaporte",
  "4": "NIT",
};

export const AsociadoFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  tipoIdentificacion: TipoIdentificacionEnum,
  numeroIdentificacion: z.string().min(5, { message: "El número de documento debe tener al menos 5 caracteres." }).max(20),
  telefono: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }).max(15),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  placaVehiculo: z.string().max(10, "La placa no puede exceder 10 caracteres.").optional().nullable(),
  numacro: z.coerce.number({ invalid_type_error: "NUMACRO debe ser un número." }).optional().nullable(),
  nueca: z.coerce.number({ invalid_type_error: "NUECA debe ser un número." }).optional().nullable(),
});

export type AsociadoFormData = z.infer<typeof AsociadoFormSchema>;

// The document interface is updated to use the new key type.
export interface AsociadoDocument {
  id: string; // Firestore document ID
  nombre: string;
  tipoIdentificacion: TipoIdentificacionKey;
  numeroIdentificacion: string;
  telefono: string;
  direccion: string;
  placaVehiculo?: string | null;
  numacro?: number | null;
  nueca?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
