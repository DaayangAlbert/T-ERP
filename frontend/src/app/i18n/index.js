import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

const supportedLanguages = ["fr", "en"];
const browserLanguage = (navigator.language || "fr").split("-")[0].toLowerCase();
const storedLanguage = localStorage.getItem("preferredLanguage");
const preferredLanguage = supportedLanguages.includes(storedLanguage)
  ? storedLanguage
  : supportedLanguages.includes(browserLanguage)
    ? browserLanguage
    : "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  supportedLngs: supportedLanguages,
  lng: preferredLanguage,
  fallbackLng: "fr",
  nonExplicitSupportedLngs: true,
  returnNull: false,
  react: {
    useSuspense: false,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
