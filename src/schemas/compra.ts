
import * as z from "zod";
import type { Timestamp } from "firebase/firestore";

// Esquema para el formulario de agregar/editar un ítem a la compra
export const CompraMaterialItemFormSchema = z.object({
  materialId: z.string().min(1, { message: "Debe seleccionar un material." }),
  peso: z.coerce
    .number({ invalid_type_error: "El peso debe ser un número." })
    .positive({ message: "El peso debe ser un número positivo." })
    .min(0.01, { message: "El peso debe ser mayor a 0." }),
  precioUnitario: z.coerce // Para permitir editar el precio en el form
    .number({ invalid_type_error: "El precio unitario debe ser un número."})
    .positive({ message: "El precio unitario debe ser un número positivo."})
    .min(0.01, { message: "El precio debe ser mayor a $0.01."})
    .optional(), 
});

export type CompraMaterialItemFormData = z.infer<typeof CompraMaterialItemFormSchema>;

// Interface para un ítem dentro de la lista de compra (en el cliente, antes de guardar la factura)
export interface CompraMaterialItem {
  id: string; // ID local para manejo en UI, o ID del material si es consistente
  materialId: string; 
  materialName: string;
  materialCode?: string | null;
  peso: number;
  precioUnitario: number; 
  subtotal: number; 
}

// Esquema para el formulario de facturación (encabezado)
export const FacturaCompraFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  formaDePago: z.enum(["efectivo", "nequi"], { required_error: "La forma de pago es obligatoria."}),
  
  tipoProveedor: z.enum(['general', 'asociado'], { required_error: "Debe seleccionar un tipo de usuario." }),
  
  proveedorNombre: z.string().max(100).optional().nullable(),
  proveedorId: z.string().optional().nullable(),

  observaciones: z.string().max(500, "Las observaciones no pueden exceder los 500 caracteres.").optional().nullable(),
}).refine(data => {
    // Si el tipo es 'asociado', se debe seleccionar un ID.
    if (data.tipoProveedor === 'asociado') {
        return !!data.proveedorId;
    }
    return true;
}, {
    message: "Si el tipo es 'Asociado', debe seleccionar uno de la lista.",
    path: ["proveedorId"],
}).refine(data => {
    // Si el tipo es 'asociado', el nombre del proveedor no debe estar vacío.
    if (data.tipoProveedor === 'asociado') {
        return !!data.proveedorNombre;
    }
    return true;
}, {
    message: "Si el tipo es 'Asociado', el nombre no puede estar vacío.",
    path: ["proveedorNombre"],
});


export type FacturaCompraFormData = z.infer<typeof FacturaCompraFormSchema>;


// Interface para el documento de una Factura de Compra como se guarda/lee de Firestore
export interface FacturaCompraDocument {
  id?: string; // ID del documento de Firestore (opcional aquí, se asigna al crear)
  userId: string; 
  fecha: Timestamp; 

  tipoProveedor: 'general' | 'asociado';
  proveedorId?: string | null;
  proveedorNombre?: string | null; 

  items: CompraMaterialItem[]; 
  totalFactura: number;
  numeroFactura: number; 
  formaDePago: "efectivo" | "nequi"; 
  observaciones?: string | null; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
