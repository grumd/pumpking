import { app } from '../app';
import {
  AGENT_TOKEN,
  listCases,
  readCase,
  readCatalog,
  prepareCase,
  readStored,
  seedCatalog,
  withoutReport,
} from './screenCases';
import { assert } from 'chai';
import request from 'supertest';

// Real result screens, answered and stored as the legacy Python API did (screens/README.md)
describe('Real screens', () => {
  const catalog = readCatalog();

  before(async function () {
    this.timeout(30000);
    await seedCatalog(catalog);
  });

  for (const file of listCases()) {
    const screenCase = readCase(file);

    it(`${file}: ${screenCase.about}`, async () => {
      assert.exists(screenCase.stored, 'not recorded yet: run scripts/screenCases.ts record');
      await prepareCase(catalog, screenCase);

      for (const [i, step] of screenCase.steps.entries()) {
        const res = await request(app)
          .post(step.path)
          .set('agent-name', step.agent)
          .set('agent-token', AGENT_TOKEN)
          .send(step.request)
          .expect(200);
        assert.deepEqual(withoutReport(res.body), step.answer, `the answer to step ${i + 1}`);
      }

      assert.deepEqual(await readStored(catalog), screenCase.stored, 'the stored rows');
    });
  }
});
