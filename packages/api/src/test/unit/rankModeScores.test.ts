import { MigrationProvider } from '@pumpking/database/MigrationProvider';
import { db } from '@pumpking/database/db';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';
import path from 'path';
import { getResultExp } from 'services/results/exp';
import { resultAddedEffect } from 'services/results/resultAddedEffect';
import { applyEffects, req } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';
import { getResultDefaults } from 'test/seeds/initialSeed';

// Rank mode (VJ) results get a phoenix score from their stats, like any other result
describe('Rank mode scores', () => {
  const stats = { perfect: 90, great: 5, good: 3, bad: 1, miss: 1, combo: 95 };
  const expectedScore = getPhoenixScore(stats);
  // The seeded chart instance 1: XX, S20
  const expectedExp = getResultExp({ score: expectedScore }, { level: 20, label: 'S20' });

  // A rank mode result without a phoenix score, as the old ones are in the database
  const insertOldRankModeResult = async (playerId: number) => {
    const { insertId } = await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId, score: 1000000 }),
        rank_mode: 1,
        score_phoenix: null,
        perfects: stats.perfect,
        greats: stats.great,
        goods: stats.good,
        bads: stats.bad,
        misses: stats.miss,
        max_combo: stats.combo,
      })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  const getResult = (id: number) =>
    db
      .selectFrom('results')
      .select(['score_phoenix', 'exp', 'pp'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

  it('a manual add in rank mode stores the phoenix score, and gets exp and pp', async () => {
    await req()
      .post('/results/add-result')
      .set('session', addResultsSession)
      .field('playerId', 7)
      .field('grade', 'S')
      .field('mix', 'XX')
      .field('mod', 'VJ')
      .field('score', 900000)
      .field('perfect', stats.perfect)
      .field('great', stats.great)
      .field('good', stats.good)
      .field('bad', stats.bad)
      .field('miss', stats.miss)
      .field('combo', stats.combo)
      .field('date', '2020-01-01')
      .field('isExactDate', true)
      .field('sharedChartId', 1)
      .field('pass', true)
      .attach('screenshot', path.join(__dirname, '../files/test.jpg'))
      .expect(200);

    const { id, rank_mode, score_phoenix } = await db
      .selectFrom('results')
      .select(['id', 'rank_mode', 'score_phoenix'])
      .where('player_id', '=', 7)
      .executeTakeFirstOrThrow();
    assert.strictEqual(rank_mode, 1);
    assert.strictEqual(score_phoenix, expectedScore, 'stored with the result');

    await applyEffects();

    const result = await getResult(id);
    assert.strictEqual(Number(result.exp), Number(expectedExp.toFixed(2)), 'exp');
    assert.isAbove(result.pp ?? -1, 0, 'pp');
  });

  it('the effect fills in a missing phoenix score of a rank mode result', async () => {
    const id = await insertOldRankModeResult(4);

    await resultAddedEffect(id);

    const result = await getResult(id);
    assert.strictEqual(result.score_phoenix, expectedScore);
    assert.isNotNull(result.exp);
  });

  it('the backfill migration gives old rank mode results a score and exp', async () => {
    const id = await insertOldRankModeResult(4);
    const migrations = await new MigrationProvider({
      folder: path.join(__dirname, '../../../../database/migrations'),
    }).getMigrations();

    await migrations['20260930060000_backfill_rank_mode_score_phoenix'].up(db);

    // The migration computed the score in floating point, which lands one below this
    // whole score (utils/phoenixScore.ts computes it exactly)
    const migrationScore = expectedScore - 1;
    const migrationExp = getResultExp({ score: migrationScore }, { level: 20, label: 'S20' });
    const result = await getResult(id);
    assert.strictEqual(result.score_phoenix, migrationScore, 'score');
    assert.strictEqual(
      Number(result.exp),
      Number(migrationExp.toFixed(2)),
      'exp, as services/results/exp.ts'
    );
    const player = await db
      .selectFrom('players')
      .select('exp')
      .where('id', '=', 4)
      .executeTakeFirstOrThrow();
    assert.strictEqual(Number(player.exp), Number(result.exp), "the player's total exp");
  });
});
