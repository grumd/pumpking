import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
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

  // Ingest does the recheck itself (its tests cover it); this stands in for its endpoint
  describe('recheck', () => {
    let server: Server;
    let respond: (body: { id?: number }) => object;
    let requests: { id?: number }[];

    before((done) => {
      const ingest = express();
      ingest.use(express.json());
      ingest.post('/internal/purgatory/recheck', (req, res) => {
        requests.push(req.body);
        res.json(respond(req.body));
      });
      server = ingest.listen(0, () => {
        process.env.INGEST_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        done();
      });
    });

    after((done) => {
      delete process.env.INGEST_URL;
      server.close(done);
    });

    beforeEach(() => {
      requests = [];
    });

    it('saves the fixes, then has ingest recheck the row', async () => {
      const id = await insertRow({
        reason: 'Unknown player ANON for mix Phoenix2, no similar name',
      });
      respond = () => ({
        outcomes: [{ id, outcome: 'added', status: 'result added' }],
        report: ["Result operation: 'result added'", 'Rechecked 1 items in purgatory'],
      });

      const res = await trpcMutation('admin.purgatory.updateAndRecheck', {
        id,
        edit: { player_name: 'DUMMY2P2' },
      }).expect(200);

      assert.deepEqual(requests, [{ id }]);
      const { outcomes, report } = output(res);
      assert.deepEqual(outcomes, [{ id, outcome: 'added', status: 'result added' }]);
      assert.deepEqual(report, [
        `Purgatory #${id}: player_name 'ANON' → 'DUMMY2P2'`,
        `Purgatory #${id}: valid, moved to results (result added)`,
        "Result operation: 'result added'",
        'Rechecked 1 items in purgatory',
      ]);
      const row = await db.selectFrom('purgatory').select('player_name').executeTakeFirstOrThrow();
      assert.equal(row.player_name, 'DUMMY2P2');
    });

    it('rechecks everything, and tells what happened to each row', async () => {
      respond = () => ({
        outcomes: [
          { id: 1, outcome: 'stays', reason: 'New reason', reasonChanged: true },
          { id: 2, outcome: 'stays', reason: 'Same reason', reasonChanged: false },
          { id: 3, outcome: 'discarded', reason: 'Empty score, not needed' },
        ],
        report: ['Rechecking items IDs [1..3]', 'Rechecked 3 items in purgatory'],
      });

      const { report } = output(await trpcMutation('admin.purgatory.recheck', {}).expect(200));
      assert.deepEqual(requests, [{}]);
      assert.deepEqual(report, [
        'Purgatory #1: still invalid, new reason: New reason',
        'Purgatory #2: still invalid: Same reason',
        'Purgatory #3: discarded (Empty score, not needed)',
        'Rechecking items IDs [1..3]',
        'Rechecked 3 items in purgatory',
      ]);
    });

    it("answers 404 for a row that doesn't exist, or an empty purgatory", async () => {
      respond = () => ({ outcomes: [], report: ['Rechecked 0 items in purgatory'] });

      const missing = await trpcMutation('admin.purgatory.recheck', { id: 12345 });
      assert.equal(missing.status, 404);
      assert.equal(errorMessage(missing), 'Purgatory row not found: id 12345');
      assert.deepEqual(requests, []);

      const empty = await trpcMutation('admin.purgatory.recheck', {});
      assert.equal(empty.status, 404);
      assert.equal(errorMessage(empty), 'Purgatory is empty');
    });

    it('answers 502 when ingest fails or is down', async () => {
      respond = () => ({ error: 'Database is gone' });
      const failed = await trpcMutation('admin.purgatory.recheck', {});
      assert.equal(failed.status, 502);
      assert.equal(errorMessage(failed), 'Ingest failed to recheck: Database is gone');

      const url = process.env.INGEST_URL;
      process.env.INGEST_URL = 'http://127.0.0.1:1';
      try {
        const down = await trpcMutation('admin.purgatory.recheck', {});
        assert.equal(down.status, 502);
        assert.match(errorMessage(down), /^Ingest didn't answer/);
      } finally {
        process.env.INGEST_URL = url;
      }
    });
  });
});
