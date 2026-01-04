import React, { useContext } from 'react';

import { en, pl, ru, ua } from 'constants/translations';

console.log('navigator.languages = ', navigator.languages.join(', '));

let translation = pl;
let language: 'en' | 'ua' | 'ru' | 'pl' = 'pl';

for (const lang of navigator.languages) {
  if (/^uk\b/.test(lang)) {
    translation = ua;
    language = 'ua';
    break;
  }
  if (/^ru\b/.test(lang)) {
    translation = ru;
    language = 'ru';
    break;
  }
  if (/^pl\b/.test(lang)) {
    translation = pl;
    language = 'pl';
    break;
  }
  if (/^en\b/.test(lang)) {
    translation = en;
    language = 'en';
    break;
  }
}

const Language = React.createContext(translation);
Language.displayName = 'Language';

export const useLanguage = () => {
  return useContext(Language);
};

export { Language, translation, language };
