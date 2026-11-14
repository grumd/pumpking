import type { PhotoRead } from './reader';
import {
  calcPlate,
  COMBO_GRADES,
  getPhoenixGrade,
  minScoreForStats,
  PLATE_NAMES,
  type Plate,
} from '@pumpking/utils/grades';
import { isMillionScoringMix } from '@pumpking/utils/mixes';
import { isRankModeAllowed } from '@pumpking/utils/mods';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';

export type Mod = 'VJ' | 'HJ' | '';

export interface ChartCandidate {
  sharedChartId: number;
  chartInstanceId: number;
  songName: string;
  label: string;
  level: number | null;
  duration: string | null;
  minTotalSteps: number | null;
  maxTotalSteps: number | null;
  phoenixMinTotalSteps?: number | null;
  phoenixMaxTotalSteps?: number | null;
}

export interface PhotoValues {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
  score: number;
  grade: string;
  pass: boolean;
  mod: Mod;
}

export type Field = 'chart' | keyof PhotoValues;

export const JUDGEMENT_FIELDS = ['perfect', 'great', 'good', 'bad', 'miss'] as const;
export const NUMBER_FIELDS = [...JUDGEMENT_FIELDS, 'combo', 'score'] as const;
const ALL_FIELDS: Field[] = ['chart', ...NUMBER_FIELDS, 'grade', 'pass', 'mod'];

export interface ReadCheck {
  values: PhotoValues;
  chart: ChartCandidate | null;
  chartGuess: ChartCandidate | null;
  problems: Field[];
  stepsMismatch: boolean;
}

export type Decision =
  | { status: 'confident'; chart: ChartCandidate; values: PhotoValues }
  | {
      status: 'needsInput';
      chart: ChartCandidate | null;
      values: PhotoValues | null;
      readValues: PhotoValues[];
      fields: Field[];
    };

export const exactStepCount = (chart: ChartCandidate): number | null => {
  const known = chart.minTotalSteps != null || chart.maxTotalSteps != null;
  const min = known ? chart.minTotalSteps : chart.phoenixMinTotalSteps;
  const max = known ? chart.maxTotalSteps : chart.phoenixMaxTotalSteps;
  return min != null && min === max ? min : null;
};

const normalizeBadge = (badge: string) => badge.toUpperCase().replace(/\s+/g, '');

const plateFromText = (text: string): Plate | undefined => {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ').trim();
  const plates = Object.keys(PLATE_NAMES) as Plate[];
  const exact = plates.find((plate) => PLATE_NAMES[plate] === normalized);
  if (exact || normalized.length < 5) {
    return exact;
  }
  const containing = plates.filter((plate) => PLATE_NAMES[plate].includes(normalized));
  return containing.length === 1 ? containing[0] : undefined;
};

const readValues = (read: PhotoRead, millionScoring: boolean): PhotoValues => {
  const badges = read.mod_badges.map(normalizeBadge);
  const rank = badges.includes('VJ') || badges.includes('RANK');
  return {
    perfect: read.perfect,
    great: read.great,
    good: read.good,
    bad: read.bad,
    miss: read.miss,
    combo: read.max_combo,
    score: read.score,
    grade: read.grade.trim().toUpperCase(),
    pass: millionScoring ? read.plate_text != null : !read.stage_failed,
    mod: rank ? 'VJ' : badges.includes('HJ') ? 'HJ' : '',
  };
};

const checkChart = (values: PhotoValues, candidates: ChartCandidate[]) => {
  const steps = values.perfect + values.great + values.good + values.bad + values.miss;
  const fitting = candidates.filter((chart) => exactStepCount(chart) === steps);
  const chart = fitting.length === 1 ? fitting[0] : null;
  const chartGuess = !chart && candidates.length === 1 ? candidates[0] : null;
  const stepsMismatch =
    fitting.length === 0 && candidates.some((candidate) => exactStepCount(candidate) != null);
  let problems: Field[] = [];
  if (!chart) {
    problems = stepsMismatch ? ['chart', ...JUDGEMENT_FIELDS] : ['chart'];
  }
  return { chart, chartGuess, problems, stepsMismatch };
};

const checkMillionStats = (read: PhotoRead, values: PhotoValues, mixId: number): Field[] => {
  if (values.score !== getPhoenixScore(values, mixId)) {
    return [...NUMBER_FIELDS];
  }
  values.grade = getPhoenixGrade(values.score, mixId);
  const problems: Field[] = [];
  const plate = read.plate_text == null ? null : plateFromText(read.plate_text);
  if (plate === undefined || plate !== calcPlate(values, values.pass)) {
    problems.push('pass');
  }
  return problems;
};

const checkComboStats = (values: PhotoValues, level: number | null): Field[] => {
  const problems: Field[] = [];
  if (values.score % 100 !== 0) {
    problems.push('score');
  }
  if (values.score < minScoreForStats(values, level)) {
    problems.push(...NUMBER_FIELDS);
  }
  if (!COMBO_GRADES.includes(values.grade)) {
    problems.push('grade');
  } else if (values.grade.startsWith('SS') && values.combo !== values.perfect + values.great) {
    problems.push('grade', 'combo');
  }
  return problems;
};

const checkMod = (read: PhotoRead, values: PhotoValues, chart: ChartCandidate | null): Field[] => {
  if (values.mod !== 'VJ') {
    return [];
  }
  const badges = read.mod_badges.map(normalizeBadge);
  const excluded = ['HJ', 'BGADARK', 'BGAOFF'].some((mod) => badges.includes(mod));
  return excluded || (chart && !isRankModeAllowed(chart)) ? ['mod'] : [];
};

export const checkRead = (
  read: PhotoRead,
  candidates: ChartCandidate[],
  mixId: number
): ReadCheck => {
  const millionScoring = isMillionScoringMix(mixId);
  const values = readValues(read, millionScoring);
  const { chart, chartGuess, problems, stepsMismatch } = checkChart(values, candidates);

  if (values.combo > values.perfect + values.great) {
    problems.push(...NUMBER_FIELDS);
  }
  if (millionScoring) {
    problems.push(...checkMillionStats(read, values, mixId));
  } else {
    problems.push(...checkComboStats(values, chart?.level ?? read.level));
  }
  problems.push(...checkMod(read, values, chart ?? chartGuess));

  return { values, chart, chartGuess, problems: unique(problems), stepsMismatch };
};

const unique = (fields: Field[]) => ALL_FIELDS.filter((field) => fields.includes(field));

export const passes = (check: ReadCheck | null): check is ReadCheck & { chart: ChartCandidate } =>
  !!check && !!check.chart && check.problems.length === 0;

const pointedChart = (check: ReadCheck) => (check.chart ?? check.chartGuess)?.chartInstanceId;

const differingFields = (a: ReadCheck, b: ReadCheck): Field[] =>
  ALL_FIELDS.filter((field) =>
    field === 'chart' ? pointedChart(a) !== pointedChart(b) : a.values[field] !== b.values[field]
  );

const settledByStepCount = (checks: (ReadCheck | null)[]) =>
  checks.find(
    (check) =>
      passes(check) &&
      checks.some((other) => {
        if (!other || other === check) {
          return false;
        }
        const differing = differingFields(check, other);
        return (
          differing.length === 1 && (JUDGEMENT_FIELDS as readonly Field[]).includes(differing[0])
        );
      })
  );

const needsInput = (checks: (ReadCheck | null)[]): Decision => {
  const valid = checks.filter((check): check is ReadCheck => check != null);
  if (valid.length === 0) {
    return { status: 'needsInput', chart: null, values: null, readValues: [], fields: ALL_FIELDS };
  }

  const start = valid.find(passes) ?? valid[0];
  const chart =
    start.chart ??
    valid.find((check) => check.chart)?.chart ??
    valid.find((check) => check.chartGuess)?.chartGuess ??
    null;
  const differing = unique(valid.slice(1).flatMap((check) => differingFields(valid[0], check)));
  let fields = differing.length > 0 ? differing : unique(valid.flatMap((c) => c.problems));
  const judgementsAgree = !JUDGEMENT_FIELDS.some((field) => differing.includes(field));
  if (judgementsAgree && valid.every((check) => check.stepsMismatch)) {
    fields = unique([...fields, ...JUDGEMENT_FIELDS]);
  }
  if (!valid.some((check) => check.chart) && !fields.includes('chart')) {
    fields = unique([...fields, 'chart']);
  }
  if (fields.length === 0) {
    fields = [...NUMBER_FIELDS];
  }
  return {
    status: 'needsInput',
    chart,
    values: start.values,
    readValues: valid.map((check) => check.values),
    fields,
  };
};

export const decide = (mixId: number, checks: (ReadCheck | null)[]): Decision => {
  if (isMillionScoringMix(mixId)) {
    const passed = checks.find(passes);
    if (passed) {
      return { status: 'confident', chart: passed.chart, values: passed.values };
    }
    return needsInput(checks);
  }

  const valid = checks.filter((check) => check != null);
  if (valid.some((check) => check.values.pass !== valid[0].values.pass)) {
    return needsInput(checks);
  }
  const [a = null, b = null, c = null] = checks;
  const pairs = [
    [a, b],
    [a, c],
    [b, c],
  ];
  for (const [x, y] of pairs) {
    if (passes(x) && passes(y) && differingFields(x, y).length === 0) {
      return { status: 'confident', chart: x.chart, values: x.values };
    }
  }
  const settled = settledByStepCount(checks) ?? null;
  if (passes(settled)) {
    return { status: 'confident', chart: settled.chart, values: settled.values };
  }
  return needsInput(checks);
};

export const needsTiebreaker = (mixId: number, [a, b]: (ReadCheck | null)[]) =>
  decide(mixId, [a, b]).status !== 'confident' && !(a && b && a.values.pass !== b.values.pass);
