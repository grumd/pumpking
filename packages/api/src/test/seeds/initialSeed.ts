import { Grade } from 'constants/grades';
import { db } from 'db';
import _ from 'lodash/fp';
import { addResultsSession, adminSession } from 'test/helpers/sessions';

export const sessions = [
  {
    id: adminSession,
    player: 6,
    established: new Date(),
    valid_until: new Date(),
  },
  {
    id: addResultsSession,
    player: 7,
    established: new Date(),
    valid_until: new Date(),
  },
];

export const players = [
  { id: 1, nickname: 'Dummy 1', hidden: 0 },
  { id: 2, nickname: 'Dummy 2', hidden: 0 },
  { id: 3, nickname: 'Dummy 3', hidden: 0 },
  { id: 4, nickname: 'Dummy 4', hidden: 0 },
  { id: 5, nickname: 'Dummy 5 Hidden', hidden: 1 },
  { id: 6, nickname: 'Admin', hidden: 0, is_admin: 1 },
  {
    id: 7,
    nickname: 'Add Results',
    hidden: 0,
    can_add_results_manually: 1,
  },
];

export const arcade_player_names = [
  {
    mix_id: 26,
    player_id: 1,
    name: 'DUMMY1',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 2,
    name: 'DUMMY2',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 3,
    name: 'DUMMY3',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 4,
    name: 'DUMMY4',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 5,
    name: 'DUMMY5HIDDEN',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 6,
    name: 'ADMIN',
    name_edist: 0,
  },
  {
    mix_id: 26,
    player_id: 7,
    name: 'ADDRESULTS',
    name_edist: 0,
  },
];

export const tracks = [
  {
    id: 1,
    full_name: 'Track 1',
    short_name: 'Track 1',
    duration: 'Standard' as const,
    external_id: '1',
  },
];

export const sharedCharts = [{ id: 1, track: 1, index_in_track: 1 }];

export const chartInstances = [
  {
    id: 1,
    track: 1,
    shared_chart: 1,
    mix: 26,
    label: 'S20',
    level: 20,
    max_possible_score_norank: 1000000,
    max_total_steps: 100,
    min_total_steps: 100,
    type: 'S' as const,
  },
];

export const getResultDefaults = ({ playerId = 1, score = 1000000 }) => ({
  token: '',
  recognition_notes: '',
  added: new Date(),
  agent: 0,
  track_name: '',
  mix_name: '',
  mix: 26,
  chart_label: '',
  shared_chart: 1,
  chart_instance: 1,
  player_name: '',
  recognized_player_id: playerId,
  actual_player_id: playerId,
  gained: new Date(),
  exact_gain_date: 1 as const,
  rank_mode: 0 as const,
  score: score,
  score_xx: score,
  score_phoenix: score,
  score_increase: 0,
  misses: 0,
  bads: 0,
  goods: 0,
  greats: 0,
  perfects: 100,
  grade: Grade.SSS,
  max_combo: 100,
  is_new_best_score: 1 as const,
});

export const results = [
  {
    ...getResultDefaults({
      playerId: 1,
      score: 1000000,
    }),
    greats: 0,
    perfects: 100,
    grade: Grade.SSS,
  },
  {
    ...getResultDefaults({
      playerId: 2,
      score: 800000,
    }),
    greats: 20,
    perfects: 80,
    grade: Grade.SS,
  },
  {
    ...getResultDefaults({
      playerId: 3,
      score: 700000,
    }),
    goods: 1,
    greats: 19,
    perfects: 80,
    grade: Grade.S,
  },
];

export const initialSeed = async () => {
  await db.deleteFrom('results_best_grade').execute();
  await db.deleteFrom('results').execute();
  await db.deleteFrom('chart_instances').execute();
  await db.deleteFrom('shared_charts').execute();
  await db.deleteFrom('tracks').execute();
  await db.deleteFrom('sessions').execute();
  await db.deleteFrom('players').execute();

  await db.insertInto('players').values(players).execute();
  await db.insertInto('sessions').values(sessions).execute();
  await db.insertInto('tracks').values(tracks).execute();
  await db.insertInto('shared_charts').values(sharedCharts).execute();
  await db.insertInto('chart_instances').values(chartInstances).execute();
  await db.insertInto('results').values(results).execute();
};
