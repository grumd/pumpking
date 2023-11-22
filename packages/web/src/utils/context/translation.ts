import React, { useContext } from 'react';

import { en, ru, ua } from 'constants/translations';

console.log('navigator.languages = ', navigator.languages.join(', '));

let browserLanguage = en;

for (const lang of navigator.languages) {
  if (/^uk\b/.test(lang)) {
    browserLanguage = ua;
    break;
  }
  if (/^ru\b/.test(lang)) {
    browserLanguage = ru;
    break;
  }
  if (/^en\b/.test(lang)) {
    browserLanguage = en;
    break;
  }
}

const Language = React.createContext(en);
Language.displayName = 'Language';

export const useLanguage = () => {
  return useContext(Language);
};

export { Language, browserLanguage };
