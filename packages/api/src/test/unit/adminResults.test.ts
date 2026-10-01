import { db } from '@pumpking/database/db';
import { getPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';
import { resultAddedEffect } from 'services/results/resultAddedEffect';
import { applyEffects } from 'test/helpers';
import { addResultsSession } from 'test/helpers/sessions';
import { errorMessage, output, trpcMutation, trpcQuery } from 'test/helpers/trpc';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Admin results', () => {
  // The seeded Phoenix 2 chart: shared chart 3, instance 3 (S20, Standard track)
  const insertPhoenixResult = async (playerId: number, score: number) => {
    const { insertId } = await db
      .insertInto('results')
      .values({
        ...getResultDefaults({ playerId, score }),
        mix: 28,
        shared_chart: 3,
        chart_instance: 3,
        chart_label: 'S20',
        score_xx: null,
        mods_list: '',
      })
      .executeTakeFirstOrThrow();
    // Gets its pp and exp, as a result added by ingestion would
    await resultAddedEffect(Number(insertId));
    return Number(insertId);
  };

  const getResult = (id: number) =>
    db.selectFrom('results').selectAll().where('id', '=', id).executeTakeFirstOrThrow();

  const lastEvent = () =>
    db.selectFrom('events').selectAll().orderBy('id', 'desc').executeTakeFirst();

  it('is for admins only', async () => {
    const res = await trpcQuery('admin.results.search', {}, addResultsSession);
    assert.equal(res.status, 401);
  });

  it('searches by score, player and track, newest first', async () => {
    const first = await insertPhoenixResult(4, 912345);
    const second = await insertPhoenixResult(4, 912345);
    await insertPhoenixResult(3, 912345);

    const byScore = output(
      await trpcQuery('admin.results.search', { score: 912345, playerId: 4 }).expect(200)
    );
    assert.deepEqual(
      byScore.rows.map((row: { id: number }) => row.id),
      [second, first]
    );
    assert.equal(byScore.rows[0].nickname, 'Dummy 4');
    assert.equal(byScore.rows[0].track, 'Track 1');

    const byTrack = output(await trpcQuery('admin.results.search', { track: 'rack' }).expect(200));
    assert.lengthOf(byTrack.rows, 6, 'the three seeded results and the three new ones');

    const byMissingTrack = output(
      await trpcQuery('admin.results.search', { track: 'nothing like it' }).expect(200)
    );
    assert.lengthOf(byMissingTrack.rows, 0);
  });

  it('edits a Phoenix 2 result: the score is also the phoenix score', async () => {
    const id = await insertPhoenixResult(4, 900000);

    const res = await trpcMutation('admin.results.update', {
      id,
      edit: { score: 950000, grade: 'SS', notes: '  fixed by hand ' },
    }).expect(200);

    const result = await getResult(id);
    assert.equal(result.score, 950000);
    assert.equal(result.score_phoenix, 950000);
    assert.equal(result.grade, 'SS');
    assert.equal(result.notes, 'fixed by hand');
    assert.include(output(res).report, 'Result #' + id + ': score 900000 → 950000');
  });

  it('edits an XX result: score_xx follows the score, the phoenix score follows the stats', async () => {
    // Seeded result of player 1: XX, 100 perfects
    const { id } = await db
      .selectFrom('results')
      .select('id')
      .where('player_id', '=', 1)
      .executeTakeFirstOrThrow();
    const stats = { perfect: 90, great: 5, good: 3, bad: 1, miss: 1, combo: 95 };

    await trpcMutation('admin.results.update', {
      id,
      edit: {
        score: 1500000,
        perfects: stats.perfect,
        greats: stats.great,
        goods: stats.good,
        bads: stats.bad,
        misses: stats.miss,
        maxCombo: stats.combo,
      },
    }).expect(200);

    const result = await getResult(id);
    assert.equal(result.score_xx, 1500000);
    assert.equal(result.score_phoenix, getPhoenixScore(stats));
  });

  it('validates the mods and sets rank mode from them', async () => {
    // The seeded XX chart: shared chart 1, instance 1 (S20, Standard track)
    const { insertId } = await db
      .insertInto('results')
      .values({ ...getResultDefaults({ playerId: 4, score: 1500000 }), mods_list: '' })
      .executeTakeFirstOrThrow();
    const id = Number(insertId);

    const invalid = await trpcMutation('admin.results.update', {
      id,
      edit: { modsList: 'VJ XYZ' },
    });
    assert.equal(invalid.status, 400);
    assert.equal(errorMessage(invalid), "Mod 'XYZ' is invalid");

    const withHj = await trpcMutation('admin.results.update', { id, edit: { modsList: 'VJ HJ' } });
    assert.equal(withHj.status, 400);
    assert.equal(errorMessage(withHj), "Rank mode and HJ can't be set simultaneously");

    await trpcMutation('admin.results.update', { id, edit: { modsList: 'VJ  2X' } }).expect(200);
    const result = await getResult(id);
    assert.equal(result.mods_list, 'VJ 2x');
    assert.equal(result.rank_mode, 1);
  });

  it('validates Phoenix mods against the Phoenix list', async () => {
    const id = await insertPhoenixResult(4, 900000);

    // No rank mode mod from Phoenix on, but the arcade's pass options
    const vj = await trpcMutation('admin.results.update', { id, edit: { modsList: 'VJ' } });
    assert.equal(vj.status, 400);
    assert.equal(errorMessage(vj), "Mod 'VJ' is invalid");

    await trpcMutation('admin.results.update', {
      id,
      edit: { modsList: 'AV500 BGADARK PASS_G' },
    }).expect(200);
    const result = await getResult(id);
    assert.equal(result.mods_list, 'AV500 BGADARK PASS_G');
    assert.equal(result.rank_mode, 0);
  });

  it('moves pp to the new best result when the best one is lowered', async () => {
    const lower = await insertPhoenixResult(4, 950000);
    const best = await insertPhoenixResult(4, 990000);
    await applyEffects();
    assert.isNotNull((await getResult(best)).pp);

    await trpcMutation('admin.results.update', { id: best, edit: { score: 910000 } }).expect(200);
    const event = await lastEvent();
    assert.equal(event?.type, 'resultChanged');
    assert.deepEqual(event?.payload, { resultId: best, sharedChartId: 3, playerIds: [4] });

    await applyEffects();
    const lowered = await getResult(best);
    const newBest = await getResult(lower);
    assert.isNull(lowered.pp, 'the lowered result is no longer the best one');
    assert.isNotNull(newBest.pp);
    const player = await db
      .selectFrom('players')
      .select('pp')
      .where('id', '=', 4)
      .executeTakeFirstOrThrow();
    assert.closeTo(Number(player.pp), Number(newBest.pp), 0.01);
    assert.equal(Number(lowered.exp) < Number(newBest.exp), true, 'exp follows the new score');
  });

  it('recalculates both players when a result moves to another player', async () => {
    const id = await insertPhoenixResult(4, 990000);
    await applyEffects();

    await trpcMutation('admin.results.update', { id, edit: { actualPlayerId: 3 } }).expect(200);
    const event = await lastEvent();
    assert.deepEqual(event?.payload, { resultId: id, sharedChartId: 3, playerIds: [4, 3] });

    await applyEffects();
    const players = await db
      .selectFrom('players')
      .select(['id', 'pp'])
      .where('id', 'in', [3, 4])
      .orderBy('id')
      .execute();
    assert.isAbove(Number(players[0].pp), 0, 'player 3 got the pp');
    assert.equal(Number(players[1].pp), 0, 'player 4 lost it');
  });

  it('rejects an unknown player', async () => {
    const id = await insertPhoenixResult(4, 990000);
    const res = await trpcMutation('admin.results.update', { id, edit: { actualPlayerId: 999 } });
    assert.equal(res.status, 400);
  });

  it('deletes a result, then recalculates its player', async () => {
    const lower = await insertPhoenixResult(4, 950000);
    const best = await insertPhoenixResult(4, 990000);
    await applyEffects();

    await trpcMutation('admin.results.delete', { id: best }).expect(200);
    assert.isUndefined(
      await db.selectFrom('results').select('id').where('id', '=', best).executeTakeFirst()
    );
    assert.equal((await lastEvent())?.type, 'resultChanged');

    await applyEffects();
    assert.isNotNull((await getResult(lower)).pp, 'the remaining result is the best one');
  });
});
