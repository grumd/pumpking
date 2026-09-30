import { db } from '@pumpking/core/db';
import { assert } from 'chai';
import { createRegistrationToken } from 'services/auth/googleLogin';
import { errorMessage, output, trpcMutation, trpcQuery } from 'test/helpers/trpc';
import { getResultDefaults } from 'test/seeds/initialSeed';

describe('Admin players', () => {
  const fields = {
    nickname: 'New Player',
    email: 'new@example.com',
    region: 'UA',
    telegramTag: null,
    telegramId: null,
    hidden: false,
    discardResults: false,
    isAdmin: false,
    canAddResultsManually: true,
    actualPlayerId: null,
    arcadeNames: { 26: null, 27: null, 28: { name: ' new #1234 ', edist: 1 } },
  };

  const arcadeNamesOf = (playerId: number) =>
    db
      .selectFrom('arcade_player_names')
      .select(['mix_id', 'name', 'name_edist'])
      .where('player_id', '=', playerId)
      .orderBy('mix_id')
      .execute();

  it('lists players with their arcade names per mix', async () => {
    const players = output(await trpcQuery('admin.players.list').expect(200));
    const player2 = players.find((p: { id: number }) => p.id === 2);
    assert.deepEqual(player2.arcadeNames, {
      26: { name: 'DUMMY2', edist: 0 },
      27: null,
      28: { name: 'DUMMY2P2', edist: 0 },
    });
    assert.isFalse(player2.hidden);
  });

  it('creates a player, with upper case arcade names', async () => {
    const { id, report } = output(
      await trpcMutation('admin.players.save', { id: null, fields }).expect(200)
    );

    const player = await db
      .selectFrom('players')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    assert.equal(player.nickname, 'New Player');
    assert.equal(player.can_add_results_manually, 1);
    assert.deepEqual(await arcadeNamesOf(id), [{ mix_id: 28, name: 'NEW #1234', name_edist: 1 }]);
    assert.include(report, `Player #${id} 'New Player' created`);
  });

  it('keeps nicknames and arcade names unique', async () => {
    const sameNickname = await trpcMutation('admin.players.save', {
      id: null,
      fields: { ...fields, nickname: 'Dummy 1' },
    });
    assert.equal(sameNickname.status, 400);
    assert.equal(errorMessage(sameNickname), "Player #1 already has nickname 'Dummy 1'");

    const sameArcadeName = await trpcMutation('admin.players.save', {
      id: null,
      fields: { ...fields, arcadeNames: { 26: { name: 'dummy2', edist: 0 } } },
    });
    assert.equal(sameArcadeName.status, 400);
    assert.equal(errorMessage(sameArcadeName), "Player #2 already has XX arcade name 'DUMMY2'");

    // A player keeps their own names
    const player = output(await trpcQuery('admin.players.get', { id: 2 }).expect(200));
    await trpcMutation('admin.players.save', {
      id: 2,
      fields: { ...fields, nickname: 'Dummy 2', arcadeNames: player.arcadeNames },
    }).expect(200);
  });

  it('allows aliases of real players only', async () => {
    await db.updateTable('players').set({ actual_player_id: 1 }).where('id', '=', 3).execute();

    const ofAlias = await trpcMutation('admin.players.save', {
      id: 4,
      fields: { ...fields, nickname: 'Dummy 4', actualPlayerId: 3 },
    });
    assert.equal(ofAlias.status, 400);
    assert.equal(errorMessage(ofAlias), 'Player #3 is an alias of #1 itself: pick that player');

    const ofThemselves = await trpcMutation('admin.players.save', {
      id: 4,
      fields: { ...fields, nickname: 'Dummy 4', actualPlayerId: 4 },
    });
    assert.equal(ofThemselves.status, 400);
  });

  it('hiding a player sets hidden_since and bumps their charts', async () => {
    await db
      .insertInto('results')
      .values({ ...getResultDefaults({ playerId: 4 }), shared_chart: 3, chart_instance: 3 })
      .execute();
    await db.updateTable('shared_charts').set({ last_updated_at: null }).execute();

    const player = output(await trpcQuery('admin.players.get', { id: 4 }).expect(200));
    const { report } = output(
      await trpcMutation('admin.players.save', {
        id: 4,
        fields: { ...fields, nickname: 'Dummy 4', hidden: true, arcadeNames: player.arcadeNames },
      }).expect(200)
    );

    const saved = await db
      .selectFrom('players')
      .select(['hidden', 'hidden_since'])
      .where('id', '=', 4)
      .executeTakeFirstOrThrow();
    assert.equal(saved.hidden, 1);
    assert.isNotNull(saved.hidden_since);
    const bumped = await db
      .selectFrom('shared_charts')
      .select('id')
      .where('last_updated_at', 'is not', null)
      .orderBy('id')
      .execute();
    assert.deepEqual(
      bumped.map((chart) => chart.id),
      [3]
    );
    assert.include(
      report,
      'Player #4: hidden status changed, marked updated on the charts they have results on (1)'
    );
  });

  it('an empty arcade name removes it', async () => {
    const { report } = output(
      await trpcMutation('admin.players.save', {
        id: 2,
        fields: {
          ...fields,
          nickname: 'Dummy 2',
          arcadeNames: { 26: { name: 'DUMMY2', edist: 2 }, 28: { name: '', edist: 0 } },
        },
      }).expect(200)
    );
    assert.deepEqual(await arcadeNamesOf(2), [{ mix_id: 26, name: 'DUMMY2', name_edist: 2 }]);
    assert.includeMembers(report, [
      "Player #2: XX arcade name 'DUMMY2' (0) → 'DUMMY2' (2)",
      "Player #2: Phoenix2 arcade name 'DUMMY2P2' removed",
    ]);
  });

  it('registration stores the arcade name for the current mix', async () => {
    const { token } = createRegistrationToken('registered@example.com');
    const res = await trpcMutation(
      'auth.register',
      { registrationToken: token, nickname: 'Registered', region: null, arcadeName: 'reg #42' },
      null
    ).expect(200);
    assert.isString(output(res).session);

    const player = await db
      .selectFrom('players')
      .select('id')
      .where('nickname', '=', 'Registered')
      .executeTakeFirstOrThrow();
    assert.deepEqual(await arcadeNamesOf(player.id), [
      { mix_id: 28, name: 'REG #42', name_edist: 1 },
    ]);
  });
});
