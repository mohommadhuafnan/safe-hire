import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import si from './si.json';
import ta from './ta.json';
import hi from './hi.json';
import bn from './bn.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      si: { translation: si },
      ta: { translation: ta },
      hi: { translation: hi },
      bn: { translation: bn }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'si', 'ta', 'hi', 'bn'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
