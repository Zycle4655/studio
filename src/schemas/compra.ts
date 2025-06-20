
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
  id: string; // ID local para manejo en UI (ej: para key en listas, o para editar/eliminar antes de facturar)
  materialId: string; // ID del MaterialDocument de Firestore
  materialName: string;
  materialCode?: string | null;
  peso: number;
  precioUnitario: number; // Precio del material al momento de agregarlo a la compra
  subtotal: number; // peso * precioUnitario
}

// Interface para el documento de una Factura de Compra como se guarda/lee de Firestore
export interface FacturaCompraDocument {
  id: string; // ID del documento de Firestore
  userId: string; // UID del usuario que creó la factura
  fecha: Timestamp; // Fecha de creación de la factura
  proveedorId?: string | null; // Opcional: ID del proveedor si se manejan
  proveedorNombre?: string | null; // Opcional: Nombre del proveedor
  items: CompraMaterialItem[]; // Array de ítems comprados
  totalFactura: number;
  observaciones?: string | null;
  numeroFactura?: string | null; // Número de factura asignado por el sistema o manual
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

    