
"use client";

import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Using a const object for roles allows us to easily get both keys and values.
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
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If password is not provided (i.e. when editing), skip validation.
  if (!data.password) {
    return true;
  }
  // If password is provided, it must have a confirmation that matches.
  return data.password === data.confirmPassword;
}, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"], // Apply error to the confirmation field
}).refine((data) => {
    // If password is provided, it must meet length requirement.
    if (data.password && data.password.length < 6) {
        return false;
    }
    return true;
}, {
    message: "La contraseña debe tener al menos 6 caracteres.",
    path: ["password"],
});


export type CollaboratorFormData = z.infer<typeof CollaboratorFormSchema>;

// The interface for the document stored in Firestore.
export interface CollaboratorDocument {
  id: string; // Firestore document ID
  // authUid?: string; // To be linked to a Firebase Auth user in the future
  nombre: string;
  email: string;
  rol: string; // The "cargo" name
  permissions: Permissions;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
