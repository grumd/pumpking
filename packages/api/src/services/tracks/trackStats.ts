import { sql } from 'kysely';
import { db } from 'db';
import { mix as currentMix } from 'constants/currentMix';

export interface TrackStat {
  id: number;
  full_name: string;
  countplay: number;
}

export interface TrackLastPlayed {
  id: number;
  full_name: string;
  last_play: Date | null;
}

export async function getMostPlayedTracks(): Promise<TrackStat[]> {
  const result = await db
    .selectFrom('results')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .select(['tracks.id', 'tracks.full_name'])
    .select(sql<number>`COUNT(*)`.as('countplay'))
    .groupBy('tracks.id')
    .orderBy('countplay', 'desc')
    .limit(20)
    .execute();

  return result;
}

export async function getMostPlayedTracksMonthly(): Promise<TrackStat[]> {
  const result = await db
    .selectFrom('results')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .where('results.gained', '>=', sql`CURRENT_DATE - INTERVAL 1 MONTH`)
    .select(['tracks.id', 'tracks.full_name'])
    .select(sql<number>`COUNT(*)`.as('countplay'))
    .groupBy('tracks.id')
    .orderBy('countplay', 'desc')
    .limit(20)
    .execute();

  return result;
}

export async function getLeastRecentlyPlayedTracks(): Promise<TrackLastPlayed[]> {
  const result = await db
    .selectFrom('results')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .where('results.mix', '=', currentMix)
    .select(['tracks.id', 'tracks.full_name'])
    .select(sql<Date>`MAX(results.gained)`.as('last_play'))
    .groupBy('tracks.id')
    .orderBy('last_play', 'asc')
    .limit(20)
    .execute();

  return result;
}

export async function getLeastPlayedTracks(): Promise<TrackStat[]> {
  const result = await db
    .selectFrom('results')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .where('results.mix', '=', currentMix)
    .select(['tracks.id', 'tracks.full_name'])
    .select(sql<number>`COUNT(*)`.as('countplay'))
    .groupBy('tracks.id')
    .orderBy('countplay', 'asc')
    .limit(20)
    .execute();

  return result;
}
