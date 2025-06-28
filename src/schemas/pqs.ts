import * as z from "zod";

export const PQSFormSchema = z.object({
  asunto: z.string().min(5, "El asunto debe tener al menos 5 caracteres.").max(100, "El asunto no puede exceder los 100 caracteres."),
  mensaje: z.string().min(20, "El mensaje debe tener al menos 20 caracteres.").max(2000, "El mensaje no puede exceder los 2000 caracteres."),
});

export type PQSFormData = z.infer<typeof PQSFormSchema>;

// Schema for the data sent to the AI flow
export const PQSEmailInputSchema = z.object({
  collaboratorName: z.string().describe("The name of the collaborator submitting the form."),
  collaboratorEmail: z.string().email().describe("The email address of the collaborator."),
  subject: z.string().describe("The subject of the PQS submission."),
  message: z.string().describe("The detailed message from the collaborator."),
  companyEmail: z.string().email().describe("The company's email address where the PQS should be sent."),
});

export type PQSEmailInput = z.infer<typeof PQSEmailInputSchema>;
