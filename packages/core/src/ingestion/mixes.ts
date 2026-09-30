import { isMillionScoringMix } from '../constants/mixes';

// Every mix name piu-spy may send, in order: a mix's id is its position + 1 (the legacy
// `constants.mixesList`, which the `mixes` table follows)
const MIX_NAMES = [
  '1st',
  '2nd',
  'OBG',
  'OBG_SE',
  'Collection',
  'Perfect',
  'Extra',
  'Premiere',
  'Prex',
  'Premiere2',
  'Rebirth',
  'Prex2',
  'Premiere3',
  'Prex3',
  'Exceed',
  'Exceed2',
  'Zero',
  'NX',
  'NX2',
  'NXA',
  'Fiesta',
  'FiestaEX',
  'Fiesta2',
  'Prime',
  'Prime2',
  'XX',
  'Phoenix',
  'Phoenix2',
];

export const findMixId = (mixName: string): number | null => {
  const index = MIX_NAMES.indexOf(mixName);
  return index === -1 ? null : index + 1;
};

export const mixNameHasMillionScoring = (mixName: string) => {
  const mixId = findMixId(mixName);
  return mixId != null && isMillionScoringMix(mixId);
};

// Phoenix 2 shows player names as `NICKNAME #1234`: the spaces are part of the name there
export const MIX_NAMES_WITH_IDS_IN_PLAYER_NAMES = ['Phoenix2'];
