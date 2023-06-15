import _ from 'lodash/fp';
import { promises as fs } from 'fs';
import * as path from 'path';
import { FileMigrationProvider, Migrator } from 'kysely';

import { Grade } from 'constants/grades';
import { db } from 'db';

import { mix } from 'constants/currentMix';
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
  { id: 1, nickname: 'Dummy 1', arcade_name: 'DUMMY1', hidden: 0 },
  { id: 2, nickname: 'Dummy 2', arcade_name: 'DUMMY2', hidden: 0 },
  { id: 3, nickname: 'Dummy 3', arcade_name: 'DUMMY3', hidden: 0 },
  { id: 4, nickname: 'Dummy 4', arcade_name: 'DUMMY4', hidden: 0 },
  { id: 5, nickname: 'Dummy 5 Hidden', arcade_name: 'DUMMY5HIDDEN', hidden: 1 },
  { id: 6, nickname: 'Admin', arcade_name: 'ADMIN', hidden: 0, is_admin: 1 },
  {
    id: 7,
    nickname: 'Add Results',
    arcade_name: 'ADDRESULTS',
    hidden: 0,
    can_add_results_manually: 1,
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
    mix,
    label: 'S20',
    level: 20,
    max_possible_score_norank: 1000000,
    max_total_steps: 100,
    min_total_steps: 100,
  },
];

export const getResultDefaults = ({ playerId = 1, score = 1000000 }) => ({
  token: '',
  recognition_notes: '',
  added: new Date(),
  agent: 0,
  track_name: '',
  mix_name: '',
  mix,
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
  await db.deleteFrom('results_highest_score_no_rank').execute();
  await db.deleteFrom('results_highest_score_rank').execute();
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

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, '../../migrations'),
    }),
  });

  const { error } = await migrator.migrateToLatest();

  if (error) {
    throw error;
  }
};
