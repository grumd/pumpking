import {
  checkLocations,
  lastPlayersText,
  updateLocation,
  type Location,
} from '../plugins/locations';
import {
  getAgentLastPlayers,
  getAgentsStatus,
  type AgentStatus,
} from '../plugins/locations/activity';
import { addChart, addPlayer, addResult } from './helpers';
import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { sql } from 'kysely';

const status = (extra: Partial<AgentStatus> = {}): AgentStatus => ({
  name: 'arcade',
  title: 'The Arcade',
  startedAt: '2026-10-01 10:00:00',
  lastUpdatedAt: '2026-10-01 12:00:00',
  players: {},
  ...extra,
});

const at = (naive: string) => Date.parse(`${naive.replace(' ', 'T')}Z`);

describe('Locations', () => {
  it('tells the watchers when the tracked location starts, stalls and resumes', () => {
    const location: Location = { state: status(), stalled: false };

    // restarted after being offline 30 minutes
    assert.deepEqual(
      updateLocation(
        location,
        status({ startedAt: '2026-10-01 12:30:00', lastUpdatedAt: '2026-10-01 12:31:00' }),
        'arcade'
      ),
      ['➕  Location <b>arcade</b> started working after 30m 0s']
    );

    // no heartbeat: not stalled yet after 2 minutes, stalled after 6
    const same = status({ startedAt: '2026-10-01 12:30:00', lastUpdatedAt: '2026-10-01 12:31:00' });
    assert.deepEqual(updateLocation(location, same, 'arcade', at('2026-10-01 12:33:00')), []);
    assert.deepEqual(updateLocation(location, same, 'arcade', at('2026-10-01 12:37:00')), [
      '➖  Location <b>arcade</b> stopped working after 1m 0s',
    ]);
    assert.isTrue(location.stalled);
    assert.deepEqual(updateLocation(location, same, 'arcade', at('2026-10-01 12:38:00')), []);

    assert.deepEqual(
      updateLocation(
        location,
        status({ startedAt: '2026-10-01 12:30:00', lastUpdatedAt: '2026-10-01 12:40:00' }),
        'arcade'
      ),
      ['🟰  Location <b>arcade</b> resumed working']
    );
    assert.isFalse(location.stalled);
  });

  it('tells about new players, only for the tracked location', () => {
    const location: Location = {
      state: status({ players: { Alice: '2026-10-01 11:00:00' } }),
      stalled: false,
    };
    const next = status({ players: { Alice: '2026-10-01 11:00:00', Bob: '2026-10-01 11:50:00' } });
    assert.deepEqual(updateLocation({ ...location }, next, 'arcade', at('2026-10-01 12:00:30')), [
      '👉  Player <b>Bob</b> appeared in location <b>arcade</b>',
    ]);
    assert.deepEqual(updateLocation({ ...location }, next, 'other', at('2026-10-01 12:00:30')), []);
  });

  describe('with agent sessions', () => {
    beforeEach(async () => {
      await db
        .insertInto('agents')
        .values([
          { id: 1, name: 'arcade', token: 't1', title: 'The Arcade' },
          { id: 2, name: 'quiet', token: 't2', title: 'Quiet Place' },
        ])
        .execute();
      await db
        .insertInto('agent_sessions')
        .values([
          {
            agent_id: 1,
            client_session_mark: 'a',
            added_at: sql`UTC_TIMESTAMP() - INTERVAL 90 MINUTE`,
            last_updated_at: sql`UTC_TIMESTAMP() - INTERVAL 1 MINUTE`,
            status: '{}',
          },
          {
            agent_id: 2,
            client_session_mark: 'b',
            added_at: sql`UTC_TIMESTAMP() - INTERVAL 2 DAY`,
            last_updated_at: sql`UTC_TIMESTAMP() - INTERVAL 1 DAY`,
            status: '{}',
          },
        ])
        .execute();
      await addChart();
      await addPlayer({ id: 1, nickname: 'Alice' });
      await addPlayer({ id: 2, nickname: 'Secret', hidden: 1 });
      await addPlayer({ id: 3, nickname: 'Old' });
      await addResult({ playerId: 1, score: 900_000, agent: 1, gainedMinutesAgo: 30 });
      await addResult({ playerId: 2, score: 900_000, agent: 1 });
      // too long ago
      await addResult({ playerId: 3, score: 900_000, agent: 1, gainedMinutesAgo: 7 * 60 });
    });

    it('lists the recent players of an agent, like the legacy lastPlayers', async () => {
      const lastPlayers = await getAgentLastPlayers(1);
      assert.deepEqual(Object.keys(lastPlayers.lastResults), ['PUMP IT UP', 'Alice']);
      assert.match(lastPlayers.lastResults.Alice, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
      assert.deepEqual(lastPlayers.agentStatus, { startedMinsAgo: 90, updatedMinsAgo: 1 });

      assert.deepEqual(await getAgentLastPlayers(3), { lastResults: {} });

      const statuses = await getAgentsStatus();
      assert.deepEqual(Object.keys(statuses), ['1', '2']);
      assert.deepEqual(Object.keys(statuses['1'].players), ['PUMP IT UP', 'Alice']);
      assert.deepEqual(statuses['2'].players, {});
    });

    it('describes a location for the dialog', async () => {
      const text = await lastPlayersText(1, 'The Arcade', 'EN');
      assert.equal(
        text,
        'In location "<i>The Arcade</i>":\n' +
          ' 👉  <b>PUMP IT UP</b> - 0 minutes ago\n' +
          ' 👉  <b>Alice</b> - 30 minutes ago\n' +
          '\n✓  Works 1 hour 30 minutes'
      );
      assert.equal(
        await lastPlayersText(2, 'Quiet Place', 'UA'),
        "❗️ <b>Нема зв'язку 24 години 0 хвилин</b>\n\n" +
          'В локації "<i>Quiet Place</i>" давно нікого нема  😞\n'
      );
    });

    it('keeps the locations between checks and fails when the tracked one is missing', async () => {
      assert.deepEqual(await checkLocations('arcade'), []);
      await db.deleteFrom('agent_sessions').where('agent_id', '=', 1).execute();
      try {
        await checkLocations('arcade');
        assert.fail('should throw');
      } catch (error) {
        assert.equal((error as Error).message, 'No reported location with name arcade is found');
      }
    });
  });
});
