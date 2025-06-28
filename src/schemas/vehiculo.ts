
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

export const TIPOS_VEHICULO = {
  "camion": "Camión",
  "camioneta": "Camioneta",
  "moto": "Motocicleta",
  "motocarro": "Motocarro",
  "otro": "Otro",
} as const;

export type TipoVehiculoKey = keyof typeof TIPOS_VEHICULO;

export const VehiculoFormSchema = z.object({
  placa: z.string().min(3, "La placa debe tener al menos 3 caracteres.").max(10, "La placa no puede exceder 10 caracteres.").transform(val => val.toUpperCase()),
  marca: z.string().min(2, "La marca debe tener al menos 2 caracteres.").max(50),
  modelo: z.string().min(2, "El modelo debe tener al menos 2 caracteres.").max(50),
  tipo: z.enum(Object.keys(TIPOS_VEHICULO) as [TipoVehiculoKey, ...TipoVehiculoKey[]], {
    required_error: "Debe seleccionar un tipo de vehículo."
  }),
});

export type VehiculoFormData = z.infer<typeof VehiculoFormSchema>;

export interface VehiculoDocument {
  id: string; // Firestore document ID
  placa: string;
  marca: string;
  modelo: string;
  tipo: TipoVehiculoKey;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
