// Not deployed yet: P2 of docs/python-api-migration/PLAN.md starts this app
module.exports = {
  apps: [
    {
      name: 'pumpking-ingest',
      cwd: __dirname,
      script: './src/index.ts',
      // Run the TS sources directly, like the API
      interpreter: 'node',
      interpreter_args: '--import tsx',
    },
  ],
};
