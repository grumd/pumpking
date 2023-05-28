import { Column, Table } from '@wwwouter/typed-knex';

import { Player } from './Player';
import { Result } from './Result';
import { SharedChart } from './SharedChart';

@Table('results_highest_score_rank')
export class ResultHighestScoreRank {
  @Column({ primary: true })
  public shared_chart_id: number;
  @Column({ name: 'shared_chart_id' })
  public shared_chart: SharedChart;
  @Column({ primary: true })
  public player_id: number;
  @Column({ name: 'player_id' })
  public player: Player;
  @Column()
  public result_id: number;
  @Column({ name: 'result_id' })
  public result: Result;
}
