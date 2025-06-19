
import * as z from "zod";

export const CompanyProfileSchema = z.object({
  companyName: z.string().min(2, { message: "El nombre de la empresa debe tener al menos 2 caracteres." }).max(100, { message: "El nombre de la empresa no puede exceder los 100 caracteres." }),
  nit: z.string().min(5, { message: "El NIT debe tener al menos 5 caracteres." }).max(20, { message: "El NIT no puede exceder los 20 caracteres." }),
  phone: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }).max(15, { message: "El teléfono no puede exceder los 15 dígitos." }),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200, { message: "La dirección no puede exceder los 200 caracteres." }),
});

export type CompanyProfileFormData = z.infer<typeof CompanyProfileSchema>;

export interface CompanyProfileDocument extends CompanyProfileFormData {
  userId: string;
  createdAt: any; 
  updatedAt: any; 
}
