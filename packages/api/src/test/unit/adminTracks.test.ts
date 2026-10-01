import { db } from '@pumpking/database/db';
import { assert } from 'chai';
import { errorMessage, output, trpcMutation, trpcQuery } from 'test/helpers/trpc';

// The legacy mix list: a tracklist file's `mixes` are in this order, so Phoenix2 is #28
const MIX_NAMES = [
  '1st', '2nd', 'OBG', 'OBG_SE', 'Collection', 'Perfect', 'Extra', 'Premiere', 'Prex', 'Premiere2',
  'Rebirth', 'Prex2', 'Premiere3', 'Prex3', 'Exceed', 'Exceed2', 'Zero', 'NX', 'NX2', 'NXA', 'Fiesta',
  'FiestaEX', 'Fiesta2', 'Prime', 'Prime2', 'XX', 'Phoenix', 'Phoenix2',
]; // prettier-ignore

describe('Admin tracks', () => {
  it('lists tracks with arcade names, and shows a track with its charts per mix', async () => {
    await db
      .insertInto('arcade_track_names')
      .values({ mix_id: 28, track_id: 1, name: 'TRACK ONE', name_edist: 2 })
      .execute();

    const tracks = output(await trpcQuery('admin.tracks.list').expect(200));
    assert.deepEqual(tracks[0].arcadeNames, {
      26: null,
      27: null,
      28: { name: 'TRACK ONE', edist: 2 },
    });

    const track = output(await trpcQuery('admin.tracks.get', { id: 1 }).expect(200));
    const chart = track.charts.find((c: { id: number }) => c.id === 3);
    assert.equal(chart.type, 'S');
    assert.deepEqual(
      chart.instances.map((i: { id: number; mix: number }) => [i.id, i.mix]),
      [[3, 28]]
    );

    const byChart = output(
      await trpcQuery('admin.tracks.byChartInstance', { chartInstanceId: 3 }).expect(200)
    );
    assert.deepEqual(byChart, { trackId: 1 });
  });

  it('saves and removes arcade names', async () => {
    await trpcMutation('admin.tracks.saveArcadeNames', {
      id: 1,
      arcadeNames: { 26: { name: ' Track 1 ', edist: 1 }, 28: { name: 'Track 1 (P2)', edist: 0 } },
    }).expect(200);
    await trpcMutation('admin.tracks.saveArcadeNames', {
      id: 1,
      arcadeNames: { 26: { name: 'Track 1', edist: 1 }, 28: { name: '', edist: 0 } },
    }).expect(200);

    const names = await db.selectFrom('arcade_track_names').selectAll().execute();
    assert.deepEqual(names, [{ mix_id: 26, track_id: 1, name: 'Track 1', name_edist: 1 }]);
  });

  it("sets a chart's step range", async () => {
    await trpcMutation('admin.tracks.updateChartSteps', {
      chartInstanceId: 3,
      minTotalSteps: 90,
      maxTotalSteps: 110,
    }).expect(200);
    const chart = await db
      .selectFrom('chart_instances')
      .select(['min_total_steps', 'max_total_steps'])
      .where('id', '=', 3)
      .executeTakeFirstOrThrow();
    assert.deepEqual(chart, { min_total_steps: 90, max_total_steps: 110 });

    const inverted = await trpcMutation('admin.tracks.updateChartSteps', {
      chartInstanceId: 3,
      minTotalSteps: 120,
      maxTotalSteps: 110,
    });
    assert.equal(inverted.status, 400);
  });

  describe('tracklist sync', () => {
    // The seeded track 1 ('1') with its 5 charts and their instances, as in the DB
    const seededTrack = {
      title: 'Track 1',
      duration: 'Standard',
      charts: {
        1: { type: 'S' },
        2: { type: 'S' },
        3: { type: 'HD' },
        4: { type: 'S' },
        5: { type: 'COOP' },
      },
      instances: {
        XX: { 1: { label: 'S20' }, 4: { label: 'S15' } },
        Phoenix2: { 2: { label: 'S20' }, 3: { label: 'HD18' }, 5: { label: 'COOP2' } },
      },
    };
    const mixes = Object.fromEntries(MIX_NAMES.map((name) => [name, {}]));

    it('is up to date with a file that matches the DB', async () => {
      const preview = output(
        await trpcMutation('admin.tracks.previewSync', {
          file: { mixes, tracklist: { 1: seededTrack } },
        }).expect(200)
      );
      assert.deepEqual(preview, { errors: [], warnings: [], changes: [], tracksInFile: 1 });
    });

    it('previews, then applies new and changed tracks, charts and instances', async () => {
      await db
        .insertInto('arcade_track_names')
        .values({ mix_id: 27, track_id: 1, name: 'TRACK 1 ON PHOENIX' })
        .execute();
      const file = {
        mixes,
        tracklist: {
          1: {
            ...seededTrack,
            title: 'Track One',
            charts: { ...seededTrack.charts, 6: { type: 'D' } },
            instances: {
              ...seededTrack.instances,
              Phoenix2: { ...seededTrack.instances.Phoenix2, 6: { label: 'D21', levelText: '21' } },
            },
          },
          NEW: {
            title: 'New Track',
            shortTitle: 'New',
            duration: 'Short',
            charts: { 1: { type: 'S' } },
            instances: { Phoenix2: { 1: { label: 'S5', level: 5 } } },
          },
        },
      };

      const preview = output(await trpcMutation('admin.tracks.previewSync', { file }).expect(200));
      assert.deepEqual(preview.errors, []);
      assert.deepEqual(preview.changes, [
        "Update track 1 #1: short_name 'Track 1' → 'Track One', full_name 'Track 1' → 'Track One'",
        'Add chart 1 #6 (D)',
        'Add chart instance 1 D21 @ Phoenix2',
        "Add track NEW 'New Track'",
        'Add chart NEW #1 (S)',
        'Add chart instance NEW S5 @ Phoenix2',
      ]);
      assert.isUndefined(
        await db
          .selectFrom('tracks')
          .select('id')
          .where('external_id', '=', 'NEW')
          .executeTakeFirst(),
        'the preview changes nothing'
      );

      const { report } = output(await trpcMutation('admin.tracks.applySync', { file }).expect(200));
      assert.includeMembers(report, preview.changes);

      const newTrack = await db
        .selectFrom('tracks')
        .selectAll()
        .where('external_id', '=', 'NEW')
        .executeTakeFirstOrThrow();
      assert.equal(newTrack.short_name, 'New');
      const instances = await db
        .selectFrom('chart_instances')
        .select(['track', 'mix', 'label', 'level'])
        .where('label', 'in', ['D21', 'S5'])
        .orderBy('label')
        .execute();
      assert.deepEqual(instances, [
        { track: 1, mix: 28, label: 'D21', level: 21 },
        { track: newTrack.id, mix: 28, label: 'S5', level: 5 },
      ]);

      // A track's first chart on a mix gives it an arcade name there: the previous mix's
      // one, else its full name
      const names = await db
        .selectFrom('arcade_track_names')
        .select(['track_id', 'mix_id', 'name'])
        .where('mix_id', '=', 28)
        .orderBy('track_id')
        .execute();
      assert.deepEqual(names, [
        { track_id: 1, mix_id: 28, name: 'TRACK 1 ON PHOENIX' },
        { track_id: newTrack.id, mix_id: 28, name: 'New Track' },
      ]);

      const again = output(await trpcMutation('admin.tracks.previewSync', { file }).expect(200));
      assert.deepEqual(again.changes, [], 'nothing left to sync');
    });

    it("refuses a file that misses the DB's tracks or has mixes out of order", async () => {
      const preview = output(
        await trpcMutation('admin.tracks.previewSync', {
          file: { mixes: { XX: {}, ...mixes }, tracklist: {} },
        }).expect(200)
      );
      assert.includeMembers(preview.errors, [
        "Track #1 '1' isn't in the file",
        'Mix XX is mix #1 in the file, but #26 here',
      ]);

      const apply = await trpcMutation('admin.tracks.applySync', {
        file: { mixes, tracklist: {} },
      });
      assert.equal(apply.status, 400);
      assert.equal(
        errorMessage(apply),
        "The tracklist can't be synced: Track #1 '1' isn't in the file"
      );
    });
  });
});
