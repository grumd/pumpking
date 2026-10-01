import { db, type Transaction } from '@pumpking/database/db';
import { ARCADE_NAME_MIXES, MIXES } from '@pumpking/utils/mixes';
import { error } from 'utils';
import { z } from 'zod';

/**
 * Syncs the tracklist from a tracklist file into tracks, shared_charts and
 * chart_instances: adds what's new and updates what changed. Ported from the legacy
 * admin CLI (piu-top `admin/admin_tracklist.py`), which read the same file.
 *
 * The file has `mixes` (keys in mix order: the n-th key is mix id n) and `tracklist`:
 * tracks by key, each with its shared charts (`charts`, by index in the track) and their
 * instances per mix (`instances[mix][index]`). A track's key is its `external_id`; the
 * track may also be known by an `arcadeID` or `altID`s (older keys).
 */

const chartInstanceSchema = z.object({
  label: z.string(),
  level: z.number().int().optional(),
  levelText: z.string().optional(),
});

const trackSchema = z.object({
  title: z.string(),
  shortTitle: z.string().optional(),
  duration: z.enum(['Short', 'Standard', 'Remix', 'Full']),
  arcadeID: z.string().optional(),
  altID: z.array(z.string()).optional(),
  charts: z.record(z.object({ type: z.enum(['S', 'D', 'HD', 'COOP']) })),
  instances: z.record(z.record(chartInstanceSchema)),
});

export const tracklistFileSchema = z.object({
  mixes: z.record(z.unknown()),
  tracklist: z.record(trackSchema),
});

export type TracklistFile = z.infer<typeof tracklistFileSchema>;

interface LocalTrack {
  key: string;
  title: string;
  shortTitle: string;
  duration: 'Short' | 'Standard' | 'Remix' | 'Full';
  serverId?: number;
}

interface LocalSharedChart {
  track: LocalTrack;
  index: number;
  type: 'S' | 'D' | 'HD' | 'COOP';
  serverId?: number;
}

interface LocalChartInstance {
  sharedChart: LocalSharedChart;
  mixId: number;
  mixName: string;
  label: string;
  level?: number;
  serverId?: number;
}

type Operation =
  | { kind: 'addTrack'; track: LocalTrack }
  | { kind: 'updateTrack'; track: LocalTrack; changes: string[] }
  | { kind: 'addSharedChart'; sharedChart: LocalSharedChart }
  | { kind: 'updateSharedChart'; sharedChart: LocalSharedChart; changes: string[] }
  | { kind: 'addChartInstance'; chartInstance: LocalChartInstance }
  | { kind: 'updateChartInstance'; chartInstance: LocalChartInstance; changes: string[] };

const describeOperation = (op: Operation): string => {
  switch (op.kind) {
    case 'addTrack':
      return `Add track ${op.track.key} '${op.track.title}'`;
    case 'updateTrack':
      return `Update track ${op.track.key} #${op.track.serverId}: ${op.changes.join(', ')}`;
    case 'addSharedChart':
      return `Add chart ${op.sharedChart.track.key} #${op.sharedChart.index} (${op.sharedChart.type})`;
    case 'updateSharedChart':
      return `Update chart ${op.sharedChart.track.key} #${op.sharedChart.index}: ${op.changes.join(
        ', '
      )}`;
    case 'addChartInstance':
      return `Add chart instance ${op.chartInstance.sharedChart.track.key} ${op.chartInstance.label} @ ${op.chartInstance.mixName}`;
    case 'updateChartInstance':
      return `Update chart instance ${op.chartInstance.sharedChart.track.key} @ ${
        op.chartInstance.mixName
      } #${op.chartInstance.serverId}: ${op.changes.join(', ')}`;
  }
};

const planSync = async (file: TracklistFile) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Mix ids come from the order of the file's mixes
  const mixNames = Object.keys(file.mixes);
  for (const [name, id] of Object.entries(MIXES)) {
    const index = mixNames.indexOf(name);
    if (index >= 0 && index + 1 !== id) {
      errors.push(`Mix ${name} is mix #${index + 1} in the file, but #${id} here`);
    }
  }

  // The file's tracks, charts and chart instances, linked to each other
  const tracks = new Map<string, LocalTrack>();
  const sharedCharts = new Map<LocalTrack, Map<number, LocalSharedChart>>();
  const chartInstances = new Map<LocalTrack, Map<string, Map<number, LocalChartInstance>>>();
  const trackKeys = new Map<string, string>();

  for (const [key, fileTrack] of Object.entries(file.tracklist)) {
    const track: LocalTrack = {
      key,
      title: fileTrack.title,
      shortTitle: fileTrack.shortTitle ?? fileTrack.title,
      duration: fileTrack.duration,
    };
    tracks.set(key, track);

    for (const otherKey of [key, fileTrack.arcadeID, ...(fileTrack.altID ?? [])]) {
      if (otherKey == null) {
        continue;
      }
      const existing = trackKeys.get(otherKey);
      if (existing != null && existing !== key) {
        errors.push(`Track key '${otherKey}' is used twice, by '${existing}' and '${key}'`);
      }
      trackKeys.set(otherKey, key);
    }

    const charts = new Map<number, LocalSharedChart>();
    for (const [index, chart] of Object.entries(fileTrack.charts)) {
      charts.set(Number(index), { track, index: Number(index), type: chart.type });
    }
    sharedCharts.set(track, charts);

    const instancesByMix = new Map<string, Map<number, LocalChartInstance>>();
    mixNames.forEach((mixName, mixIndex) => {
      const instances = fileTrack.instances[mixName];
      if (!instances) {
        return;
      }
      const byIndex = new Map<number, LocalChartInstance>();
      for (const [index, instance] of Object.entries(instances)) {
        const sharedChart = charts.get(Number(index));
        if (!sharedChart) {
          errors.push(
            `Track ${key} has an instance of chart #${index} @ ${mixName}, but no chart #${index}`
          );
          continue;
        }
        const levelFromText =
          instance.levelText && instance.levelText !== '??'
            ? Number(instance.levelText)
            : undefined;
        byIndex.set(Number(index), {
          sharedChart,
          mixId: mixIndex + 1,
          mixName,
          label: instance.label.replace('-15/16(15)', '-15').replace('-15/16(16)', '-16'),
          level: instance.level ?? (Number.isInteger(levelFromText) ? levelFromText : undefined),
        });
      }
      instancesByMix.set(mixName, byIndex);
    });
    chartInstances.set(track, instancesByMix);
  }

  // Match the DB's rows to the file's
  const [serverTracks, serverSharedCharts, serverChartInstances] = await Promise.all([
    db
      .selectFrom('tracks')
      .select(['id', 'external_id', 'full_name', 'short_name', 'duration'])
      .execute(),
    db.selectFrom('shared_charts').select(['id', 'track', 'index_in_track', 'type']).execute(),
    db.selectFrom('chart_instances').select(['id', 'shared_chart', 'mix', 'label']).execute(),
  ]);

  const trackChanges = new Map<LocalTrack, string[]>();
  const tracksById = new Map<number, LocalTrack>();
  for (const serverTrack of serverTracks) {
    const key = trackKeys.get(serverTrack.external_id);
    const track = key != null ? tracks.get(key) : undefined;
    if (!track) {
      errors.push(`Track #${serverTrack.id} '${serverTrack.external_id}' isn't in the file`);
      continue;
    }
    track.serverId = serverTrack.id;
    tracksById.set(serverTrack.id, track);
    const changes = [
      serverTrack.short_name !== track.shortTitle &&
        `short_name '${serverTrack.short_name}' → '${track.shortTitle}'`,
      serverTrack.full_name !== track.title &&
        `full_name '${serverTrack.full_name}' → '${track.title}'`,
      serverTrack.external_id !== track.key &&
        `external_id '${serverTrack.external_id}' → '${track.key}'`,
      serverTrack.duration !== track.duration &&
        `duration '${serverTrack.duration}' → '${track.duration}'`,
    ].filter((change): change is string => !!change);
    if (changes.length) {
      trackChanges.set(track, changes);
    }
  }

  const sharedChartChanges = new Map<LocalSharedChart, string[]>();
  const sharedChartsById = new Map<number, LocalSharedChart>();
  for (const serverSharedChart of serverSharedCharts) {
    const track = tracksById.get(serverSharedChart.track);
    if (!track) {
      continue; // its track is already reported
    }
    const sharedChart = sharedCharts.get(track)?.get(serverSharedChart.index_in_track);
    if (!sharedChart) {
      errors.push(
        `Chart #${serverSharedChart.index_in_track} of track ${track.key} isn't in the file`
      );
      continue;
    }
    sharedChart.serverId = serverSharedChart.id;
    sharedChartsById.set(serverSharedChart.id, sharedChart);
    if (serverSharedChart.type !== sharedChart.type) {
      sharedChartChanges.set(sharedChart, [
        `type '${serverSharedChart.type}' → '${sharedChart.type}'`,
      ]);
    }
  }

  const chartInstanceChanges = new Map<LocalChartInstance, string[]>();
  for (const serverChartInstance of serverChartInstances) {
    const sharedChart = sharedChartsById.get(serverChartInstance.shared_chart);
    if (!sharedChart) {
      continue;
    }
    const mixName = mixNames[serverChartInstance.mix - 1];
    const chartInstance = chartInstances
      .get(sharedChart.track)
      ?.get(mixName)
      ?.get(sharedChart.index);
    if (!chartInstance) {
      warnings.push(
        `Track ${sharedChart.track.key} has no instance of chart #${sharedChart.index} @ ${mixName} in the file (chart instance #${serverChartInstance.id})`
      );
      continue;
    }
    chartInstance.serverId = serverChartInstance.id;
    if (serverChartInstance.label !== chartInstance.label) {
      chartInstanceChanges.set(chartInstance, [
        `label '${serverChartInstance.label}' → '${chartInstance.label}'`,
      ]);
    }
  }

  // What to add and update, in the order it's applied: each track, its charts, then
  // their instances mix by mix
  const operations: Operation[] = [];
  for (const track of tracks.values()) {
    const changes = trackChanges.get(track);
    if (track.serverId == null) {
      operations.push({ kind: 'addTrack', track });
    } else if (changes) {
      operations.push({ kind: 'updateTrack', track, changes });
    }

    for (const sharedChart of sharedCharts.get(track)?.values() ?? []) {
      const chartChanges = sharedChartChanges.get(sharedChart);
      if (sharedChart.serverId == null) {
        operations.push({ kind: 'addSharedChart', sharedChart });
      } else if (chartChanges) {
        operations.push({ kind: 'updateSharedChart', sharedChart, changes: chartChanges });
      }
    }

    for (const instances of chartInstances.get(track)?.values() ?? []) {
      for (const chartInstance of instances.values()) {
        const instanceChanges = chartInstanceChanges.get(chartInstance);
        if (chartInstance.serverId == null) {
          operations.push({ kind: 'addChartInstance', chartInstance });
        } else if (instanceChanges) {
          operations.push({ kind: 'updateChartInstance', chartInstance, changes: instanceChanges });
        }
      }
    }
  }

  return { errors, warnings, operations };
};

export const previewTracklistSync = async (file: TracklistFile) => {
  const { errors, warnings, operations } = await planSync(file);
  return {
    errors,
    warnings,
    changes: operations.map(describeOperation),
    tracksInFile: Object.keys(file.tracklist).length,
  };
};

export const applyTracklistSync = async (file: TracklistFile) => {
  const { errors, operations } = await planSync(file);
  if (errors.length) {
    throw error(400, `The tracklist can't be synced: ${errors[0]}`);
  }

  const report = await db.transaction().execute(async (trx) => {
    const lines: string[] = [];
    for (const op of operations) {
      lines.push(describeOperation(op));
      const extra = await applyOperation(trx, op);
      if (extra) {
        lines.push(extra);
      }
    }
    return lines;
  });
  return { report: report.length ? report : ['The tracklist is up to date'] };
};

// The DB id of a row from the file: set when matched, or when an earlier operation added it
const idOf = (row: { serverId?: number }) => {
  if (row.serverId == null) {
    throw new Error('Tracklist sync: a row was used before it was added');
  }
  return row.serverId;
};

const applyOperation = async (trx: Transaction, op: Operation): Promise<string | void> => {
  switch (op.kind) {
    case 'addTrack':
    case 'updateTrack': {
      const values = {
        external_id: op.track.key,
        full_name: op.track.title,
        short_name: op.track.shortTitle,
        duration: op.track.duration,
      };
      if (op.kind === 'addTrack') {
        const { insertId } = await trx
          .insertInto('tracks')
          .values(values)
          .executeTakeFirstOrThrow();
        op.track.serverId = Number(insertId);
      } else {
        await trx.updateTable('tracks').set(values).where('id', '=', idOf(op.track)).execute();
      }
      return;
    }
    case 'addSharedChart': {
      const { insertId } = await trx
        .insertInto('shared_charts')
        .values({
          track: idOf(op.sharedChart.track),
          index_in_track: op.sharedChart.index,
          type: op.sharedChart.type,
        })
        .executeTakeFirstOrThrow();
      op.sharedChart.serverId = Number(insertId);
      return;
    }
    case 'updateSharedChart':
      await trx
        .updateTable('shared_charts')
        .set({ type: op.sharedChart.type })
        .where('id', '=', idOf(op.sharedChart))
        .execute();
      return;
    case 'addChartInstance': {
      const { sharedChart, mixId, label, level } = op.chartInstance;
      const trackId = idOf(sharedChart.track);
      const { insertId } = await trx
        .insertInto('chart_instances')
        .values({ track: trackId, shared_chart: idOf(sharedChart), mix: mixId, label, level })
        .executeTakeFirstOrThrow();
      op.chartInstance.serverId = Number(insertId);
      return fillTrackArcadeName(trx, trackId, mixId);
    }
    case 'updateChartInstance':
      await trx
        .updateTable('chart_instances')
        .set({ label: op.chartInstance.label })
        .where('id', '=', idOf(op.chartInstance))
        .execute();
      return;
  }
};

/**
 * When a track gets its first chart on a mix, it gets an arcade name there too: the one
 * from the previous mix (tracks are rarely renamed), or else its full name. An admin can
 * fix it afterwards
 */
const fillTrackArcadeName = async (trx: Transaction, trackId: number, mixId: number) => {
  if (!ARCADE_NAME_MIXES.includes(mixId)) {
    return;
  }
  const names = await trx
    .selectFrom('arcade_track_names')
    .select(['mix_id', 'name'])
    .where('track_id', '=', trackId)
    .where('mix_id', 'in', [mixId, mixId - 1])
    .execute();
  if (names.some((name) => name.mix_id === mixId)) {
    return;
  }

  const previous = names.find((name) => name.mix_id === mixId - 1);
  const name =
    previous?.name ??
    (
      await trx
        .selectFrom('tracks')
        .select('full_name')
        .where('id', '=', trackId)
        .executeTakeFirstOrThrow()
    ).full_name;
  await trx
    .insertInto('arcade_track_names')
    .values({ mix_id: mixId, track_id: trackId, name })
    .execute();
  return `Track #${trackId}: arcade name '${name}' on mix #${mixId}`;
};
