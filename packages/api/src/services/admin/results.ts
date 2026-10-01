import { describeChanges } from './report';
import type { Results } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { addEvent } from '@pumpking/database/events';
import { isMillionScoringMix, MIXES } from '@pumpking/utils/mixes';
import { getRankMode, InvalidModsError, parseModsList } from '@pumpking/utils/mods';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import type { Updateable } from 'kysely';
import { deleteResult } from 'services/results/deleteResult';
import { error } from 'utils';

const SEARCH_LIMIT = 100;

export interface ResultsSearch {
  resultId?: number;
  // Matches the score or the phoenix score, like the desktop tool's search
  score?: number;
  playerId?: number;
  // Part of the track's name
  track?: string;
  chartLabel?: string;
}

/** The newest results matching all the given filters, up to 100 */
export const searchResults = async (search: ResultsSearch) => {
  let query = db
    .selectFrom('results')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .leftJoin('players', 'players.id', 'results.player_id')
    .leftJoin('agents', 'agents.id', 'results.agent')
    .select([
      'results.id',
      'tracks.short_name as track',
      'results.chart_label',
      'results.mix',
      'results.score',
      'results.grade',
      'results.plate',
      'results.player_id',
      'players.nickname',
      'results.gained',
      'results.added',
      'agents.name as agent_name',
      'results.agent',
      'results.is_hidden',
    ])
    .orderBy('results.id', 'desc')
    .limit(SEARCH_LIMIT);

  if (search.resultId) {
    query = query.where('results.id', '=', search.resultId);
  }
  if (search.score) {
    const score = search.score;
    query = query.where((eb) =>
      eb.or([eb.cmpr('results.score', '=', score), eb.cmpr('results.score_phoenix', '=', score)])
    );
  }
  if (search.playerId) {
    query = query.where('results.player_id', '=', search.playerId);
  }
  if (search.track) {
    const pattern = `%${search.track}%`;
    query = query.where((eb) =>
      eb.or([
        eb.cmpr('tracks.short_name', 'like', pattern),
        eb.cmpr('tracks.full_name', 'like', pattern),
      ])
    );
  }
  if (search.chartLabel) {
    query = query.where('results.chart_label', '=', search.chartLabel);
  }

  const rows = await query.execute();
  return { rows, limit: SEARCH_LIMIT };
};

export const getResult = async (resultId: number) => {
  const result = await db
    .selectFrom('results')
    .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .innerJoin('tracks', 'tracks.id', 'chart_instances.track')
    .leftJoin('agents', 'agents.id', 'results.agent')
    .leftJoin('players as recognized', 'recognized.id', 'results.recognized_player_id')
    .select([
      'results.id',
      'results.token',
      'results.screen_file',
      'results.recognition_notes',
      'results.added',
      'results.agent',
      'agents.name as agent_name',
      'results.track_name',
      'results.mix_name',
      'results.mix',
      'results.chart_label',
      'results.shared_chart',
      'results.chart_instance',
      'results.player_name',
      'results.player_id',
      'results.recognized_player_id',
      'recognized.nickname as recognized_nickname',
      'results.actual_player_id',
      'results.gained',
      'results.exact_gain_date',
      'results.rank_mode',
      'results.mods_list',
      'results.score',
      'results.score_xx',
      'results.score_phoenix',
      'results.score_increase',
      'results.misses',
      'results.bads',
      'results.goods',
      'results.greats',
      'results.perfects',
      'results.grade',
      'results.is_pass',
      'results.plate',
      'results.max_combo',
      'results.calories',
      'results.is_hidden',
      'results.notes',
      'results.pp',
      'results.exp',
      'results.is_manual_input',
      'tracks.id as track_id',
      'tracks.full_name as track_full_name',
      'tracks.short_name as track_short_name',
      'tracks.duration as track_duration',
      'chart_instances.level',
      'chart_instances.min_total_steps',
      'chart_instances.max_total_steps',
    ])
    .where('results.id', '=', resultId)
    .executeTakeFirst();

  if (!result) {
    throw error(404, `Result not found: id ${resultId}`);
  }
  return result;
};

export interface ResultEdit {
  score?: number | null;
  scoreIncrease?: number | null;
  grade?: string | null;
  plate?: string | null;
  isPass?: boolean | null;
  perfects?: number | null;
  greats?: number | null;
  goods?: number | null;
  bads?: number | null;
  misses?: number | null;
  maxCombo?: number | null;
  calories?: number | null;
  modsList?: string | null;
  actualPlayerId?: number | null;
  isHidden?: boolean;
  notes?: string | null;
}

/**
 * Edits a result. Changing the mods re-validates them and recomputes rank mode for the
 * chart. The scores stay consistent with ingestion: from Phoenix on the score is also the
 * phoenix score; before it, the phoenix score is recomputed from the stats (and on XX the
 * score is also score_xx). pp / exp follow through a resultChanged event
 */
export const updateResult = async (resultId: number, edit: ResultEdit) => {
  const result = await getResult(resultId);

  const changes: Updateable<Results> = {};
  const set = <K extends keyof Results>(column: K, value: Updateable<Results>[K] | undefined) => {
    if (value !== undefined) {
      changes[column] = value;
    }
  };
  set('score', edit.score);
  set('score_increase', edit.scoreIncrease);
  set('grade', edit.grade);
  set('plate', edit.plate);
  set('is_pass', edit.isPass == null ? edit.isPass : Number(edit.isPass));
  set('perfects', edit.perfects);
  set('greats', edit.greats);
  set('goods', edit.goods);
  set('bads', edit.bads);
  set('misses', edit.misses);
  set('max_combo', edit.maxCombo);
  set('calories', edit.calories);
  set('actual_player_id', edit.actualPlayerId);
  set('is_hidden', edit.isHidden === undefined ? undefined : Number(edit.isHidden));
  set('notes', edit.notes === undefined ? undefined : edit.notes?.trim() || null);

  if (edit.modsList !== undefined) {
    const modsList = edit.modsList?.trim() ?? '';
    try {
      const mods = parseModsList(modsList, { millionScoring: isMillionScoringMix(result.mix) });
      const rankMode = getRankMode(mods, {
        label: result.chart_label,
        level: result.level,
        duration: result.track_duration,
      });
      changes.mods_list = mods.join(' ');
      changes.rank_mode = Number(rankMode);
    } catch (e) {
      throw e instanceof InvalidModsError ? error(400, e.message) : e;
    }
  }

  if (edit.actualPlayerId != null) {
    await checkPlayerExists(edit.actualPlayerId);
  }

  const edited = { ...result, ...changes };
  if (isMillionScoringMix(result.mix)) {
    if (changes.score !== undefined) {
      changes.score_phoenix = changes.score;
    }
  } else {
    if (result.mix === MIXES.XX && changes.score !== undefined) {
      changes.score_xx = changes.score;
    }
    const { perfects, greats, goods, bads, misses, max_combo } = edited;
    if (
      perfects != null &&
      greats != null &&
      goods != null &&
      bads != null &&
      misses != null &&
      max_combo != null
    ) {
      changes.score_phoenix = getPhoenixScore({
        perfect: perfects,
        great: greats,
        good: goods,
        bad: bads,
        miss: misses,
        combo: max_combo,
      });
    }
  }

  const report = describeChanges(`Result #${resultId}`, result, changes);
  if (report.length === 0) {
    return { report: [`Result #${resultId}: nothing changed`] };
  }

  const newPlayerId = edited.actual_player_id ?? result.recognized_player_id;
  const playerIds = [...new Set([result.player_id ?? newPlayerId, newPlayerId])];

  await db.transaction().execute(async (trx) => {
    await trx.updateTable('results').set(changes).where('id', '=', resultId).execute();
    await addEvent(trx, 'resultChanged', {
      resultId,
      sharedChartId: result.shared_chart,
      playerIds,
    });
  });

  return { report };
};

export const removeResult = async (resultId: number) => {
  await deleteResult(resultId);
  return { report: [`Result #${resultId} deleted`] };
};

const checkPlayerExists = async (playerId: number) => {
  const player = await db
    .selectFrom('players')
    .select('id')
    .where('id', '=', playerId)
    .executeTakeFirst();
  if (!player) {
    throw error(400, `Player #${playerId} doesn't exist`);
  }
};
