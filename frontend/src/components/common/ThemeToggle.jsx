import { MoonStar, SunMedium } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/features/theme/ThemeContext";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("common.lightMode") : t("common.darkMode");

  return (
    <Button
      aria-label={label}
      aria-pressed={isDark}
      className="shrink-0 px-3"
      onClick={toggleTheme}
      variant="outline"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      <span className="hidden whitespace-nowrap md:inline">{label}</span>
    </Button>
  );
}
