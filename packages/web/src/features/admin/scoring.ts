import { MIXES } from '@pumpking/core/constants/mixes';

// Grades and plates for the admin forms, as the results store them. Mixes before Phoenix
// have combo scoring and their own grades; Phoenix on has plates

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

const COMBO_GRADES = [
  '?',
  'F',
  'F+',
  'D',
  'D+',
  'C',
  'C+',
  'B',
  'B+',
  'A',
  'A+',
  'S-',
  'S',
  'SS',
  'SSS',
];
const PHOENIX_GRADES = ['?', 'F', 'D', 'C', 'B', 'A', 'A+', 'AA', 'AA+', 'AAA', 'AAA+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+']; // prettier-ignore

export const PLATE_OPTIONS = [
  { value: 'RG', label: 'RG – Rough Game' },
  { value: 'FG', label: 'FG – Fair Game' },
  { value: 'TG', label: 'TG – Talented Game' },
  { value: 'MG', label: 'MG – Marvelous Game' },
  { value: 'SG', label: 'SG – Superb Game' },
  { value: 'EG', label: 'EG – Extreme Game' },
  { value: 'UG', label: 'UG – Ultimate Game' },
  { value: 'PG', label: 'PG – Perfect Game' },
];

export const PASS_OPTIONS = [
  { value: '1', label: 'Pass' },
  { value: '0', label: 'Fail' },
];

export const hasPlates = (mixId: number) => mixId >= MIXES.Phoenix;

export const gradeOptions = (mixId: number) =>
  toOptions(hasPlates(mixId) ? PHOENIX_GRADES : COMBO_GRADES);

// Purgatory rows have the mix's name only
export const mixIdByName = (mixName: string): number =>
  (MIXES as Record<string, number>)[mixName] ?? 0;

export const MIX_OPTIONS_WITH_ARCADE_NAMES = [
  { id: MIXES.XX, name: 'XX' },
  { id: MIXES.Phoenix, name: 'Phoenix' },
  { id: MIXES.Phoenix2, name: 'Phoenix 2' },
];

export const formatDate = (date: Date | string | null | undefined) =>
  date ? new Date(date).toLocaleString() : '—';

export const formatNumber = (value: number | null | undefined) =>
  value == null ? '—' : value.toLocaleString('en-US');
