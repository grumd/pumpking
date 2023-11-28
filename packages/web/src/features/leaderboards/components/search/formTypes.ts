export interface SearchFormValues {
  songName?: string;
  mixes: string[];
  scoring: 'phoenix' | 'xx';
  playersAll?: string[];
  playersSome?: string[];
  playersNone?: string[];
  sortChartsByPlayers?: string[];
  sortingType:
    | 'date,desc'
    | 'date,asc'
    | 'difficulty,asc'
    | 'difficulty,desc'
    | 'pp,desc'
    | 'pp,asc';
  levels?: [number, number];
  labels?: string[];
  durations?: Array<'Full' | 'Remix' | 'Short' | 'Standard'>;
}
