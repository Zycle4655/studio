
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

export const CargoFormSchema = z.object({
  name: z.string()
    .min(2, { message: "El nombre del cargo debe tener al menos 2 caracteres." })
    .max(50, { message: "El nombre del cargo no puede exceder los 50 caracteres." }),
});

export type CargoFormData = z.infer<typeof CargoFormSchema>;

export interface CargoDocument {
  id: string; // Firestore document ID
  name: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
