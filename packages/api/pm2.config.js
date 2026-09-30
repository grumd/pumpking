module.exports = {
  apps: [
    {
      name: 'pumpking-api',
      cwd: __dirname,
      script: './src/index.ts',
      // Run the TS sources directly; tsx also resolves the tsconfig path aliases
      interpreter: 'node',
      interpreter_args: '--import tsx',
    },
  ],
};
