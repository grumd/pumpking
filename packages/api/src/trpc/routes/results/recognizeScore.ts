import { db } from 'db';
import { sql } from 'kysely';
import { recognizeScore } from 'services/results/recognizeScore';
import { addResultProcedure } from 'trpc/trpc';
import { getPhoenixScore } from 'utils/scoring/phoenixScore';
import { base64 } from 'utils/zod';
import { z } from 'zod';

export const recognizeScoreMutation = addResultProcedure
  .input(
    z.object({
      image: base64,
      mix: z.enum(['Phoenix', 'XX', 'Prime2', 'Prime']),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Not logged in');
    }

    try {
      const result = await recognizeScore(input.image.filePath, input.mix);

      // Update the player's OpenAI token usage counters
      await db
        .updateTable('players')
        .set({
          openai_prompt_tokens: sql`openai_prompt_tokens + ${result.promptTokens}`,
          openai_completion_tokens: sql`openai_completion_tokens + ${result.completionTokens}`,
        })
        .where('id', '=', ctx.user.id)
        .execute();

      if (input.mix === 'Phoenix') {
        // Calculate and insert the score
        return [
          ...result.numbers.slice(0, 6),
          getPhoenixScore({
            perfect: result.numbers[0],
            great: result.numbers[1],
            good: result.numbers[2],
            bad: result.numbers[3],
            miss: result.numbers[4],
            combo: result.numbers[5],
          }),
          ...result.numbers.slice(6),
        ];
      }

      return result.numbers;
    } finally {
      await input.image.dispose();
    }
  });
