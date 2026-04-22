import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Landmark,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Phone,
  ShieldCheck,
  ShoppingCart,
  User,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import {
  getAppNavigationSections,
  getCurrentAppEntry,
  getPreferredAppEntry,
} from "@/shared/navigation/appNavigation";
import { socket } from "@/shared/realtime/socketClient";
import { cn } from "@/shared/utils/cn";
import { getOperationalWorkspaceProfile } from "@/shared/utils/operationalRoles";

const NAV_ICON_BY_ID = {
  dashboard: LayoutGrid,
  companies: Building2,
  users: Users,
  projects: Briefcase,
  planning: LayoutGrid,
  finance: Landmark,
  inventory: Package,
  payroll: FileText,
  procurement: ShoppingCart,
  chat: MessageSquare,
  calls: Phone,
  recruitment: Briefcase,
  profile: User,
  correspondences: FileText,
  admin: ShieldCheck,
};

const PHONE_BREAKPOINT = 640;
const DESKTOP_BREAKPOINT = 1024;

function getViewportWidth() {
  if (typeof window === "undefined") {
    return DESKTOP_BREAKPOINT;
  }

  return window.innerWidth;
}

function getEntryIcon(entryId) {
  return NAV_ICON_BY_ID[entryId] || LayoutGrid;
}

function getNotificationCountForEntry(entryId, chatUnreadCount, payslipNotificationCount, totalActiveNotifications) {
  if (entryId === "chat") {
    return chatUnreadCount;
  }

  if (entryId === "payroll") {
    return payslipNotificationCount;
  }

  if (entryId === "profile") {
    return totalActiveNotifications;
  }

  return 0;
}

function SidebarContent({
  t,
  navigationSections,
  preferredEntry,
  profileTitle,
  profileFocus,
  tenantId,
  user,
  workspaceProfile,
  isCompanyAdmin,
  isDark,
  notificationSummary,
  footerContent,
  onLogout,
  onNavigate,
  onClose,
}) {
  const chatUnreadCount = notificationSummary?.chat?.enabled === false ? 0 : Number(notificationSummary?.chat?.total_unread || 0);
  const payslipNotificationCount =
    notificationSummary?.payslips?.enabled === false ? 0 : Number(notificationSummary?.payslips?.new_count || 0);
  const navItems = navigationSections.flatMap((section) => section.items || []);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[26px] border shadow-[var(--app-shadow-md)]",
        isDark ? "border-[color:var(--app-border)] bg-slate-950/92" : "border-slate-200 bg-white"
      )}
    >
      <div className="border-b border-[color:var(--app-border)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border",
                isDark ? "border-white/10 bg-white/5" : "border-violet-100 bg-violet-50"
              )}
            >
              <BrandLogo markOnly className="h-11 w-11" />
            </div>
            <div className="min-w-0">
              <p className="text-[2rem] font-extrabold tracking-tight text-violet-600">T-ERP</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email}
              </p>
            </div>
          </div>

          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              aria-label={t("common.closeMenu")}
              className="h-10 w-10 rounded-xl p-0 lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("workspace.currentEntryLabel")}</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
            {preferredEntry ? t(preferredEntry.labelKey) : t("navigation.dashboard")}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 py-3">
        <nav className="h-full space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = getEntryIcon(item.id);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition",
                    isActive
                      ? "bg-violet-100 text-violet-700"
                      : isDark
                        ? "text-slate-200 hover:bg-white/5"
                        : "text-slate-700 hover:bg-slate-100"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-violet-600" : "text-slate-500")} />
                      <span className="truncate text-[1.05rem] font-semibold">{t(item.labelKey)}</span>
                    </div>

                    {item.id === "chat" && chatUnreadCount > 0 ? (
                      <Badge variant="warning">{chatUnreadCount}</Badge>
                    ) : item.id === "payroll" && payslipNotificationCount > 0 ? (
                      <Badge variant="success">{payslipNotificationCount}</Badge>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[color:var(--app-border)] px-3 py-3">
        {footerContent ? (
          <div className="grid gap-2">{footerContent}</div>
        ) : (
          <Button variant="ghost" className="justify-start text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { accessToken, logout, tenantId, user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => getViewportWidth());
  const mobileNavPanelRef = useRef(null);
  const mobileNavTriggerRef = useRef(null);
  const { data: notificationSummary, refetch: refetchNotifications } = useApiQuery("/users/me/notifications", {
    enabled: Boolean(user),
    ignoreStatuses: [404],
  });

  const workspaceProfile = getOperationalWorkspaceProfile(user);
  const navigationSections = getAppNavigationSections(user);
  const navigationItems = navigationSections.flatMap((section) => section.items || []);
  const profileTitle = user?.job_title || t(workspaceProfile.titleKey);
  const profileFocus = (workspaceProfile.focusKeys || []).map((key) => t(key));
  const currentEntry =
    location.pathname === "/app/profile"
      ? {
          id: "profile",
          labelKey: "navigation.profile",
          descriptionKey: "navigationHints.profile",
          badgeKey: null,
          badgeVariant: "neutral",
        }
      : getCurrentAppEntry(user, location.pathname);
  const preferredEntry = getPreferredAppEntry(user);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email;
  const isCompanyAdmin = workspaceProfile.code === "company_admin";
  const isDark = theme === "dark";
  const isPhoneViewport = viewportWidth < PHONE_BREAKPOINT;
  const isDesktopViewport = viewportWidth >= DESKTOP_BREAKPOINT;
  const isTabletViewport = !isPhoneViewport && !isDesktopViewport;
  const activeChatNotifications =
    notificationSummary?.chat?.enabled === false ? 0 : Number(notificationSummary?.chat?.total_unread || 0);
  const activePayslipNotifications =
    notificationSummary?.payslips?.enabled === false ? 0 : Number(notificationSummary?.payslips?.new_count || 0);
  const totalActiveNotifications = Number(notificationSummary?.total_active || 0);
  const currentEntryTitle = t(currentEntry.labelKey);
  const currentEntryDescription = currentEntry.descriptionKey ? t(currentEntry.descriptionKey) : null;
  const CurrentEntryIcon = getEntryIcon(currentEntry.id);

  const showBrowserNotification = (title, body, tag) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }
    if (document.visibilityState === "visible") {
      return;
    }
    if (Notification.permission !== "granted") {
      return;
    }
    new Notification(title, { body, tag });
  };

  const mobilePrimaryEntries = (() => {
    const entries = [];
    const seen = new Set();
    const dashboardEntry = navigationItems.find((item) => item.id === "dashboard") || {
      id: "dashboard",
      to: "/app",
      end: true,
      labelKey: "navigation.dashboard",
    };
    const currentVisibleEntry =
      currentEntry.id === "profile" ? null : navigationItems.find((item) => item.id === currentEntry.id) || currentEntry;

    const pushEntry = (entry) => {
      if (!entry || entry.id === "profile" || seen.has(entry.id)) {
        return;
      }

      seen.add(entry.id);
      entries.push(entry);
    };

    pushEntry(dashboardEntry);
    if (preferredEntry?.id !== "dashboard") {
      pushEntry(preferredEntry);
    }
    if (currentVisibleEntry?.id !== "dashboard") {
      pushEntry(currentVisibleEntry);
    }
    navigationItems.forEach((item) => {
      if (item.id !== "dashboard") {
        pushEntry(item);
      }
    });

    return entries.slice(0, 3);
  })();

  const openMobileNav = (event) => {
    mobileNavTriggerRef.current = event?.currentTarget || null;
    setIsMobileNavOpen(true);
  };

  const closeMobileNav = ({ restoreFocus = true } = {}) => {
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;
      if (mobileNavPanelRef.current?.contains(activeElement) && typeof activeElement?.blur === "function") {
        activeElement.blur();
      }
    }

    setIsMobileNavOpen(false);

    if (restoreFocus && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (typeof mobileNavTriggerRef.current?.focus === "function") {
          mobileNavTriggerRef.current.focus();
        }
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncViewport = () => {
      setViewportWidth(window.innerWidth);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    document.title = `${currentEntryTitle} | ${profileTitle} | T-ERP`;
  }, [currentEntryTitle, profileTitle]);

  useEffect(() => {
    closeMobileNav({ restoreFocus: false });
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const handleRefreshEvent = () => {
      refetchNotifications();
    };
    const intervalId = window.setInterval(() => {
      refetchNotifications();
    }, 45000);
    window.addEventListener("terp-notifications-refresh", handleRefreshEvent);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("terp-notifications-refresh", handleRefreshEvent);
    };
  }, [refetchNotifications, user]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    socket.auth = { token: accessToken };
    if (typeof socket.connect === "function" && !socket.connected) {
      socket.connect();
    }

    if (typeof socket.on !== "function" || typeof socket.off !== "function") {
      return undefined;
    }

    const handleNotificationUpdate = () => {
      refetchNotifications();
    };
    const handleChatNotification = (payload) => {
      handleNotificationUpdate();
      if (notificationSummary?.chat?.enabled !== false) {
        showBrowserNotification("Nouveau message T-ERP", "Vous avez recu un nouveau message interne.", `chat-${payload?.conversation_id || "message"}`);
      }
    };
    const handleIncomingCall = (payload) => {
      handleNotificationUpdate();
      showBrowserNotification(
        "Appel entrant T-ERP",
        "Un collaborateur tente de vous joindre.",
        `call-${payload?.id || payload?.call_session_id || "incoming"}`
      );
    };

    socket.on("chat:notification", handleChatNotification);
    socket.on("chat:read", handleNotificationUpdate);
    socket.on("call:incoming", handleIncomingCall);

    return () => {
      socket.off("chat:notification", handleChatNotification);
      socket.off("chat:read", handleNotificationUpdate);
      socket.off("call:incoming", handleIncomingCall);
    };
  }, [accessToken, notificationSummary?.chat?.enabled, refetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }
    if (Notification.permission === "default" && user) {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header
        className={cn(
          "shrink-0 z-40 border-b backdrop-blur-xl",
          isDark ? "border-[color:var(--app-border)] bg-slate-950/72" : "border-[color:var(--app-border)] bg-white/78"
        )}
      >
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to={preferredEntry?.to || "/app"} className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-blue-100 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/5">
                <BrandLogo markOnly className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BrandLogo className="hidden h-8 w-auto sm:block" />
                  {isCompanyAdmin ? (
                    <Badge variant="info">
                      <ShieldCheck className="mr-1.5 h-3 w-3" />
                      {t("workspaceProfiles.company_admin.title")}
                    </Badge>
                  ) : null}
                </div>
                <p className="hidden truncate text-sm text-slate-500 lg:block">{t("app.subtitle")}</p>
              </div>
            </Link>

            {!isPhoneViewport ? (
              <div className="hidden min-w-0 xl:block">
                <p className="app-eyebrow">{t("workspace.currentEntryLabel")}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{currentEntryTitle}</p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isDesktopViewport ? <LanguageSwitcher /> : null}
            <ThemeToggle />

            {!isPhoneViewport ? (
              <Link
                to="/app/profile"
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--app-border-strong)] bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/25 hover:bg-white dark:border-[color:var(--app-border-strong)] dark:bg-slate-950/80 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">{displayName}</span>
                {totalActiveNotifications > 0 ? <Badge variant="warning">{totalActiveNotifications}</Badge> : null}
              </Link>
            ) : null}

            {isDesktopViewport ? (
              <Button variant="ghost" className="px-3" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden xl:inline">{t("common.logout")}</span>
              </Button>
            ) : null}

            {!isDesktopViewport ? (
              <Button
                ref={mobileNavTriggerRef}
                type="button"
                variant="outline"
                aria-label={t("common.openMenu")}
                className="h-11 w-11 rounded-xl p-0"
                onClick={openMobileNav}
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1560px] flex-1 gap-5 overflow-hidden px-4 sm:px-6">
        <div className="hidden shrink-0 py-5 lg:block lg:w-[292px]">
          <aside className="h-full">
            <SidebarContent
              t={t}
              navigationSections={navigationSections}
              preferredEntry={preferredEntry}
              profileTitle={profileTitle}
              profileFocus={profileFocus}
              tenantId={tenantId}
              user={user}
              workspaceProfile={workspaceProfile}
              isCompanyAdmin={isCompanyAdmin}
              isDark={isDark}
              notificationSummary={notificationSummary}
              onLogout={logout}
            />
          </aside>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto py-5 pb-24">
          <div className="mb-5 rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-5 shadow-[var(--app-shadow-md)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200">
                  <CurrentEntryIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="app-eyebrow">{t("workspace.currentEntryLabel")}</p>
                  <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{currentEntryTitle}</h1>
                  {currentEntryDescription ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{currentEntryDescription}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{profileTitle}</Badge>
                {!isPhoneViewport ? <Badge variant="neutral">{displayName}</Badge> : null}
                {tenantId ? <Badge variant="neutral">{t("auth.companyId")}: {tenantId}</Badge> : null}
                {activeChatNotifications > 0 ? <Badge variant="warning">Chat {activeChatNotifications}</Badge> : null}
                {activePayslipNotifications > 0 ? <Badge variant="success">Paie {activePayslipNotifications}</Badge> : null}
                {!isDesktopViewport ? (
                  <Link to="/app/profile">
                    <Badge variant="info">
                      <Bell className="mr-1.5 h-3 w-3" />
                      {totalActiveNotifications || t("navigation.profile")}
                    </Badge>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-4 shadow-[var(--app-shadow-md)] backdrop-blur-xl sm:p-5 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <div
        aria-hidden={!isMobileNavOpen}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/45 transition lg:hidden",
          isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => closeMobileNav()}
      />

      <aside
        aria-hidden={!isMobileNavOpen}
        inert={!isMobileNavOpen}
        ref={mobileNavPanelRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(24rem,calc(100vw-1rem))] p-2 transition-transform lg:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full overflow-y-auto">
          <SidebarContent
            t={t}
            navigationSections={navigationSections}
            preferredEntry={preferredEntry}
            profileTitle={profileTitle}
            profileFocus={profileFocus}
            tenantId={tenantId}
            user={user}
            workspaceProfile={workspaceProfile}
            isCompanyAdmin={isCompanyAdmin}
            isDark={isDark}
            notificationSummary={notificationSummary}
            onLogout={logout}
            onNavigate={() => closeMobileNav({ restoreFocus: false })}
            onClose={() => closeMobileNav()}
            footerContent={
              <>
                <ThemeToggle />
                <Button variant="ghost" className="justify-start text-red-500 hover:bg-red-50 hover:text-red-600" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  {t("common.logout")}
                </Button>
              </>
            }
          />
        </div>
      </aside>

      {isPhoneViewport ? (
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-18px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl",
            isDark ? "border-[color:var(--app-border)] bg-slate-950/88" : "border-[color:var(--app-border)] bg-white/88"
          )}
        >
          <div className="mx-auto grid max-w-[1560px] grid-cols-5 gap-2">
            {mobilePrimaryEntries.map((item) => {
              const Icon = getEntryIcon(item.id);
              const badgeCount = getNotificationCountForEntry(
                item.id,
                activeChatNotifications,
                activePayslipNotifications,
                totalActiveNotifications
              );

              return (
                <NavLink
                  key={`mobile-${item.id}`}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "relative inline-flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[20px] border transition",
                      isActive
                        ? "border-primary/20 bg-primary/[0.08] text-primary dark:text-blue-200"
                        : isDark
                          ? "border-white/10 bg-white/[0.03] text-slate-300"
                          : "border-slate-200 bg-white/72 text-slate-600"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("h-5 w-5", isActive ? "scale-105" : "")} />
                      <span className="max-w-[4.5rem] truncate text-[11px] font-semibold">{t(item.labelKey)}</span>
                      {badgeCount > 0 ? (
                        <span
                          className={cn(
                            "absolute right-2 top-2 inline-flex min-w-[1.2rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-5",
                            isActive ? "bg-primary text-white" : "bg-rose-500 text-white"
                          )}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}

            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                cn(
                  "relative inline-flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[20px] border transition",
                  isActive
                    ? "border-primary/20 bg-primary/[0.08] text-primary dark:text-blue-200"
                    : isDark
                      ? "border-white/10 bg-white/[0.03] text-slate-300"
                      : "border-slate-200 bg-white/72 text-slate-600"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <User className={cn("h-5 w-5", isActive ? "scale-105" : "")} />
                  <span className="text-[11px] font-semibold">{t("navigation.profile")}</span>
                  {totalActiveNotifications > 0 ? (
                    <span
                      className={cn(
                        "absolute right-2 top-2 inline-flex min-w-[1.2rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-5",
                        isActive ? "bg-primary text-white" : "bg-rose-500 text-white"
                      )}
                    >
                      {totalActiveNotifications > 99 ? "99+" : totalActiveNotifications}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>

            <Button
              type="button"
              variant="outline"
              aria-label={t("common.openMenu")}
              className="min-h-[4.25rem] rounded-[20px] p-0"
              onClick={openMobileNav}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
