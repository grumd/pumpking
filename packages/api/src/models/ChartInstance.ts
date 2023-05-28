import { Column, Table } from '@wwwouter/typed-knex';
import { SharedChart } from './SharedChart';
import { Track } from './Track';

@Table('chart_instances')
export class ChartInstance {
  @Column({ primary: true })
  public id: number;
  @Column({ name: 'track' })
  public track_id: number;
  @Column()
  public track: Track;
  @Column({ name: 'shared_chart' })
  public shared_chart_id: number;
  @Column()
  public shared_chart: SharedChart;
  @Column()
  public mix: number;
  @Column()
  public label: string;
  @Column()
  public level: number;
  @Column()
  public max_total_steps: number;
  @Column()
  public min_total_steps: number;
  @Column()
  public max_possible_score_norank: number;
  @Column()
  public max_possible_score_norank_from_result: number;
  @Column()
  public interpolated_difficulty: number;
}

// export interface ChartInstance {
//   id: number;
//   track: number;
//   shared_chart: number;
//   mix: number;
//   label: string;
//   level: number;
//   max_total_steps: number;
//   min_total_steps: number;
//   max_possible_score_norank: number;
//   max_possible_score_norank_from_result: number;
//   interpolated_difficulty: number;
// }
