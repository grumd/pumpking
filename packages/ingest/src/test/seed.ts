import { db } from '@pumpking/database/db';
import { sql } from 'kysely';

export const ARCADE = { name: 'test-arcade', token: 'arcade-token' };

const agents = [
  { id: 1, name: 'root', token: 'root-token', title: 'root' },
  { id: 2, ...ARCADE, title: 'Test Arcade' },
];

const players = [
  { id: 1, nickname: 'Alice' },
  { id: 2, nickname: 'Bob' },
  // An alias account: its results belong to Alice
  { id: 3, nickname: 'Alice Alt', actual_player_id: 1 },
  { id: 4, nickname: 'Spammer', discard_results: 1 },
  { id: 5, nickname: 'Carol' },
  { id: 6, nickname: 'Karol' },
];

const arcadePlayerNames = [
  ...[26, 27].flatMap((mix_id) => [
    { mix_id, player_id: 1, name: 'ALICE', name_edist: 1 },
    { mix_id, player_id: 2, name: 'BOB', name_edist: 0 },
  ]),
  // Phoenix 2 names have the arcade id in them
  { mix_id: 28, player_id: 1, name: 'ALICE #1234', name_edist: 1 },
  { mix_id: 27, player_id: 3, name: 'ALICEALT', name_edist: 0 },
  { mix_id: 27, player_id: 4, name: 'SPAMMER', name_edist: 0 },
  // One edit away from both: too close to pick
  { mix_id: 27, player_id: 5, name: 'CAROLA', name_edist: 1 },
  { mix_id: 27, player_id: 6, name: 'CAROLB', name_edist: 1 },
];

const tracks = [
  {
    id: 1,
    external_id: '13__Love_is_a_Danger_Zone_Cranky_Mix',
    full_name: 'Love Is A Danger Zone (Cranky Mix)',
    short_name: 'Love Is A Danger Zone (Cranky Mix)',
    duration: 'Standard' as const,
  },
  {
    id: 2,
    external_id: '0F__Final_Audition_ep_2_X',
    full_name: 'Final Audition Ep. 2-X',
    short_name: 'Final Audition Ep. 2-X',
    duration: 'Standard' as const,
  },
  {
    id: 3,
    external_id: '0D__Final_Audition_ep_2_1',
    full_name: 'Final Audition Ep. 2-1',
    short_name: 'Final Audition Ep. 2-1',
    duration: 'Standard' as const,
  },
];

const arcadeTrackNames = [26, 27, 28].flatMap((mix_id) => [
  { mix_id, track_id: 1, name: 'Love Is A Danger Zone (Cranky Mix)', name_edist: 2 },
  { mix_id, track_id: 2, name: 'Final Audition Ep. 2-X', name_edist: 0 },
  { mix_id, track_id: 3, name: 'Final Audition Ep. 2-1', name_edist: 0 },
]);

const sharedCharts = [
  { id: 1, track: 1, index_in_track: 1, type: 'S' as const },
  { id: 2, track: 1, index_in_track: 2, type: 'D' as const },
  { id: 3, track: 2, index_in_track: 1, type: 'S' as const },
];

// The step counts are learned from results: null until the first one with full stats
export const CHARTS = {
  xx: { id: 11, shared_chart: 1, mix: 26, label: 'S15', level: 15 },
  phoenix: { id: 12, shared_chart: 1, mix: 27, label: 'S16', level: 16 },
  phoenix2: { id: 13, shared_chart: 1, mix: 28, label: 'S16', level: 16 },
  phoenixDouble: { id: 14, shared_chart: 2, mix: 27, label: 'D18', level: 18 },
  finalAudition: { id: 15, shared_chart: 3, mix: 27, label: 'S12', level: 12 },
};

const chartInstances = Object.values(CHARTS).map((chart) => ({
  ...chart,
  track: chart.shared_chart === 3 ? 2 : 1,
}));

export const seed = async () => {
  await db.deleteFrom('results').execute();
  await db.deleteFrom('purgatory').execute();
  await db.deleteFrom('chart_instances').execute();
  await db.deleteFrom('shared_charts').execute();
  await db.deleteFrom('tracks').execute();
  await db.deleteFrom('arcade_player_names').execute();
  await db.deleteFrom('arcade_track_names').execute();
  await db.deleteFrom('players').execute();
  await db.deleteFrom('agent_sessions').execute();
  await db.deleteFrom('agents').execute();
  await sql`truncate table events`.execute(db);

  await db.insertInto('agents').values(agents).execute();
  await db.insertInto('players').values(players).execute();
  await db.insertInto('arcade_player_names').values(arcadePlayerNames).execute();
  await db.insertInto('tracks').values(tracks).execute();
  await db.insertInto('arcade_track_names').values(arcadeTrackNames).execute();
  await db.insertInto('shared_charts').values(sharedCharts).execute();
  await db.insertInto('chart_instances').values(chartInstances).execute();
};
