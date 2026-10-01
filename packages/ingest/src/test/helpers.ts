import { app } from '../app';
import { ARCADE } from './seed';
import { db } from '@pumpking/database/db';
import { sql } from 'kysely';
import request from 'supertest';

export const post = (path: string, body: object, agent: { name: string; token: string } = ARCADE) =>
  request(app)
    .post(path)
    .set('agent-name', agent.name)
    .set('agent-token', agent.token)
    .send(body)
    .expect(200);

// A valid Phoenix result on the seeded "Love Is A Danger Zone (Cranky Mix)" S16 (652 steps)
export const phoenixResult = () => ({
  player_name: 'ALICE',
  recognition_notes: 'result',
  score: 991_925,
  score_increase: 991_925,
  grade: 'SSS',
  is_pass: true,
  plate: 'MG',
  mods_list: 'AV500 BGADARK',
  perfects: 648,
  greats: 1,
  goods: 1,
  bads: 1,
  misses: 1,
  max_combo: 216,
  calories: 100,
});

export const screen = ({
  result = phoenixResult() as Record<string, unknown>,
  ...header
}: Record<string, unknown> = {}) => ({
  screen_file: '2026-09-30/2026-09-30--23-12-25.mp4',
  mix_name: 'Phoenix',
  track_name: 'Love Is A Danger Zone (Cranky Mix)',
  gained: '2026-09-30 20:12:25',
  left: { chart_label: 'S16', result },
  ...header,
});

// With the naive datetimes as they're stored
export const getResults = async () => {
  const rows = await db
    .selectFrom('results')
    .selectAll()
    .select([
      sql<string>`CAST(gained AS CHAR)`.as('gained_at'),
      sql<string>`CAST(added AS CHAR)`.as('added_at'),
    ])
    .orderBy('id')
    .execute();
  return rows.map(({ gained_at, added_at, ...row }) => ({
    ...row,
    gained: gained_at,
    added: added_at,
  }));
};

// A valid XX result on the seeded S15 (658 steps)
export const xxResult = () => ({
  player_name: 'ALICE',
  recognition_notes: 'result',
  score: 1_318_700,
  grade: 'A+',
  mods_list: '',
  perfects: 648,
  greats: 2,
  goods: 2,
  bads: 4,
  misses: 2,
  max_combo: 216,
  calories: 37_091,
});

export const xxScreen = (result: object = xxResult(), header: object = {}) =>
  screen({ mix_name: 'XX', left: { chart_label: 'S15', result }, ...header });

export const getEvents = () => db.selectFrom('events').selectAll().orderBy('id').execute();
