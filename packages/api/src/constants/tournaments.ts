export type BracketCode = 'Easy' | 'Mid' | 'High' | 'Top';

export interface LadderSlot {
  level: number;
  type: 'S' | 'D';
}

export interface BracketConfig {
  code: BracketCode;
  name: string;
  // player skill range [minSkill, maxSkill); minSkill null = also collects unrated players
  minSkill: number | null;
  maxSkill: number;
  ladder: LadderSlot[];
}

export const TOURNAMENT_BRACKETS: BracketConfig[] = [
  {
    code: 'Easy',
    name: 'Easy',
    minSkill: null,
    maxSkill: 14,
    ladder: [
      { level: 11, type: 'S' },
      { level: 11, type: 'S' },
      { level: 12, type: 'S' },
      { level: 12, type: 'S' },
      { level: 13, type: 'S' },
      { level: 13, type: 'S' },
    ],
  },
  {
    code: 'Mid',
    name: 'Mid',
    minSkill: 14,
    maxSkill: 17,
    ladder: [
      { level: 14, type: 'S' },
      { level: 14, type: 'D' },
      { level: 15, type: 'S' },
      { level: 15, type: 'S' },
      { level: 16, type: 'S' },
      { level: 16, type: 'S' },
    ],
  },
  {
    code: 'High',
    name: 'High',
    minSkill: 17,
    maxSkill: 20,
    ladder: [
      { level: 17, type: 'S' },
      { level: 17, type: 'D' },
      { level: 18, type: 'S' },
      { level: 18, type: 'D' },
      { level: 19, type: 'S' },
      { level: 19, type: 'D' },
    ],
  },
  {
    code: 'Top',
    name: 'Top',
    minSkill: 20,
    maxSkill: 28,
    ladder: [
      { level: 20, type: 'S' },
      { level: 20, type: 'D' },
      { level: 21, type: 'S' },
      { level: 21, type: 'D' },
      { level: 22, type: 'S' },
      { level: 22, type: 'D' },
    ],
  },
];

export const TQ_QUALIFY_SCORE = 950_000;
export const SKILL_CHARTS_REQUIRED = 5;
export const SKILL_WINDOW_DAYS = 180;
export const COUNTED_CHARTS = 3;
// A player gets a place (and so a cup) only with scores on at least this many pool charts.
export const RANKED_MIN_CHARTS = 3;
export const FRESH_POOL_MONTHS = 2;
export const TOURNAMENT_END_DAY = 25;
export const SITE_TIMEZONE = 'Europe/Warsaw';
