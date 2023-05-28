import { Column, Table } from '@wwwouter/typed-knex';

@Table('tracks')
export class Track {
  @Column({ primary: true })
  public id: number;
  @Column()
  public external_id: number;
  @Column()
  public full_name: string;
  @Column()
  public short_name: string;
  @Column()
  public duration: 'Standard' | 'Remix' | 'Full' | 'Short';
}

// export interface Track {
//   id: number;
//   external_id: number;
//   full_name: string;
//   short_name: string;
//   duration: string;
// }
