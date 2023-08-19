export let DEBUG = localStorage && localStorage.getItem('debug');

if (localStorage) {
  window.debugOn = () => {
    localStorage.setItem('debug', 1);
    DEBUG = 1;
  };
  window.debugOff = () => {
    localStorage.removeItem('debug');
    DEBUG = 0;
  };
}
