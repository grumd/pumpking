import { Column, Table } from '@wwwouter/typed-knex';

import { Player } from './Player';

@Table('sessions')
export class Session {
  @Column({ primary: true })
  public id: string;
  @Column()
  public player: Player;
  @Column()
  public established: Date;
  @Column()
  public valid_until: Date;
}
