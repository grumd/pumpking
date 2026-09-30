const os = require('node:os');

// pm2 apps for the services on the production host. Each app runs from its service's
// symlink, ~/pumpking/<service>, so a reload starts whichever release the symlink points at
// (see deploy/deploy-service.sh)
const app = (service) => ({
  name: `pumpking-${service}`,
  cwd: `${os.homedir()}/pumpking/${service}/packages/${service}`,
  script: './src/index.ts',
  // Run the TS sources directly; tsx also resolves the tsconfig path aliases
  interpreter: 'node',
  interpreter_args: '--import tsx',
});

module.exports = {
  apps: [app('api'), app('ingest'), app('bot')],
};
