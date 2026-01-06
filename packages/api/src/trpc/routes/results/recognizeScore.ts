import { db } from 'db';
import { sql } from 'kysely';
import { recognizeScore } from 'services/results/recognizeScore';
import { publicProcedure } from 'trpc/trpc';
import { base64 } from 'utils/zod';
import { z } from 'zod';

export const recognizeScoreMutation = publicProcedure
  .input(
    z.object({
      image: base64,
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Not logged in');
    }

    try {
      const result = await recognizeScore(input.image.filePath);

      // Update the player's OpenAI token usage counters
      await db
        .updateTable('players')
        .set({
          openai_prompt_tokens: sql`openai_prompt_tokens + ${result.promptTokens}`,
          openai_completion_tokens: sql`openai_completion_tokens + ${result.completionTokens}`,
        })
        .where('id', '=', ctx.user.id)
        .execute();

      return result.numbers;
    } finally {
      await input.image.dispose();
    }
  });
