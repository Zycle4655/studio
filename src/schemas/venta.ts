
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Esquema para el formulario de agregar/editar un ítem a la venta
export const VentaMaterialItemFormSchema = z.object({
  materialId: z.string().min(1, { message: "Debe seleccionar un material." }),
  peso: z.coerce
    .number({ invalid_type_error: "El peso debe ser un número." })
    .positive({ message: "El peso debe ser un número positivo." })
    .min(0.01, { message: "El peso debe ser mayor a 0." }),
  precioUnitario: z.coerce 
    .number({ invalid_type_error: "El precio unitario debe ser un número."})
    .positive({ message: "El precio unitario debe ser un número positivo."})
    .min(0.01, { message: "El precio debe ser mayor a $0.01."})
    .optional(), 
});

export type VentaMaterialItemFormData = z.infer<typeof VentaMaterialItemFormSchema>;

// Interface para un ítem dentro de la lista de venta (en el cliente, antes de guardar la factura)
export interface VentaMaterialItem {
  id: string; 
  materialId: string; 
  materialName: string;
  materialCode?: string | null;
  peso: number;
  precioUnitario: number; 
  subtotal: number; 
}

// Esquema para el formulario de facturación (encabezado)
export const FacturaVentaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  formaDePago: z.enum(["efectivo", "nequi", "cheque"], { required_error: "La forma de pago es obligatoria."}),
  clienteNombre: z.string().max(100, "El nombre del cliente no puede exceder los 100 caracteres.").optional().nullable(),
  observaciones: z.string().max(500, "Las observaciones no pueden exceder los 500 caracteres.").optional().nullable(),
});

export type FacturaVentaFormData = z.infer<typeof FacturaVentaFormSchema>;


// Interface para el documento de una Factura de Venta como se guarda/lee de Firestore
export interface FacturaVentaDocument {
  id?: string; 
  userId: string; 
  fecha: Timestamp; 
  clienteNombre?: string | null; 
  items: VentaMaterialItem[]; 
  totalFactura: number;
  numeroFactura: number; 
  formaDePago: "efectivo" | "nequi" | "cheque"; 
  observaciones?: string | null; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

