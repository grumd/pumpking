import {
  getMostPlayedTracks,
  getMostPlayedTracksMonthly,
  getLeastRecentlyPlayedTracks,
  getLeastPlayedTracks,
} from 'services/tracks/trackStats';
import { publicProcedure, router } from 'trpc/trpc';

export const mostPlayed = publicProcedure.query(async () => {
  return getMostPlayedTracks();
});

export const mostPlayedMonthly = publicProcedure.query(async () => {
  return getMostPlayedTracksMonthly();
});

export const leastRecentlyPlayed = publicProcedure.query(async () => {
  return getLeastRecentlyPlayedTracks();
});

export const leastPlayed = publicProcedure.query(async () => {
  return getLeastPlayedTracks();
});

export const tracks = router({
  mostPlayed,
  mostPlayedMonthly,
  leastRecentlyPlayed,
  leastPlayed,
});
