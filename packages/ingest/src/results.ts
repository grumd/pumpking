import { type AgentCall, type Args, requireArg } from './legacy';
import { db } from '@pumpking/core/db';
import { DiscardedResult, UnrecognizedResult } from '@pumpking/core/ingestion/errors';
import { utcNow } from '@pumpking/core/ingestion/format';
import { addToPurgatory } from '@pumpking/core/ingestion/purgatory';
import { storeResult } from '@pumpking/core/ingestion/storeResult';
import type { ResultData } from '@pumpking/core/ingestion/types';
import { validateResult } from '@pumpking/core/ingestion/validateResult';
import createDebug from 'debug';

const debug = createDebug('ingest:results');

/**
 * piu-spy's result submissions (the legacy `results.py`): one result screen with up to
 * two sides, left and right, each with the result and possibly the personal / machine
 * best shown next to it. Only the results are stored.
 *
 * Modes: `screen` (piu-spy's capture of the arcade's screen) sends unrecognized results
 * to purgatory; `manual` (e.g. an import of a player's profile) rejects them, and merges
 * a result into the same play if it was already recognized from the screen.
 */
export type SubmitMode = 'screen' | 'manual';

type Side = Record<string, unknown>;
type Screen = Record<string, unknown>;

const SIDES = ['left', 'right'] as const;
const PASS_GRADES = ['S', 'SS', 'SSS'];

const RESULT_FIELDS = [
  'recognition_notes',
  'score_increase',
  'grade',
  'is_pass',
  'plate',
  'rank_mode',
  'mods_list',
  'misses',
  'bads',
  'goods',
  'greats',
  'perfects',
  'max_combo',
  'calories',
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The side's result, personal best or machine best, if it has all the given fields
const sideEntry = (screen: Screen, sideName: string, entry: string, ...fields: string[]) => {
  const side = screen[sideName];
  const value = isObject(side) ? side[entry] : undefined;
  return isObject(value) && fields.every((field) => field in value) ? value : undefined;
};

/**
 * XX shows bogus bests in some situations. Only results are stored, so this only
 * reports them (the legacy `HandleXXGlitches`)
 */
const handleXXGlitches = (screen: Screen, report: string[]) => {
  // XX may show your current grade on the personal best too, whatever that grade was
  for (const side of SIDES) {
    const result = sideEntry(screen, side, 'result', 'grade', 'score');
    const personalBest = sideEntry(screen, side, 'personal_best', 'grade', 'score');
    if (
      result &&
      personalBest &&
      result.grade === personalBest.grade &&
      result.score !== personalBest.score
    ) {
      personalBest.grade = '?';
      report.push(
        `${side}_personal_best has grade equal to ${side}_result, possible XX grade glitch, discarded`
      );
    }
  }

  // XX 2.05, same single chart played on both sides: one player's machine best may show
  // up on the other side
  for (const [side, otherSide] of [
    ['left', 'right'],
    ['right', 'left'],
  ]) {
    const result = sideEntry(screen, side, 'result', 'score', 'grade');
    const otherMachineBest = sideEntry(screen, otherSide, 'machine_best', 'score');
    const grade = String(result?.grade);
    if (
      result &&
      otherMachineBest &&
      result.score === otherMachineBest.score &&
      (PASS_GRADES.includes(grade) || grade.endsWith('+'))
    ) {
      delete (screen[otherSide] as Side).machine_best;
      report.push(
        `${otherSide}_machine_best has score equal to ${side}_result, possible XX best machine score glitch, discarded`
      );
    }
  }

  // Bests equal to what's already on the side
  const hasFields = (entry: Side | undefined, ...fields: string[]) =>
    entry !== undefined && fields.every((field) => field in entry);
  for (const side of SIDES) {
    const result = sideEntry(screen, side, 'result');
    let personalBest = sideEntry(screen, side, 'personal_best');
    let machineBest = sideEntry(screen, side, 'machine_best');
    if (
      hasFields(result, 'grade', 'score') &&
      hasFields(personalBest, 'grade', 'score') &&
      result!.grade === personalBest!.grade &&
      result!.score === personalBest!.score
    ) {
      delete (screen[side] as Side).personal_best;
      personalBest = undefined;
      report.push(`${side}_personal_best has grade and score equal to ${side}_result, discarded`);
    }
    if (
      hasFields(result, 'score', 'grade', 'player_name') &&
      hasFields(machineBest, 'score', 'grade', 'player_name') &&
      result!.score === machineBest!.score &&
      result!.grade === machineBest!.grade &&
      result!.player_name === machineBest!.player_name
    ) {
      delete (screen[side] as Side).machine_best;
      machineBest = undefined;
      report.push(`${side}_machine_best has grade and score equal to ${side}_result, discarded`);
    }
    if (
      hasFields(personalBest, 'player_name', 'score') &&
      hasFields(machineBest, 'player_name', 'score') &&
      machineBest!.player_name === personalBest!.player_name &&
      personalBest!.score === machineBest!.score
    ) {
      delete (screen[side] as Side).personal_best;
      report.push(
        `${side}_personal_best has grade and score equal to ${side}_machine_best, discarded`
      );
    }
  }
};

// 'YYYY-MM-DD HH:MM:SS', the only format piu-spy sends
const parseGained = (value: unknown): string => {
  const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  const [year, month, day, hours, minutes, seconds] = (match ?? []).slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  if (!match || date.getUTCDate() !== day || hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error(`time data '${value}' does not match format '%Y-%m-%d %H:%M:%S'`);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const toFlag = (value: unknown) => (typeof value === 'boolean' ? Number(value) : value);

/** The results of a screen, as rows to store (the legacy `splitResults`) */
export const splitResults = ({ args, agent, report }: AgentCall): ResultData[] => {
  const header = {
    screen_file: `${agent.name}/${requireArg(args, 'screen_file')}`,
    mix_name: String(requireArg(args, 'mix_name')),
    track_name: String(requireArg(args, 'track_name')),
    gained: parseGained(requireArg(args, 'gained')),
    added: utcNow(),
    agent: agent.id,
  };

  if (header.mix_name === 'XX') {
    handleXXGlitches(args, report);
  }

  const results: ResultData[] = [];
  for (const sideName of SIDES) {
    const side = args[sideName];
    if (side === undefined) {
      continue;
    }
    if (!isObject(side)) {
      throw new Error(`Invalid '${sideName}'`);
    }
    const chartLabel = String(requireArg(side, 'chart_label'));

    // The personal and machine bests aren't results played now, so they're not stored
    if (!isObject(side.result)) {
      continue;
    }
    const source: Args = side.result;
    const playerName = requireArg(source, 'player_name');
    const score = requireArg<number | null>(source, 'score');
    if (score == null) {
      continue;
    }

    const fields = Object.fromEntries(
      RESULT_FIELDS.filter((field) => source[field] != null).map((field) => [
        field,
        toFlag(source[field]),
      ])
    ) as Partial<ResultData>;
    const data: ResultData = {
      recognition_notes: '',
      ...fields,
      ...header,
      chart_label: chartLabel,
      player_name: String(playerName),
      score,
      grade: fields.grade ?? '?',
      rank_mode: fields.rank_mode ?? 0,
      exact_gain_date: 1,
    };
    // XX's grades say whether the chart was passed
    if (data.mix_name === 'XX' && data.is_pass === undefined && data.grade && data.grade !== '?') {
      data.is_pass = Number(data.grade.includes('+') || PASS_GRADES.includes(data.grade));
    }
    results.push(data);
  }
  return results;
};

export const submitResults = async (call: AgentCall, mode: SubmitMode) => {
  const isManual = mode === 'manual';
  const updates: object[] = [];
  for (const data of splitResults(call)) {
    try {
      const chart = await validateResult(db, data);
      updates.push(
        await db
          .transaction()
          .execute((trx) =>
            storeResult(trx, chart, data, { isManual, checkOnly: false, report: call.report })
          )
      );
    } catch (e) {
      if (e instanceof UnrecognizedResult) {
        if (isManual) {
          debug(`Rejecting result: ${e.message}`);
          updates.push({ status: 'discarded', reason: e.message });
        } else {
          debug(`Adding result to purgatory: ${e.message}`);
          updates.push(await addToPurgatory(db, data, e.message));
        }
      } else if (e instanceof DiscardedResult) {
        updates.push({ status: 'discarded', reason: e.message });
      } else {
        throw e;
      }
    }
  }
  return { updates };
};

// What submitting would do, without writing anything
export const validateResults = async (call: AgentCall, mode: SubmitMode) => {
  const isManual = mode === 'manual';
  const validation: object[] = [];
  for (const data of splitResults(call)) {
    try {
      const chart = await validateResult(db, data);
      const update = await storeResult(db, chart, data, {
        isManual,
        checkOnly: true,
        report: call.report,
      });
      validation.push({ valid: true, update });
    } catch (e) {
      if (e instanceof UnrecognizedResult) {
        validation.push({ valid: false, reason: e.message });
      } else if (e instanceof DiscardedResult) {
        validation.push({ valid: true, discardReason: e.message });
      } else {
        throw e;
      }
    }
  }
  return { validation };
};
