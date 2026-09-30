import { distance } from 'fastest-levenshtein';

// Levenshtein distance, as the legacy `editdistance.eval`
export const editDistance = (a: string, b: string) => distance(a, b);

// Applied in this order, so that minor visual differences in recognized track names
// don't count (legacy `tracklist.charNormalization`)
const CHAR_NORMALIZATION: [string, string][] = [
  ['{', '('],
  ['}', ')'],
  ['[', '('],
  [']', ')'],
  ['–', '-'],
  ['~', '-'],
  ['`', "'"],
  ['’', "'"],
  ['‘', "'"],
  ['°', "'"],
  ["'", ''],
  ['“', '"'],
  ['”', '"'],
  ['¢', 'c'],
  ['0', 'o'],
  ['|', 'l'],
  ['i', 'l'],
  ['.', ''],
  [',', ''],
  [' ', ''],
];

export const normalizeTrackName = (name: string) => {
  let result = name.toLowerCase();
  for (const [from, to] of CHAR_NORMALIZATION) {
    result = result.replaceAll(from, to);
  }
  return result;
};
