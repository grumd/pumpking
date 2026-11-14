export function isModuleWorkerSupported() {
  let supports = false;

  const tester = {
    get type(): 'classic' | 'module' {
      supports = true;
      return 'module';
    },
  };

  try {
    new Worker('data:,', tester).terminate();
  } catch (e) {
    return supports;
  }
  return supports;
}
