import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

export const TipoIdentificacionEnum = z.enum(["CC", "NIT", "CE"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de identificación válido." }),
});

export const AsociadoFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  tipoIdentificacion: TipoIdentificacionEnum,
  numeroIdentificacion: z.string().min(5, { message: "El número de identificación debe tener al menos 5 caracteres." }).max(20),
  telefono: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }).max(15),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  placaVehiculo: z.string().max(10, "La placa no puede exceder 10 caracteres.").optional().nullable(),
  numacro: z.coerce.number({ invalid_type_error: "NUMACRO debe ser un número." }).optional().nullable(),
  nueca: z.coerce.number({ invalid_type_error: "NUECA debe ser un número." }).optional().nullable(),
});

export type AsociadoFormData = z.infer<typeof AsociadoFormSchema>;

export interface AsociadoDocument {
  id: string; // Firestore document ID
  nombre: string;
  tipoIdentificacion: "CC" | "NIT" | "CE";
  numeroIdentificacion: string;
  telefono: string;
  direccion: string;
  placaVehiculo?: string | null;
  numacro?: number | null;
  nueca?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
