import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/features/theme/ThemeContext";
import { httpClient } from "@/shared/api/httpClient";
import { cn } from "@/shared/utils/cn";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white/92 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-50 dark:placeholder:text-slate-500";

export function RegisterPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    registrationNumber: "",
    countryCode: "",
    companyEmail: "",
    adminEmail: "",
    phone: "",
    activityDomain: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const requiredFields = [
      form.firstName,
      form.lastName,
      form.companyName,
      form.registrationNumber,
      form.countryCode,
      form.companyEmail,
      form.adminEmail,
      form.password,
      form.confirmPassword,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setError(t("register.errorRequiredFields"));
      return;
    }

    const countryCode = form.countryCode.trim().toUpperCase();

    if (countryCode.length !== 2) {
      setError(t("register.errorCountryCode"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t("register.errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const companyEmail = form.companyEmail.trim().toLowerCase();
      const adminEmail = form.adminEmail.trim().toLowerCase();
      const payload = {
        legal_name: form.companyName.trim(),
        registration_number: form.registrationNumber.trim(),
        email: companyEmail,
        country_code: countryCode,
        admin_first_name: form.firstName.trim(),
        admin_last_name: form.lastName.trim(),
        admin_email: adminEmail,
        admin_password: form.password,
      };

      const phone = form.phone.trim();
      if (phone) {
        payload.phone = phone;
      }

      const activityDomain = form.activityDomain.trim();
      if (activityDomain) {
        payload.activity_domain = activityDomain;
      }

      await httpClient.post("/companies/register", payload);

      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message ?? t("register.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center px-4",
          isDark
            ? "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.14),_transparent_30%),linear-gradient(180deg,_#020617,_#031525_56%,_#020617)]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,_#f8fbfb,_#eef5f7_58%,_#f8fafc)]"
        )}
      >
        <div
          className={cn(
            "w-full max-w-sm rounded-[30px] border p-10 text-center backdrop-blur",
            isDark
              ? "border-slate-800/90 bg-[linear-gradient(180deg,_rgba(2,6,23,0.76),_rgba(15,23,42,0.88)_56%,_rgba(15,23,42,0.96))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.85)]"
              : "border-white/70 bg-white/82 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.3)]"
          )}
        >
          <div
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              isDark ? "bg-emerald-950/50" : "bg-green-100"
            )}
          >
            <CheckCircle2 className="text-green-600" size={30} />
          </div>
          <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{t("register.successTitle")}</h2>
          <p className={cn("mt-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>{t("register.successDesc")}</p>
          <button
            className="mt-6 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            onClick={() => navigate("/")}
          >
            {t("common.backHome")}
          </button>
        </div>
      </div>
    );
  }

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

      <div className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.88fr)] lg:items-start">
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
                {t("landing.badge")}
              </p>
              <h1 className={cn("mt-4 text-4xl font-semibold leading-tight", isDark ? "text-white" : "text-slate-900")}>
                {t("register.title")}
              </h1>
              <p className={cn("mt-4 max-w-xl text-base leading-7", isDark ? "text-slate-300" : "text-slate-600")}>
                {t("register.subtitle")}
              </p>

              <div className="mt-8 space-y-4">
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
                    {t("register.panelSetupLabel")}
                  </p>
                  <p className={cn("mt-3 text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>
                    {t("register.panelSetupTitle")}
                  </p>
                  <p className={cn("mt-2 text-sm leading-6", isDark ? "text-slate-300" : "text-slate-600")}>
                    {t("register.panelSetupDescription")}
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
                    {t("common.darkMode")} / {t("common.lightMode")}
                  </p>
                  <p className={cn("mt-3 text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>
                    {t("register.panelComfortTitle")}
                  </p>
                  <p className={cn("mt-2 text-sm leading-6", isDark ? "text-slate-300" : "text-slate-600")}>
                    {t("register.panelComfortDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md lg:max-w-none lg:justify-self-end">
            <div className="mb-8 text-center lg:hidden">
              <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{t("register.title")}</h1>
              <p className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>{t("register.subtitle")}</p>
            </div>

            <div
              className={cn(
                "rounded-[30px] border p-6 backdrop-blur sm:p-8",
                isDark
                  ? "border-slate-800/90 bg-[linear-gradient(180deg,_rgba(2,6,23,0.76),_rgba(15,23,42,0.88)_56%,_rgba(15,23,42,0.96))] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.85)]"
                  : "border-white/70 bg-white/82 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.3)]"
              )}
            >
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

              <form className="space-y-4" noValidate onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="firstName">
                      {t("register.firstName")}
                    </label>
                    <input
                      autoComplete="given-name"
                      className={fieldClassName}
                      id="firstName"
                      name="firstName"
                      onChange={handleChange}
                      placeholder={t("register.firstNamePlaceholder")}
                      required
                      type="text"
                      value={form.firstName}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="lastName">
                      {t("register.lastName")}
                    </label>
                    <input
                      autoComplete="family-name"
                      className={fieldClassName}
                      id="lastName"
                      name="lastName"
                      onChange={handleChange}
                      placeholder={t("register.lastNamePlaceholder")}
                      required
                      type="text"
                      value={form.lastName}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="companyName">
                    {t("register.companyName")}
                  </label>
                  <input
                    autoComplete="organization"
                    className={fieldClassName}
                    id="companyName"
                    name="companyName"
                    onChange={handleChange}
                    placeholder={t("register.companyNamePlaceholder")}
                    required
                    type="text"
                    value={form.companyName}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="registrationNumber">
                      {t("register.registrationNumber")}
                    </label>
                    <input
                      className={fieldClassName}
                      id="registrationNumber"
                      name="registrationNumber"
                      onChange={handleChange}
                      placeholder={t("register.registrationNumberPlaceholder")}
                      required
                      type="text"
                      value={form.registrationNumber}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="countryCode">
                      {t("register.countryCode")}
                    </label>
                    <input
                      className={fieldClassName}
                      id="countryCode"
                      maxLength={2}
                      name="countryCode"
                      onChange={handleChange}
                      placeholder={t("register.countryCodePlaceholder")}
                      required
                      type="text"
                      value={form.countryCode}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="companyEmail">
                      {t("register.companyEmail")}
                    </label>
                    <input
                      autoComplete="email"
                      className={fieldClassName}
                      id="companyEmail"
                      name="companyEmail"
                      onChange={handleChange}
                      placeholder={t("register.companyEmailPlaceholder")}
                      required
                      type="email"
                      value={form.companyEmail}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="phone">
                      {t("register.phone")}
                    </label>
                    <input
                      autoComplete="tel"
                      className={fieldClassName}
                      id="phone"
                      name="phone"
                      onChange={handleChange}
                      placeholder={t("register.phonePlaceholder")}
                      type="tel"
                      value={form.phone}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="activityDomain">
                    {t("register.activityDomain")}
                  </label>
                  <input
                    className={fieldClassName}
                    id="activityDomain"
                    name="activityDomain"
                    onChange={handleChange}
                    placeholder={t("register.activityDomainPlaceholder")}
                    type="text"
                    value={form.activityDomain}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="adminEmail">
                    {t("register.adminEmail")}
                  </label>
                  <input
                    autoComplete="email"
                    className={fieldClassName}
                    id="adminEmail"
                    name="adminEmail"
                    onChange={handleChange}
                    placeholder={t("register.adminEmailPlaceholder")}
                    required
                    type="email"
                    value={form.adminEmail}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="regPassword">
                    {t("register.password")}
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="new-password"
                      className={cn(fieldClassName, "pr-10")}
                      id="regPassword"
                      name="password"
                      onChange={handleChange}
                      placeholder={t("register.passwordPlaceholder")}
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="confirmPassword">
                    {t("register.confirmPassword")}
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="new-password"
                      className={cn(fieldClassName, "pr-10")}
                      id="confirmPassword"
                      name="confirmPassword"
                      onChange={handleChange}
                      placeholder={t("register.confirmPasswordPlaceholder")}
                      required
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => setShowConfirm((value) => !value)}
                      tabIndex={-1}
                      type="button"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-60"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? t("common.loading") : t("register.submit")}
                </button>
              </form>
            </div>

            <p className={cn("mt-6 text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("register.alreadyAccount")}{" "}
              <Link className="font-semibold text-primary hover:underline" to="/login">
                {t("register.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
