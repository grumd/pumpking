const os = require('node:os');

const app = (service) => ({
  name: `pumpking-${service}`,
  cwd: `${os.homedir()}/pumpking/${service}/packages/${service}`,
  script: './src/index.ts',
  interpreter: 'node',
  interpreter_args: '--import tsx',
});

module.exports = {
  apps: [app('api'), app('ingest'), app('bot')],
};
