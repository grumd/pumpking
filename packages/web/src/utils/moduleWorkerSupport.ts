export function isModuleWorkerSupported() {
  let supports = false;

  const tester = {
    get type(): 'classic' | 'module' {
      supports = true;
      return 'module';
    },
  };

  try {
    // We use "data:," as url to avoid an useless network request.
    // This will either throw in Chrome
    // either fire an error event in Firefox
    // which is perfect since
    // we don't need the worker to actually start,
    // checking for the type of the script is done before trying to load it.
    new Worker('data:,', tester).terminate();
  } catch (e) {
    return supports;
  }
  return supports;
}
