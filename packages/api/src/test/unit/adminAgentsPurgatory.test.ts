import { db } from '@pumpking/core/db';
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
  const insertRow = async (reason: string) => {
    const { insertId } = await db
      .insertInto('purgatory')
      .values({
        screen_file: 'test-arcade/2026-09-30/screen.mp4',
        recognition_notes: '',
        reason,
        added: new Date(),
        agent: 2,
        track_name: 'TRACK 1',
        mix_name: 'Phoenix2',
        chart_label: 'S20',
        player_name: 'ANON',
        gained: new Date(),
        exact_gain_date: 1,
        score: 900000,
      })
      .executeTakeFirstOrThrow();
    return Number(insertId);
  };

  it('lists, shows and deletes rows', async () => {
    const id = await insertRow('Unknown player ANON for mix Phoenix2, no similar name');

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

  describe('recheck', () => {
    // Stands in for the Python backend's /admin/purgatory/recheck
    let server: Server;
    let respond: (body: { ids?: number[] }) => Promise<object>;
    let requests: { headers: Record<string, unknown>; body: { ids?: number[] } }[];

    before((done) => {
      const legacy = express();
      legacy.use(express.json());
      legacy.post('/admin/purgatory/recheck', async (req, res) => {
        requests.push({ headers: req.headers, body: req.body });
        res.json(await respond(req.body));
      });
      server = legacy.listen(0, () => {
        process.env.LEGACY_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        done();
      });
    });

    after((done) => {
      delete process.env.LEGACY_API_URL;
      server.close(done);
    });

    beforeEach(() => {
      requests = [];
    });

    it('saves the fixes, then rechecks the row as the super agent', async () => {
      const id = await insertRow('Unknown player ANON for mix Phoenix2, no similar name');
      respond = async () => {
        // Python moves the now valid row to results
        await db.deleteFrom('purgatory').where('id', '=', id).execute();
        return {
          updates: [{ status: 'result added' }],
          report: ["Result operation: 'result added'"],
        };
      };

      const res = await trpcMutation('admin.purgatory.updateAndRecheck', {
        id,
        edit: { player_name: 'DUMMY2P2' },
      }).expect(200);

      assert.deepEqual(requests[0].body, { ids: [id, id] });
      assert.equal(requests[0].headers['agent-name'], 'root');
      assert.equal(requests[0].headers['agent-token'], 'root-token');
      const { outcomes, report } = output(res);
      assert.deepEqual(outcomes, [{ id, outcome: 'added' }]);
      assert.deepEqual(report, [
        `Purgatory #${id}: player_name 'ANON' → 'DUMMY2P2'`,
        `Purgatory #${id}: valid, moved to results`,
        "Result operation: 'result added'",
      ]);
    });

    it('rechecks everything: rows stay, get a new reason or are discarded', async () => {
      const stays = await insertRow('Invalid grade');
      const changes = await insertRow('Invalid plate');
      const discarded = await insertRow('Invalid score');
      respond = async (body) => {
        assert.isUndefined(body.ids, 'no ids means every row');
        await db
          .updateTable('purgatory')
          .set({ reason: 'Invalid grade now' })
          .where('id', '=', changes)
          .execute();
        await db.deleteFrom('purgatory').where('id', '=', discarded).execute();
        return {
          updates: [
            { id: changes, from: 'Invalid plate', to: 'Invalid grade now' },
            { id: discarded, from: 'Invalid score', discarded: 'Empty score, not needed' },
          ],
        };
      };

      const { outcomes } = output(await trpcMutation('admin.purgatory.recheck', {}).expect(200));
      assert.deepEqual(outcomes, [
        { id: stays, outcome: 'stays', reason: 'Invalid grade', reasonChanged: false },
        { id: changes, outcome: 'stays', reason: 'Invalid grade now', reasonChanged: true },
        { id: discarded, outcome: 'discarded', reason: 'Empty score, not needed' },
      ]);
    });

    it("reports Python's error from its traceback", async () => {
      const id = await insertRow('Invalid grade');
      respond = async () => ({
        error: 'Traceback (most recent call last):\n  File "x.py"\nException: permission denied\n',
      });

      const res = await trpcMutation('admin.purgatory.recheck', { id });
      assert.equal(res.status, 502);
      assert.equal(errorMessage(res), 'The legacy Python API failed: Exception: permission denied');
    });

    it('needs LEGACY_API_URL', async () => {
      const id = await insertRow('Invalid grade');
      const url = process.env.LEGACY_API_URL;
      delete process.env.LEGACY_API_URL;
      try {
        const res = await trpcMutation('admin.purgatory.recheck', { id });
        assert.equal(res.status, 503);
      } finally {
        process.env.LEGACY_API_URL = url;
      }
    });
  });
});
