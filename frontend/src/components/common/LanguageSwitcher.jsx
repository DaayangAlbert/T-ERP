import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const onLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    i18n.changeLanguage(nextLanguage);
    localStorage.setItem("preferredLanguage", nextLanguage);
  };

  return (
    <label
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[color:var(--app-border-strong)] bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-[color:var(--app-border-strong)] dark:bg-slate-950/80 dark:text-slate-100"
      htmlFor="language-select"
    >
      <span className="hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 sm:inline">
        {t("common.language")}
      </span>
      <select
        id="language-select"
        className="app-field min-w-[5.25rem] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold shadow-none sm:min-w-[6rem] dark:border-slate-700"
        onChange={onLanguageChange}
        value={i18n.resolvedLanguage || i18n.language}
      >
        <option value="fr">{t("common.languages.fr")}</option>
        <option value="en">{t("common.languages.en")}</option>
      </select>
    </label>
  );
}
