import { createContext, useContext, useEffect, useMemo, useState } from "react";

import i18n from "@/app/i18n";
import { httpClient } from "@/shared/api/httpClient";
import { socket } from "@/shared/realtime/socketClient";
import {
  clearStoredSession,
  getStoredSession,
  persistSession,
  subscribeToAuthChanges,
  updateStoredUser,
} from "@/features/auth/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getStoredSession()?.accessToken));

  useEffect(() => subscribeToAuthChanges(setSession), []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const currentSession = getStoredSession();

      if (!currentSession?.accessToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await httpClient.get("/auth/me");

        if (cancelled) {
          return;
        }

        updateStoredUser(response.data);
      } catch {
        if (!cancelled) {
          socket.disconnect();
          clearStoredSession();
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const preferredLanguage = session?.user?.preferred_language;

    if (preferredLanguage && preferredLanguage !== i18n.resolvedLanguage) {
      i18n.changeLanguage(preferredLanguage);
      localStorage.setItem("preferredLanguage", preferredLanguage);
    }
  }, [session?.user?.preferred_language]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      tenantId: session?.tenantId ?? null,
      isAuthenticated: Boolean(session?.accessToken && session?.user),
      isBootstrapping,
      async login({ email, password, companyId }) {
        const payload = { email, password };

        if (companyId?.trim()) {
          payload.company_id = companyId.trim();
        }

        const response = await httpClient.post("/auth/login", payload);
        const nextSession = persistSession(response.data);
        setSession(nextSession);
        setIsBootstrapping(false);
        return nextSession;
      },
      async refreshProfile() {
        const response = await httpClient.get("/auth/me");
        return updateStoredUser(response.data);
      },
      logout() {
        socket.disconnect();
        clearStoredSession();
        setIsBootstrapping(false);
      },
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
