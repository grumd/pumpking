// Raw values of the design tokens. The only place in the app with hex colors.
// theme.ts turns the named colors into Mantine colors, cssVariables.ts into --pk-* variables.
// See DESIGN.md for when to use which.
import type { GradePhoenix } from 'utils/scoring/grades';

// Registered as Mantine colors: usable as c="single", color="gold", var(--mantine-color-single-filled)
export const appColors = {
  // Chart types
  single: '#903034',
  singlePerf: '#973894',
  halfDouble: '#3070d0',
  double: '#38a532',
  doublePerf: '#357497',
  coop: '#8e8b2a',
  // Mixes (translucent, like the old badges)
  mix24: '#48283a99',
  mix25: '#432a4e99',
  mix26: '#2d2a4e99',
  mix27: '#2a434e99',
  mix28: '#2a4e4399',
  // Step judgements
  perfect: '#29d7ff',
  great: '#21d021',
  good: '#dede3a',
  bad: '#f278fc',
  miss: '#f48181',
  // Medals
  gold: '#e8b923',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
  // Accents
  accent: '#88d3ff',
  fresh: '#afe488',
  discord: '#5865f2',
} as const;

export type AppColor = keyof typeof appColors;

// The Discord button's hover shade
export const discordHover = '#4752c4';

export const mixColor = (mix: number): AppColor | undefined => {
  switch (mix) {
    case 24:
      return 'mix24';
    case 25:
      return 'mix25';
    case 26:
      return 'mix26';
    case 27:
      return 'mix27';
    case 28:
      return 'mix28';
    default:
      return undefined;
  }
};

// Max widths of a page (PageContainer). default is about 950px on desktop
export const pageWidths = {
  default: '53rem',
  narrow: '26rem',
  wide: '82.5rem',
} as const;

// Color-scheme dependent values, written to CSS variables by cssVariables.ts
export const darkScheme = {
  text: '#eeeeee',
  textStrong: '#ffffff',
  // WCAG AA (4.5:1) on the page, every surface and the stripe
  dimmed: '#b3b3b3',
  placeholder: '#969696',
  surfacePage: '#242424',
  surfaceSunken: '#1f1f1f',
  surface1: '#2e2e2e',
  surface2: '#3b3b3b',
  surfaceStripe: '#444444',
  surface3: '#424242',
  border: '#424242',
  focusRing: appColors.accent,
  opacityHidden: '0.35',
  progressTrack: '#777777',
  graphAxis: '#8c8c8c',
  graphGrid: '#4a4a4a',
  graphReference: '#bbbbbb',
  tintPerfect: 'rgba(0, 255, 255, 0.05)',
  tintGreat: 'rgba(0, 255, 0, 0.05)',
  tintGood: 'rgba(255, 255, 0, 0.05)',
  tintBad: 'rgba(255, 0, 255, 0.05)',
  tintMiss: 'rgba(255, 0, 0, 0.05)',
  glowBronze: 'rgba(0, 0, 0, 0.13)',
  glowSilver: 'rgba(255, 255, 255, 0.33)',
  glowGold: '#ffd700',
  glowGreen: '#008000',
  glowPurple: '#793ab1',
};

// One color per Phoenix grade, for the profile graphs. Use them through gradeColorVar()
export const gradeColors: Record<GradePhoenix, string> = {
  'SSS+': '#32f1f1',
  SSS: '#16d4d4',
  'SS+': '#ffd900',
  SS: '#debc00',
  'S+': '#c1a400',
  S: '#a78e00',
  'AAA+': '#c4cde0',
  AAA: '#a2abb5',
  'AA+': '#c36134',
  AA: '#a85027',
  'A+': '#7a4228',
  A: '#5a3b2d',
  B: '#6e5a83',
  C: '#5f4f6f',
  D: '#4a4155',
  F: '#480404',
};

// Colors of highlighted players on the leaderboard, in order: --pk-highlight-0, -1...
export const highlightColors = [
  '#4DB3FF',
  '#80B300',
  '#FF6655',
  '#FF99E6',
  '#33FFCC',
  '#e633c8',
  '#dbe812',
  '#FF1A66',
  '#991AFF',
  '#E6B333',
  '#1AB399',
  '#4D8066',
  '#CC9999',
  '#00E680',
  '#809980',
  '#E6FF80',
  '#1AFF33',
  '#999933',
  '#E6331A',
  '#CCCC00',
  '#66E64D',
  '#4D80CC',
  '#9900B3',
  '#4DB380',
  '#FF4D4D',
];

// 'SSS+' -> 'var(--pk-grade-sss-plus)'
export const gradeVarName = (grade: GradePhoenix) =>
  `--pk-grade-${grade.toLowerCase().replace('+', '-plus')}`;
export const gradeColorVar = (grade: GradePhoenix) => `var(${gradeVarName(grade)})`;
