import { db } from '@pumpking/core/db';
import { assert } from 'chai';
import { errorMessage, output, trpcMutation, trpcQuery } from 'test/helpers/trpc';

describe('Admin agents', () => {
  it('lists agents with when they were last seen, without their tokens', async () => {
    await db
      .insertInto('agent_sessions')
      .values({
        agent_id: 2,
        added_at: new Date('2026-09-30T10:00:00Z'),
        last_updated_at: new Date('2026-09-30T12:00:00Z'),
        client_session_mark: 'mark',
        status: '{}',
      })
      .execute();

    const agents = output(await trpcQuery('admin.agents.list').expect(200));
    assert.deepEqual(
      agents.map((agent: object) => Object.keys(agent).sort()),
      [
        ['id', 'last_seen_at', 'name', 'title'],
        ['id', 'last_seen_at', 'name', 'title'],
      ]
    );
    assert.isNull(agents[0].last_seen_at);
    assert.equal(agents[1].last_seen_at, '2026-09-30T12:00:00.000Z');

    const { token } = output(await trpcQuery('admin.agents.token', { id: 2 }).expect(200));
    assert.equal(token, 'arcade-token');
  });

  it('creates an agent with a random token, and checks the name', async () => {
    const created = output(
      await trpcMutation('admin.agents.create', { name: 'new-arcade', title: '' }).expect(200)
    );
    assert.match(created.token, /^[a-zA-Z0-9]{30}$/);
    const agent = await db
      .selectFrom('agents')
      .selectAll()
      .where('id', '=', created.id)
      .executeTakeFirstOrThrow();
    assert.deepEqual(agent, {
      id: created.id,
      name: 'new-arcade',
      title: 'new-arcade',
      token: created.token,
    });

    const taken = await trpcMutation('admin.agents.create', { name: 'test-arcade', title: '' });
    assert.equal(errorMessage(taken), "Agent #2 already has name 'test-arcade'");
    const invalid = await trpcMutation('admin.agents.create', { name: 'with space', title: '' });
    assert.equal(invalid.status, 400);
  });

  it('renames an agent and replaces its token', async () => {
    const { report } = output(
      await trpcMutation('admin.agents.update', {
        id: 2,
        fields: { name: 'test-arcade', title: 'Renamed Arcade' },
      }).expect(200)
    );
    assert.deepEqual(report, ["Agent #2: title 'Test Arcade' → 'Renamed Arcade'"]);

    const { token } = output(await trpcMutation('admin.agents.rotateToken', { id: 2 }).expect(200));
    assert.notEqual(token, 'arcade-token');
    const agent = await db
      .selectFrom('agents')
      .select('token')
      .where('id', '=', 2)
      .executeTakeFirstOrThrow();
    assert.equal(agent.token, token);
  });
});

describe('Admin purgatory', () => {
  // A Phoenix 2 row on the seeded Track 1 S20 (100 steps): valid once its player is known
  const insertRow = async (fields: { reason: string; player_name?: string; score?: number }) => {
    const { insertId } = await db
      .insertInto('purgatory')
      .values({
        screen_file: 'test-arcade/2026-09-30/screen.mp4',
        recognition_notes: 'result',
        added: new Date('2026-09-30T10:00:00'),
        agent: 2,
        track_name: 'TRACK 1',
        mix_name: 'Phoenix2',
        chart_label: 'S20',
        player_name: 'ANON',
        gained: new Date('2026-09-30T09:59:00'),
        exact_gain_date: 1,
        rank_mode: 0,
        mods_list: '',
        score: 1_000_000,
        perfects: 100,
        greats: 0,
        goods: 0,
        bads: 0,
        misses: 0,
        max_combo: 100,
        grade: 'SSS+',
        is_pass: 1,
        plate: 'PG',
        ...fields,
      })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  beforeEach(async () => {
    await db
      .insertInto('arcade_track_names')
      .values({ mix_id: 28, track_id: 1, name: 'Track 1', name_edist: 0 })
      .execute();
  });

  const unknownAnon = /^Unknown player ANON for mix Phoenix2, closest is \S+ with \d+ edits$/;

  it('lists, shows and deletes rows', async () => {
    const id = await insertRow({ reason: 'Unknown player ANON for mix Phoenix2, no similar name' });

    const rows = output(await trpcQuery('admin.purgatory.list').expect(200));
    assert.deepEqual(
      rows.map((row: { id: number; agent_name: string }) => [row.id, row.agent_name]),
      [[id, 'test-arcade']]
    );
    const row = output(await trpcQuery('admin.purgatory.get', { id }).expect(200));
    assert.equal(row.player_name, 'ANON');

    await trpcMutation('admin.purgatory.delete', { id }).expect(200);
    assert.lengthOf(await db.selectFrom('purgatory').select('id').execute(), 0);
  });

  it('saves the fixes, then rechecks the row: valid now, it moves to results', async () => {
    const id = await insertRow({ reason: 'Unknown player ANON for mix Phoenix2, no similar name' });

    const res = await trpcMutation('admin.purgatory.updateAndRecheck', {
      id,
      edit: { player_name: 'DUMMY2P2' },
    }).expect(200);

    const { outcomes, report } = output(res);
    assert.deepEqual(outcomes, [{ id, outcome: 'added', status: 'result added' }]);
    assert.deepEqual(report, [
      `Purgatory #${id}: player_name 'ANON' → 'DUMMY2P2'`,
      `Purgatory #${id}: valid, moved to results (result added)`,
      "Result operation: 'result added'",
      'Rechecked 1 items in purgatory',
    ]);

    assert.lengthOf(await db.selectFrom('purgatory').select('id').execute(), 0);
    const result = await db
      .selectFrom('results')
      .selectAll()
      .where('screen_file', '=', 'test-arcade/2026-09-30/screen.mp4')
      .executeTakeFirstOrThrow();
    assert.include(result, {
      player_id: 2,
      player_name: 'DUMMY2P2',
      chart_instance: 3,
      score_phoenix: 1_000_000,
    });
    // Keeps when it was added: the rivals notifications tell how long ago it was
    assert.equal(result.added.getTime(), new Date('2026-09-30T10:00:00').getTime());
    const event = await db.selectFrom('events').selectAll().executeTakeFirstOrThrow();
    assert.deepEqual([event.type, event.payload], ['resultAdded', { resultId: result.id }]);
  });

  it('rechecks everything: rows stay with their new reason, are discarded or move', async () => {
    const stays = await insertRow({ reason: 'Old reason' });
    const discarded = await insertRow({ reason: 'Old reason', player_name: 'DUMMY2P2', score: 0 });
    const valid = await insertRow({ reason: 'Old reason', player_name: 'DUMMY2P2' });

    const { outcomes } = output(await trpcMutation('admin.purgatory.recheck', {}).expect(200));
    assert.lengthOf(outcomes, 3);
    assert.deepInclude(outcomes[0], { id: stays, outcome: 'stays', reasonChanged: true });
    assert.match(outcomes[0].reason, unknownAnon);
    assert.deepEqual(outcomes.slice(1), [
      { id: discarded, outcome: 'discarded', reason: 'Empty score, not needed' },
      { id: valid, outcome: 'added', status: 'result added' },
    ]);

    const rows = await db.selectFrom('purgatory').select(['id', 'reason']).execute();
    assert.deepEqual(rows, [{ id: stays, reason: outcomes[0].reason }]);

    const again = output(await trpcMutation('admin.purgatory.recheck', { id: stays }).expect(200));
    assert.deepInclude(again.outcomes[0], { id: stays, outcome: 'stays', reasonChanged: false });
  });

  it("answers 404 for a row that doesn't exist, or an empty purgatory", async () => {
    const missing = await trpcMutation('admin.purgatory.recheck', { id: 12345 });
    assert.equal(missing.status, 404);
    assert.equal(errorMessage(missing), 'Purgatory row not found: id 12345');

    const empty = await trpcMutation('admin.purgatory.recheck', {});
    assert.equal(empty.status, 404);
    assert.equal(errorMessage(empty), 'Purgatory is empty');
  });
});
