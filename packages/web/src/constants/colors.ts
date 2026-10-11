import { highlightColors, mixColor } from 'theme/tokens';

import type { MixNumbers } from 'utils/scoring/grades';

// Kept for the leaderboard until it moves to the tokens directly
export const colorByMix: Record<MixNumbers, string> = {
  24: mixColor(24) as string,
  25: mixColor(25) as string,
  26: mixColor(26) as string,
  27: mixColor(27) as string,
  28: mixColor(28) as string,
};

export const colorsArray = highlightColors;
