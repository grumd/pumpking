// pm2 apps for the services on the production host (see "Build and release" in
// docs/python-api-migration/PLAN.md). Loaded from ~/pumpking/releases/<sha>/, each app runs
// from its service's symlink (~/pumpking/<service>), so a reload starts whichever release
// that symlink points at. Loaded from anywhere else, the apps run from this checkout
const path = require('node:path');

const releases = path.dirname(__dirname);
const root = path.basename(releases) === 'releases' ? path.dirname(releases) : undefined;

const app = (service) => ({
  name: `pumpking-${service}`,
  cwd: root
    ? path.join(root, service, 'packages', service)
    : path.join(__dirname, 'packages', service),
  script: './src/index.ts',
  // Run the TS sources directly; tsx also resolves the tsconfig path aliases
  interpreter: 'node',
  interpreter_args: '--import tsx',
});

module.exports = {
  apps: ['api', 'ingest', 'bot'].map(app),
};
