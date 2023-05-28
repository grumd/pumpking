import { Column, Table } from '@wwwouter/typed-knex';
import { Grade } from 'constants/grades';
import { ChartInstance } from './ChartInstance';
import { Player } from './Player';
import { SharedChart } from './SharedChart';

@Table('results')
export class Result {
  @Column({ primary: true })
  public id: number;
  @Column()
  public token: string;
  @Column()
  public screen_file: string;
  @Column()
  public recognition_notes: string;
  @Column()
  public added: Date;
  @Column()
  public agent: number;
  @Column()
  public track_name: string;
  @Column()
  public mix_name: string;
  @Column()
  public mix: number;
  @Column()
  public chart_label: string;
  @Column({ name: 'shared_chart' })
  public shared_chart_id: number;
  @Column()
  public shared_chart: SharedChart;
  @Column({ name: 'chart_instance' })
  public chart_instance_id: number;
  @Column()
  public chart_instance: ChartInstance;
  @Column()
  public player_name: string;
  @Column()
  public player_id: number;
  @Column({ name: 'player_id' })
  public player: Player;
  @Column()
  public recognized_player_id: number;
  @Column({ name: 'recognized_player_id' })
  public recognized_player: Player;
  @Column()
  public actual_player_id: number;
  @Column({ name: 'actual_player_id' })
  public actual_player: Player;
  @Column()
  public gained: Date;
  @Column()
  public exact_gain_date: 1 | 0;
  @Column()
  public rank_mode: 1 | 0;
  @Column()
  public mods_list: string;
  @Column()
  public score: number;
  @Column()
  public score_xx: number;
  @Column()
  public score_increase: number;
  @Column()
  public misses: number;
  @Column()
  public bads: number;
  @Column()
  public goods: number;
  @Column()
  public greats: number;
  @Column()
  public perfects: number;
  @Column()
  public grade: Grade;
  @Column()
  public max_combo: number;
  @Column()
  public calories: number;
  @Column()
  public is_new_best_score: 1 | 0;
  @Column()
  public pp: number;
  @Column()
  public is_hidden: 1 | 0;
  @Column()
  public is_manual_input: 1 | 0;
}

// export interface Result {
//   id: number;
//   token: string;
//   screen_file: string;
//   recognition_notes: string;
//   added: Date;
//   agent: number;
//   track_name: string;
//   mix_name: string;
//   mix: number;
//   chart_label: string;
//   shared_chart: number;
//   chart_instance: number;
//   player_name: string;
//   player_id: number;
//   recognized_player_id: number;
//   actual_player_id: number;
//   gained: Date;
//   exact_gain_date: 1 | 0;
//   rank_mode: 1 | 0;
//   mods_list: string;
//   score: number;
//   score_xx: number;
//   score_increase: number;
//   misses: number;
//   bads: number;
//   goods: number;
//   greats: number;
//   perfects: number;
//   grade: Grade;
//   max_combo: number;
//   calories: number;
//   is_new_best_score: 1 | 0;
// }
