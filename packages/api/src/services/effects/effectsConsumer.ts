import { createEventConsumer } from '@pumpking/database/events';
import { recordStandings } from 'services/players/playersPp';
import { resultAddedEffect } from 'services/results/resultAddedEffect';
import { resultChangedEffect } from 'services/results/resultChangedEffect';

export const effectsConsumer = createEventConsumer('effects', async (event) => {
  switch (event.type) {
    case 'resultAdded':
      await resultAddedEffect(event.payload.resultId);
      break;
    case 'resultChanged':
      await resultChangedEffect(event.payload);
      break;
    case 'ppRecalculated':
      await recordStandings();
      break;
  }
});
