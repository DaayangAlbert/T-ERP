import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export function ModulePage({ titleKey }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-primary">{t(titleKey)}</h2>
      <p className="text-sm text-slate-600">{t("common.underConstruction")}</p>
    </section>
  );
}

ModulePage.propTypes = {
  titleKey: PropTypes.string.isRequired,
};
