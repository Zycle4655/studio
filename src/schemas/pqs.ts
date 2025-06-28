
import * as z from "zod";

export const PQSFormSchema = z.object({
  asunto: z.string().min(5, "El asunto debe tener al menos 5 caracteres.").max(100, "El asunto no puede exceder los 100 caracteres."),
  mensaje: z.string().min(20, "El mensaje debe tener al menos 20 caracteres.").max(2000, "El mensaje no puede exceder los 2000 caracteres."),
});

export type PQSFormData = z.infer<typeof PQSFormSchema>;
