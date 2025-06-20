
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

export const CompanyProfileSchema = z.object({
  companyName: z.string().min(2, { message: "El nombre de la empresa debe tener al menos 2 caracteres." }).max(100, { message: "El nombre de la empresa no puede exceder los 100 caracteres." }),
  nit: z.string().min(5, { message: "El NIT debe tener al menos 5 caracteres." }).max(20, { message: "El NIT no puede exceder los 20 caracteres." }),
  phone: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }).max(15, { message: "El teléfono no puede exceder los 15 dígitos." }),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200, { message: "La dirección no puede exceder los 200 caracteres." }),
  email: z.string().email({ message: "Por favor ingrese un correo electrónico válido." }),
  logoUrl: z.string().url({ message: "La URL del logo debe ser válida." }).optional().nullable(),
});

export type CompanyProfileFormData = z.infer<typeof CompanyProfileSchema>;

// CompanyProfileDocument representa los datos que se guardan en Firestore para el perfil de la empresa.
export interface CompanyProfileDocument {
  userId: string;
  companyName: string;
  nit: string;
  phone: string;
  address: string;
  logoUrl?: string | null; // Nuevo campo para la URL del logo
  createdAt: Timestamp; // Asegúrate que Timestamp sea el tipo correcto de Firestore
  updatedAt: Timestamp; // Asegúrate que Timestamp sea el tipo correcto de Firestore
}

