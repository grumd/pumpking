import { Column, Table } from '@wwwouter/typed-knex';

@Table('players')
export class Player {
  @Column({ primary: true })
  public id: number;
  @Column()
  public nickname: string;
  @Column()
  public arcade_name: string;
  @Column()
  public arcade_name_edit_dist: number;
  @Column()
  public email: string;
  @Column()
  public region: string;
  @Column()
  public hidden: 1 | 0;
  @Column()
  public discard_results: 1 | 0;
  @Column()
  public hidden_since: Date;
  @Column()
  public preferences: string;
  @Column()
  public show_all_regions: 1 | 0;
  @Column()
  public preferences_updated: Date;
  @Column()
  public stat_top_req_counter: number;
  @Column()
  public stat_top_last_req_at: Date;
  @Column()
  public pp: number;
  @Column()
  public is_admin: boolean;
  @Column()
  public can_add_results_manually: boolean;
}
// export interface Player {
//   id: number;
//   nickname: string;
//   arcade_name: string;
//   arcade_name_edit_dist: number;
//   email: string;
//   region: string;
//   hidden: 1 | 0;
//   hidden_since: Date;
//   preferences: string;
//   show_all_regions: 1 | 0;
//   preferences_updated: Date;
//   stat_top_req_counter: number;
//   stat_top_last_req_at: Date;
// }
