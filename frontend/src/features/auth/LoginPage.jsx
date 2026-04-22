import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { resolvePostLoginRoute } from "@/shared/navigation/appNavigation";
import { cn } from "@/shared/utils/cn";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white/92 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-50 dark:placeholder:text-slate-500";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [form, setForm] = useState({ email: "", password: "", companyId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const resolveLoginErrorMessage = (error) => {
    const apiCode = error?.response?.data?.code;
    if (apiCode) {
      const translationKey = `login.errors.${apiCode}`;
      const translated = t(translationKey);
      if (translated !== translationKey) {
        return translated;
      }
    }

    return error?.response?.data?.message ?? t("login.errorGeneric");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.email.trim() || !form.password) {
      setError(t("login.errorRequiredFields"));
      return;
    }

    setLoading(true);

    try {
      const session = await login({
        email: form.email.trim(),
        password: form.password,
        companyId: form.companyId,
      });
      const redirectTarget = resolvePostLoginRoute(session?.user, location.state?.from);

      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(resolveLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col",
        isDark
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.14),_transparent_30%),linear-gradient(180deg,_#020617,_#031525_56%,_#020617)]"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,_#f8fbfb,_#eef5f7_58%,_#f8fafc)]"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className={cn(
            "transition-colors",
            isDark ? "text-slate-100 hover:text-white" : "text-slate-700 hover:text-slate-900"
          )}
        >
          <BrandLogo className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.8fr)] lg:items-center">
          <div className="hidden lg:block">
            <div
              className={cn(
                "rounded-[32px] border p-8 backdrop-blur",
                isDark
                  ? "border-slate-800/90 bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.14),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.8),_rgba(15,23,42,0.9)_58%,_rgba(15,23,42,0.96))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.82)]"
                  : "border-white/70 bg-white/76 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.28)]"
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.2em]",
                  isDark ? "text-cyan-300" : "text-sky-700"
                )}
              >
                {t("workspace.currentEntryLabel")}
              </p>
              <h1 className={cn("mt-4 text-4xl font-semibold leading-tight", isDark ? "text-white" : "text-slate-900")}>
                {t("login.title")}
              </h1>
              <p className={cn("mt-4 max-w-xl text-base leading-7", isDark ? "text-slate-300" : "text-slate-600")}>
                {t("app.subtitle")}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-[24px] border p-5",
                    isDark ? "border-slate-800 bg-slate-950/55" : "border-slate-200/80 bg-slate-50/85"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.16em]",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {t("workspace.activeProfile")}
                  </p>
                  <p className={cn("mt-3 text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>T-ERP</p>
                  <p className={cn("mt-2 text-sm leading-6", isDark ? "text-slate-300" : "text-slate-600")}>
                    {t("login.panelWorkspaceDescription")}
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-[24px] border p-5",
                    isDark ? "border-slate-800 bg-slate-950/55" : "border-slate-200/80 bg-slate-50/85"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.16em]",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {t("dashboard.quickEntriesTitle")}
                  </p>
                  <p className={cn("mt-3 text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>
                    {t("login.panelComfortTitle")}
                  </p>
                  <p className={cn("mt-2 text-sm leading-6", isDark ? "text-slate-300" : "text-slate-600")}>
                    {t("login.panelComfortDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm lg:max-w-none lg:justify-self-end">
            <div className="mb-8 text-center lg:hidden">
              <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{t("login.title")}</h1>
              <p className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>{t("app.subtitle")}</p>
            </div>

            <div
              className={cn(
                "rounded-[30px] border p-6 backdrop-blur sm:p-8",
                isDark
                  ? "border-slate-800/90 bg-[linear-gradient(180deg,_rgba(2,6,23,0.76),_rgba(15,23,42,0.88)_56%,_rgba(15,23,42,0.96))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.85)]"
                  : "border-white/70 bg-white/82 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.3)]"
              )}
            >
              {location.state?.noticeKey && !error && (
                <div
                  className={cn(
                    "mb-5 rounded-lg border px-4 py-3 text-sm",
                    isDark
                      ? "border-amber-500/20 bg-amber-950/35 text-amber-200"
                      : "border-amber-200/80 bg-amber-50 text-amber-700"
                  )}
                >
                  {t(location.state.noticeKey)}
                </div>
              )}

              {error && (
                <div
                  className={cn(
                    "mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
                    isDark ? "border-rose-500/20 bg-rose-950/35 text-rose-200" : "border-red-200/80 bg-red-50 text-red-600"
                  )}
                >
                  <AlertCircle className="mt-0.5 shrink-0" size={16} />
                  {error}
                </div>
              )}

              <form className="space-y-5" noValidate onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="email">
                    {t("login.email")}
                  </label>
                  <input
                    autoComplete="email"
                    className={fieldClassName}
                    id="email"
                    name="email"
                    onChange={handleChange}
                    placeholder={t("login.emailPlaceholder")}
                    required
                    type="email"
                    value={form.email}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
                    {t("login.password")}
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="current-password"
                      className={cn(fieldClassName, "pr-10")}
                      id="password"
                      name="password"
                      onChange={handleChange}
                      placeholder={t("login.passwordPlaceholder")}
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => setShowPassword((value) => !value)}
                      tabIndex={-1}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="companyId">
                    {t("login.companyIdOptional")}
                  </label>
                  <input
                    className={fieldClassName}
                    id="companyId"
                    name="companyId"
                    onChange={handleChange}
                    placeholder={t("auth.tenantPlaceholder")}
                    type="text"
                    value={form.companyId}
                  />
                </div>

                <button
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-60"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? t("common.loading") : t("login.submit")}
                </button>
              </form>
            </div>

            <p className={cn("mt-6 text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("login.noAccount")}{" "}
              <Link className="font-semibold text-primary hover:underline" to="/register">
                {t("login.createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
