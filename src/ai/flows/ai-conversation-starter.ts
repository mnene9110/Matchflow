'use server';
/**
 * @fileOverview An AI agent that generates personalized conversation starters.
 *
 * - generateConversationStarters - A function that handles the generation of conversation starters.
 * - ConversationStarterInput - The input type for the generateConversationStarters function.
 * - ConversationStarterOutput - The return type for the generateConversationStarters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationStarterInputSchema = z.object({
  otherUserBio: z
    .string()
    .describe("The other user's biography or 'about me' section."),
  otherUserInterests: z
    .array(z.string())
    .describe("A list of the other user's interests or hobbies."),
  otherUserPhotosDescription: z
    .string()
    .optional()
    .describe(
      "A brief description of what is visible in the other user's profile photos (e.g., 'holding a guitar', 'hiking in mountains')."
    ),
});
export type ConversationStarterInput = z.infer<
  typeof ConversationStarterInputSchema
>;

const ConversationStarterOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of personalized conversation starter questions or statements.'),
});
export type ConversationStarterOutput = z.infer<
  typeof ConversationStarterOutputSchema
>;

const conversationStarterPrompt = ai.definePrompt({
  name: 'conversationStarterPrompt',
  input: {schema: ConversationStarterInputSchema},
  output: {schema: ConversationStarterOutputSchema},
  prompt: `You are an expert dating assistant specializing in crafting engaging and personalized icebreaker questions.

Your goal is to generate 3-5 unique and interesting conversation starters based on the other user's profile information. Make them friendly, open-ended, and designed to encourage a genuine response.

Here is the other user's profile information:

Biography: {{{otherUserBio}}}

Interests: {{#if otherUserInterests}}{{#each otherUserInterests}}- {{{this}}}
{{/each}}{{else}}No specific interests listed.{{/if}}

{{#if otherUserPhotosDescription}}
Photos Description: {{{otherUserPhotosDescription}}}
{{/if}}

Generate a list of 3-5 conversation starters in JSON format, ensuring each suggestion is a string in the 'suggestions' array. Do not add any extra text or formatting outside of the JSON array.

Example Output: 
{
  "suggestions": [
    "Looks like you enjoy hiking! What's been your favorite trail so far?",
    "That's an interesting bio, what inspired you to write it?",
    "Your photos look great! I love that picture where you're [mention something from photosDescription]. What's the story behind it?"
  ]
}`,
});

const conversationStarterFlow = ai.defineFlow(
  {
    name: 'conversationStarterFlow',
    inputSchema: ConversationStarterInputSchema,
    outputSchema: ConversationStarterOutputSchema,
  },
  async (input) => {
    const {output} = await conversationStarterPrompt(input);
    return output!;
  }
);

export async function generateConversationStarters(
  input: ConversationStarterInput
): Promise<ConversationStarterOutput> {
  return conversationStarterFlow(input);
}
