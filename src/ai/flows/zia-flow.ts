
'use server';
/**
 * @fileOverview ZIA, the ZYCLE Intelligent Assistant.
 * This flow powers a chat interface that can answer questions about a user's company data
 * by using a set of tools to access inventory, sales, and purchase information.
 *
 * - askZia - The main function to interact with the ZIA agent.
 * - ZiaInput - The input type for the askZia function.
 * - ZiaOutput - The return type for the askZia function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getInventory, getRecentPurchases, getRecentSales } from '@/services/data-service';

// Define schemas for conversation history
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ZiaInputSchema = z.object({
  query: z.string().describe("The user's current question or message."),
  history: z.array(MessageSchema).describe('The previous conversation history.'),
  userId: z.string().describe("The ID of the authenticated user."),
});
export type ZiaInput = z.infer<typeof ZiaInputSchema>;

const ZiaOutputSchema = z.object({
  response: z.string().describe("ZIA's response to the user's query."),
});
export type ZiaOutput = z.infer<typeof ZiaOutputSchema>;


// Wrapper function that will be called from the client.
// It now expects the userId to be part of the input.
export async function askZia(input: ZiaInput): Promise<ZiaOutput> {
    if (!input.userId) {
        throw new Error("User ID is missing from the request.");
    }
    // The input is passed directly to the flow, which expects the userId.
    return ziaFlow(input);
}

const ziaFlow = ai.defineFlow(
  {
    name: 'ziaFlow',
    inputSchema: ZiaInputSchema, // The userId is now part of the base schema
    outputSchema: ZiaOutputSchema,
  },
  async (input) => {
    const { userId, query, history } = input;

    // Define tools within the flow's scope to capture userId
    const getInventoryTool = ai.defineTool(
      {
        name: 'getInventory',
        description: "Returns a list of all materials in the company's inventory, including their current stock in kilograms.",
        inputSchema: z.object({}), // Model doesn't need to provide userId
        outputSchema: z.any(),
      },
      async () => getInventory(userId) // The tool uses the userId from the flow's closure
    );

    const getRecentPurchasesTool = ai.defineTool(
      {
        name: 'getRecentPurchases',
        description: 'Returns the 5 most recent purchase invoices, including items, totals, and dates. Useful for questions about recent buying activity.',
        inputSchema: z.object({}),
        outputSchema: z.any(),
      },
      async () => getRecentPurchases(userId, 5)
    );

    const getRecentSalesTool = ai.defineTool(
      {
        name: 'getRecentSales',
        description: 'Returns the 5 most recent sales invoices, including items, totals, and dates. Useful for questions about recent selling activity.',
        inputSchema: z.object({}),
        outputSchema: z.any(),
      },
      async () => getRecentSales(userId, 5)
    );

    const historyForGenkit = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    const prompt = `You are ZIA, the ZYCLE Intelligent Assistant. You are a friendly and helpful AI expert in recycling business operations.
    Your goal is to answer the user's questions about their company data using the tools you have.
    - Use the getInventory tool for questions about stock levels, what materials exist, or which materials are low.
    - Use the getRecentPurchases tool for questions about recent buying activity.
    - Use the getRecentSales tool for questions about recent selling activity.
    - When you get data from a tool, synthesize it into a natural, easy-to-read summary. For example, instead of dumping a JSON object, say "You have 5 materials with low stock, including Cardboard at 50kg and PET at 25kg."
    - Be concise.
    - IMPORTANT: Always respond in Spanish.
    - If you cannot answer the question with the available tools, say so politely.`;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: query,
      system: prompt,
      tools: [getInventoryTool, getRecentPurchasesTool, getRecentSalesTool],
      history: historyForGenkit,
    });
    
    return { response: output?.text || "Lo siento, no pude procesar tu solicitud en este momento. Por favor, intenta de nuevo." };
  }
);
