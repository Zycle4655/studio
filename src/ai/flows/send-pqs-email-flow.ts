'use server';
/**
 * @fileOverview A flow to handle formatting PQS (Petitions, Complaints, Suggestions) emails.
 *
 * - sendPQS - A function that handles formatting the PQS submission into an email.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PQSEmailInputSchema, type PQSEmailInput } from '@/schemas/pqs';


const pqsEmailPrompt = ai.definePrompt({
  name: 'pqsEmailPrompt',
  input: {schema: PQSEmailInputSchema},
  prompt: `Eres un asistente encargado de formatear un correo electrónico profesional a partir de una Petición, Queja o Sugerencia (PQS) enviada por un colaborador.
  El correo será enviado a: {{{companyEmail}}}.
  
  Formatea el contenido del correo de la siguiente manera, manteniendo un tono formal y claro:
  
  Asunto del correo: Nueva PQS Recibida: {{{subject}}}
  
  Cuerpo del correo:
  Se ha recibido una nueva Petición, Queja o Sugerencia (PQS) a través del portal de colaboradores.
  
  **Detalles de la PQS:**
  
  - **Colaborador:** {{{collaboratorName}}}
  - **Correo del Colaborador:** {{{collaboratorEmail}}}
  - **Fecha de Envío:** (Deja un espacio para la fecha actual)
  - **Asunto:** {{{subject}}}
  
  **Mensaje:**
  {{{message}}}
  
  ---
  Este es un mensaje automático generado por la plataforma ZYCLE. Se recomienda dar seguimiento a esta solicitud a la brevedad.
  `,
});


// This flow simulates sending an email by formatting the content and logging it.
// In a real application, you would integrate an email sending service here (e.g., SendGrid, Mailgun) and pass the generated text to it.
const sendPQSEmailFlow = ai.defineFlow(
  {
    name: 'sendPQSEmailFlow',
    inputSchema: PQSEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    console.log("PQS Email Flow Initiated. Generating email content...");
    
    const { text } = await pqsEmailPrompt(input);
    
    console.log("////////////////// SIMULATED EMAIL //////////////////");
    console.log(`TO: ${input.companyEmail}`);
    console.log(text);
    console.log("///////////////////////////////////////////////////");

    // In a real scenario, you would use an email service here:
    // await emailService.send({
    //   to: input.companyEmail,
    //   subject: `Nueva PQS Recibida: ${input.subject}`,
    //   body: text,
    // });
    
    return { success: true };
  }
);


export async function sendPQS(input: PQSEmailInput): Promise<{ success: boolean }> {
    return sendPQSEmailFlow(input);
}
