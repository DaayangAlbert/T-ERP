import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Package,
  Wallet,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/features/theme/ThemeContext";
import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";
import { cn } from "@/shared/utils/cn";

const FEATURES = [
  { key: "companies", Icon: Building2, moduleKey: "companies" },
  { key: "projects", Icon: ClipboardList, moduleKey: "projects" },
  { key: "inventory", Icon: Package, moduleKey: "inventory" },
  { key: "finance", Icon: Wallet, moduleKey: "finance" },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const visibleFeatures = FEATURES.filter(({ moduleKey }) => isBackendModuleEnabled(moduleKey));
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col",
        isDark
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.12),_transparent_30%),linear-gradient(180deg,_#020617,_#020617_56%,_#031525)]"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_20%),linear-gradient(180deg,_#f8fbfb,_#edf5f7_52%,_#f8fafc)]"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-xl",
          isDark
            ? "border-slate-800 bg-slate-950/84"
            : "border-white/70 bg-white/76 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.3)]"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="shrink-0" to="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => navigate("/login")}
            >
              {t("landing.signIn")}
            </button>
            <button
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 hover:shadow-md"
              onClick={() => navigate("/register")}
            >
              {t("landing.createAccount")}
            </button>
          </div>
        </div>
      </header>

      <section
        className={cn(
          "relative overflow-hidden px-6 py-28 text-center",
          isDark
            ? "bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.16),_transparent_32%),linear-gradient(135deg,_#020617,_#0f172a_46%,_#0f766e_100%)]"
            : "bg-gradient-to-br from-primary via-primary to-secondary"
        )}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)]" />

        <div className="relative mx-auto max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white ring-1 ring-white/20">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
            {t("landing.badge")}
          </span>

          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            {t("landing.heroTitle")}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/80 md:text-xl">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-md transition-all hover:bg-slate-50"
              onClick={() => navigate("/register")}
            >
              {t("landing.ctaPrimary")}
              <ArrowRight size={18} />
            </button>
            <button
              className="rounded-xl border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
              onClick={() => navigate("/login")}
            >
              {t("landing.ctaSecondary")}
            </button>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "border-b px-6 py-6",
          isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200/70 bg-slate-50/80"
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6">
          {[
            t("landing.highlights.multiTenant"),
            t("landing.highlights.realtime"),
            t("landing.highlights.i18n"),
            t("landing.highlights.secure"),
          ].map((text) => (
            <span
              key={text}
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isDark ? "text-slate-300" : "text-slate-600"
              )}
            >
              <CheckCircle2 className="text-secondary" size={16} />
              {text}
            </span>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className={cn("text-3xl font-bold md:text-4xl", isDark ? "text-white" : "text-slate-900")}>
              {t("landing.featuresTitle")}
            </h2>
            <p className={cn("mt-3 text-lg", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("landing.featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFeatures.map(({ key, Icon }) => (
              <div
                key={key}
                className={cn(
                  "group rounded-[26px] border p-6 backdrop-blur transition-all hover:-translate-y-1",
                  isDark
                    ? "border-slate-800 bg-[linear-gradient(180deg,_rgba(2,6,23,0.78),_rgba(15,23,42,0.9)_58%,_rgba(15,23,42,0.96))] shadow-[0_24px_60px_-40px_rgba(0,0,0,0.72)] hover:border-cyan-500/30 hover:shadow-[0_32px_80px_-42px_rgba(0,0,0,0.82)]"
                    : "border-slate-200/80 bg-white/82 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] hover:border-primary/20 hover:shadow-[0_32px_80px_-42px_rgba(15,23,42,0.35)]"
                )}
              >
                <div
                  className={cn(
                    "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors group-hover:text-white",
                    isDark
                      ? "bg-cyan-500/10 text-cyan-300 group-hover:bg-cyan-500"
                      : "bg-primary/10 text-primary group-hover:bg-primary"
                  )}
                >
                  <Icon size={22} />
                </div>
                <h3 className={cn("mb-2 text-base font-semibold", isDark ? "text-white" : "text-slate-800")}>
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className={cn("text-sm leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
                  {t(`landing.features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "px-6 py-20 text-center",
          isDark ? "bg-[linear-gradient(135deg,_#0f172a,_#0f766e_55%,_#0f172a)]" : "bg-primary"
        )}
      >
        <h2 className="text-3xl font-bold text-white md:text-4xl">{t("landing.ctaTitle")}</h2>
        <p className="mt-3 text-lg text-white/75">{t("landing.ctaDesc")}</p>
        <button
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow transition-all hover:bg-slate-50"
          onClick={() => navigate("/register")}
        >
          {t("landing.ctaPrimary")}
          <ArrowRight size={18} />
        </button>
        <p className="mt-5 text-sm text-white/60">
          {t("landing.alreadyAccount")}{" "}
          <Link className="text-white underline hover:text-white/80" to="/login">
            {t("landing.signIn")}
          </Link>
        </p>
      </section>

      <footer className="bg-slate-900 px-6 py-8 text-center text-sm text-slate-400">
        <BrandLogo className="mx-auto h-14 w-auto" />
        <p className="mt-1">{t("landing.footerTagline")}</p>
        <p className="mt-4">(c) 2026 ERP</p>
      </footer>
    </div>
  );
}
