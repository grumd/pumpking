import { Column, Table } from '@wwwouter/typed-knex';
import { Track } from './Track';

@Table('shared_charts')
export class SharedChart {
  @Column({ primary: true })
  public id: number;
  @Column({ name: 'track' })
  public track_id: number;
  @Column()
  public track: Track;
  @Column()
  public index_in_track: number;
  @Column()
  public max_pp: number;
  @Column()
  public last_updated_at: Date;
  @Column()
  public top_results_added_at: Date;
}

// export interface SharedChart {
//   id: number;
//   track: number;
//   index_in_track: number;
//   last_updated_at: Date;
// }
