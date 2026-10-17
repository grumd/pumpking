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

/**
 * Deciding whether a result read from a photo can be saved without asking the user (see
 * docs/photo-results/PLAN.md, "Checks for a read"). Pure: the reads and the charts their
 * titles point to come in, a decision comes out
 */

export type Mod = 'VJ' | 'HJ' | '';

/** A chart instance on the mix that a read's song title and label point to */
export interface ChartCandidate {
  sharedChartId: number;
  chartInstanceId: number;
  songName: string;
  label: string;
  level: number | null;
  // tracks.duration
  duration: string | null;
  minTotalSteps: number | null;
  maxTotalSteps: number | null;
  // Phoenix 2 only: the same shared chart's step counts on Phoenix, for charts whose
  // Phoenix 2 count isn't known (the two agreed wherever both were known)
  phoenixMinTotalSteps?: number | null;
  phoenixMaxTotalSteps?: number | null;
}

/** A result's values, as read or as typed in */
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

/** What the user can be asked for */
export type Field = 'chart' | keyof PhotoValues;

export const JUDGEMENT_FIELDS = ['perfect', 'great', 'good', 'bad', 'miss'] as const;
export const NUMBER_FIELDS = [...JUDGEMENT_FIELDS, 'combo', 'score'] as const;
const ALL_FIELDS: Field[] = ['chart', ...NUMBER_FIELDS, 'grade', 'pass', 'mod'];

/** One read, checked */
export interface ReadCheck {
  values: PhotoValues;
  // The only chart that fits the read, if there is one
  chart: ChartCandidate | null;
  // The only chart its title and label point to, when its step count can't confirm it
  chartGuess: ChartCandidate | null;
  // The fields to ask for if this read is used; none when every check holds
  problems: Field[];
  // The judgements don't add up to the step count of the chart the title points to
  stepsMismatch: boolean;
}

export type Decision =
  | { status: 'confident'; chart: ChartCandidate; values: PhotoValues }
  | {
      status: 'needsInput';
      // The chart to start from, and the values to fill the form with
      chart: ChartCandidate | null;
      values: PhotoValues | null;
      // What each reader read, to offer when they differ
      readValues: PhotoValues[];
      fields: Field[];
    };

/** The chart's step count when it is exact (a range such as 1500–1800 isn't) */
export const exactStepCount = (chart: ChartCandidate): number | null => {
  const known = chart.minTotalSteps != null || chart.maxTotalSteps != null;
  const min = known ? chart.minTotalSteps : chart.phoenixMinTotalSteps;
  const max = known ? chart.maxTotalSteps : chart.phoenixMaxTotalSteps;
  return min != null && min === max ? min : null;
};

const normalizeBadge = (badge: string) => badge.toUpperCase().replace(/\s+/g, '');

const plateFromText = (text: string): Plate | undefined => {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ').trim();
  return (Object.keys(PLATE_NAMES) as Plate[]).find((plate) => PLATE_NAMES[plate] === normalized);
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
    // A pass on Phoenix has a plate under the grade; before it, a fail has a broken grade
    pass: millionScoring ? read.plate_text != null : !read.grade_broken,
    mod: rank ? 'VJ' : badges.includes('HJ') ? 'HJ' : '',
  };
};

const checkChart = (values: PhotoValues, candidates: ChartCandidate[]) => {
  const steps = values.perfect + values.great + values.good + values.bad + values.miss;
  const fitting = candidates.filter((chart) => exactStepCount(chart) === steps);
  const chart = fitting.length === 1 ? fitting[0] : null;
  const chartGuess = !chart && candidates.length === 1 ? candidates[0] : null;
  // A known step count that differs points to a misread judgement
  const stepsMismatch =
    fitting.length === 0 && candidates.some((candidate) => exactStepCount(candidate) != null);
  let problems: Field[] = [];
  if (!chart) {
    problems = stepsMismatch ? ['chart', ...JUDGEMENT_FIELDS] : ['chart'];
  }
  return { chart, chartGuess, problems, stepsMismatch };
};

const checkMillionStats = (read: PhotoRead, values: PhotoValues, mixId: number): Field[] => {
  if (values.score !== getPhoenixScore(values)) {
    return [...NUMBER_FIELDS];
  }
  const problems: Field[] = [];
  // Phoenix and Phoenix 2 have different grades below 950,000: a wrong grade can also
  // mean the wrong mix was selected
  if (values.grade !== getPhoenixGrade(values.score, mixId)) {
    problems.push('grade');
  }
  // The plate also says whether the stage was passed: a fail has none
  const plate = read.plate_text == null ? null : plateFromText(read.plate_text);
  const brokenPass = read.grade_broken && values.pass;
  if (plate === undefined || brokenPass || plate !== calcPlate(values, values.pass)) {
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

/** Checks one read against the charts its title and label point to */
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

/** Whether a read fits exactly one chart and passes every check */
export const passes = (check: ReadCheck | null): check is ReadCheck & { chart: ChartCandidate } =>
  !!check && !!check.chart && check.problems.length === 0;

// The chart a read points to by title and label, whether or not its step count fits
const pointedChart = (check: ReadCheck) => (check.chart ?? check.chartGuess)?.chartInstanceId;

const differingFields = (a: ReadCheck, b: ReadCheck): Field[] =>
  ALL_FIELDS.filter((field) =>
    field === 'chart' ? pointedChart(a) !== pointedChart(b) : a.values[field] !== b.values[field]
  );

/**
 * XX: a read that passes, and another that agrees with it on everything but one judgement.
 * The other read misses the chart's exact step count, and with the other four judgements
 * agreed only one value fits it, so the step count settles the field ("1" read as "7")
 */
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

  // A read that passes every check is the best start, even when no other read agrees
  const start = valid.find(passes) ?? valid[0];
  const chart =
    start.chart ??
    valid.find((check) => check.chart)?.chart ??
    valid.find((check) => check.chartGuess)?.chartGuess ??
    null;
  // Where the reads aren't unanimous is where the misread is. When they agree (or only one
  // read the photo), the failed checks say what to ask for
  const differing = unique(valid.slice(1).flatMap((check) => differingFields(valid[0], check)));
  let fields = differing.length > 0 ? differing : unique(valid.flatMap((c) => c.problems));
  // Judgements that every read agrees on but that don't add up to the chart's step count
  // are misread all the same: they are never shown as certain
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

/**
 * The decision for a mix, from the checked reads in the order they were made (null for a
 * reader that failed). Phoenix and later: the first read that passes every check is
 * saved. XX and earlier: two reads that both pass and agree on everything, or that differ
 * in one judgement which the step count settles; the third read, made only when the first
 * two don't, breaks the tie
 */
export const decide = (mixId: number, checks: (ReadCheck | null)[]): Decision => {
  if (isMillionScoringMix(mixId)) {
    const passed = checks.find(passes);
    if (passed) {
      return { status: 'confident', chart: passed.chart, values: passed.values };
    }
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
