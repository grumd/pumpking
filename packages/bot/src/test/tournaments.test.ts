import { tournamentEndedMessage, tournamentStartedMessages } from '../plugins/tournaments';
import { seedTournament } from './helpers';
import { db } from '@pumpking/database/db';
import { assert } from 'chai';

describe('Tournament posts', () => {
  beforeEach(seedTournament);

  it('announce each bracket with its pool and players', async () => {
    assert.deepEqual(await tournamentStartedMessages(1), [
      'Tournament <b>October 2026</b>  (2026-10-01 - 2026-10-24),  bracket <b>EASY</b>\n' +
        '<i>(more details at https://pumpking.top/#/tournaments)</i>\n\n' +
        ' • <b>Track &lt;1&gt;</b>  XX S18 · Phoenix S19 · Phoenix2 S20\n' +
        '\n@alice_tg  Bob  Carol\n',
      'Tournament <b>October 2026</b>  (2026-10-01 - 2026-10-24),  bracket <b>MID</b>\n' +
        '<i>(more details at https://pumpking.top/#/tournaments)</i>\n\n',
    ]);
  });

  it('announce the podiums at the end', async () => {
    await db
      .insertInto('tournament_results')
      .values(
        (
          [
            [1, 1, 2_900_000, 'gold'],
            [2, 1, 2_900_000, 'gold'],
            [3, 3, 2_000_000, 'bronze'],
          ] as const
        ).map(([playerId, rank, score, medal]) => ({
          tournament_id: 1,
          bracket_id: 10,
          player_id: playerId,
          rank,
          score,
          medal,
          charts: '[]',
          created_at: new Date(),
        }))
      )
      .execute();

    assert.equal(
      await tournamentEndedMessage(1),
      'Tournament <b>October 2026</b> has ended!\n' +
        '<i>(final results at https://pumpking.top/#/tournaments)</i>\n' +
        '\n<b>Easy</b>\n' +
        '🥇 @alice_tg  <code>2,900,000</code>\n' +
        '🥇 Bob  <code>2,900,000</code>\n' +
        '🥉 Carol  <code>2,000,000</code>\n' +
        '\n<b>Mid</b>\nno results\n'
    );
  });
});
