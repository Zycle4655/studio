
"use client";

import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Using a const object for roles allows us to easily get both keys and values.
// This is now only used for the role simulator and default permissions.
export const DEFAULT_ROLES = {
  admin: "Administrador",
  bodeguero: "Bodeguero",
  recolector: "Recolector", // Kept for future mobile app use
} as const;

export type DefaultRole = keyof typeof DEFAULT_ROLES;


export const permissionsSchema = z.object({
    gestionMaterial: z.boolean().default(false),
    transporte: z.boolean().default(false),
    reportes: z.boolean().default(false),
    sui: z.boolean().default(false),
    talentoHumano: z.boolean().default(false),
    equipo: z.boolean().default(false),
});

export type Permissions = z.infer<typeof permissionsSchema>;

// The Zod schema for the form.
export const CollaboratorFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  rol: z.string().min(1, { message: "Debe seleccionar un cargo." }),
  permissions: permissionsSchema,
});

export type CollaboratorFormData = z.infer<typeof CollaboratorFormSchema>;

// The interface for the document stored in Firestore.
export interface CollaboratorDocument {
  id: string; // Firestore document ID
  // Note: We are not handling the collaborator's own Firebase Auth UID yet.
  // This will be added when we implement the invitation/linking logic.
  nombre: string;
  email: string;
  rol: string; // The "cargo" name
  permissions: Permissions; // New granular permissions for future use
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
