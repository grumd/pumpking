import { createEventConsumer } from '@pumpking/core/events';
import { resultAddedEffect } from 'services/results/resultAddedEffect';

// Computes what follows from new events: pp, exp, player totals, pp history. Polled by
// jobs/effectsJob.ts
export const effectsConsumer = createEventConsumer('effects', async (event) => {
  switch (event.type) {
    case 'resultAdded':
      await resultAddedEffect(event.payload.resultId);
      break;
  }
});
