
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Esquema para el formulario de agregar un ítem a la compra
export const CompraMaterialItemFormSchema = z.object({
  materialId: z.string().min(1, { message: "Debe seleccionar un material." }),
  peso: z.coerce
    .number({ invalid_type_error: "El peso debe ser un número." })
    .positive({ message: "El peso debe ser un número positivo." })
    .min(0.01, { message: "El peso debe ser mayor a 0." }),
});

export type CompraMaterialItemFormData = z.infer<typeof CompraMaterialItemFormSchema>;

// Interface para un ítem dentro de la lista de compra (en el cliente, antes de guardar la factura)
export interface CompraMaterialItem {
  id: string; // ID local para manejo en UI
  materialId: string; 
  materialName: string;
  materialCode?: string | null;
  peso: number;
  precioUnitario: number; 
  subtotal: number; 
}

// Esquema para el formulario de facturación
export const FacturaCompraFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  formaDePago: z.enum(["efectivo", "nequi"], { required_error: "La forma de pago es obligatoria."}),
  proveedorNombre: z.string().max(100, "El nombre del proveedor no puede exceder los 100 caracteres.").optional().nullable(),
  proveedorIdentificacion: z.string().max(50, "La identificación del proveedor no puede exceder los 50 caracteres.").optional().nullable(),
  observaciones: z.string().max(500, "Las observaciones no pueden exceder los 500 caracteres.").optional().nullable(),
});

export type FacturaCompraFormData = z.infer<typeof FacturaCompraFormSchema>;


// Interface para el documento de una Factura de Compra como se guarda/lee de Firestore
export interface FacturaCompraDocument {
  id?: string; // ID del documento de Firestore (opcional aquí, se asigna al crear)
  userId: string; 
  fecha: Timestamp; 
  proveedorNombre?: string | null; 
  proveedorIdentificacion?: string | null;
  items: CompraMaterialItem[]; 
  totalFactura: number;
  numeroFactura: number; 
  formaDePago: "efectivo" | "nequi"; 
  observaciones?: string | null; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

    
