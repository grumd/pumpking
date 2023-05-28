import _ from 'lodash/fp';

import { Grade } from 'constants/grades';
import { knex, knexEx } from 'db';
import { ChartInstance } from 'models/ChartInstance';
import { Player } from 'models/Player';
import { Result } from 'models/Result';
import { SharedChart } from 'models/SharedChart';
import { Track } from 'models/Track';
import { mix } from 'constants/currentMix';

export const players: Partial<Player>[] = [
  { id: 1, nickname: 'Dummy 1', arcade_name: 'DUMMY1', hidden: 0 },
  { id: 2, nickname: 'Dummy 2', arcade_name: 'DUMMY2', hidden: 0 },
  { id: 3, nickname: 'Dummy 3', arcade_name: 'DUMMY3', hidden: 0 },
  { id: 4, nickname: 'Dummy 4', arcade_name: 'DUMMY4', hidden: 0 },
  { id: 5, nickname: 'Dummy 5 Hidden', arcade_name: 'DUMMY5HIDDEN', hidden: 1 },
];

export const tracks: Partial<Track>[] = [
  { id: 1, full_name: 'Track 1', short_name: 'Track 1', duration: 'Standard', external_id: 1 },
];

export const sharedCharts: Partial<SharedChart>[] = [{ id: 1, track_id: 1, index_in_track: 1 }];

export const chartInstances: Partial<ChartInstance>[] = [
  { id: 1, track_id: 1, shared_chart_id: 1, mix, label: 'S20', level: 20 },
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
  shared_chart_id: 1,
  chart_instance_id: 1,
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

export const results: Partial<Result>[] = [
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
  await knex.query(Player).insertItems(players);
  await knex.query(Track).insertItems(tracks);
  await knex.query(SharedChart).insertItems(sharedCharts);
  await knex.query(ChartInstance).insertItems(chartInstances);
  await knex.query(Result).insertItems(results);
  while ((await knexEx.migrate.status()) < 0) {
    await knexEx.migrate.up();
  }
  // await knexEx.migrate.latest(); // this does all migrations in parallel for some reason
};
