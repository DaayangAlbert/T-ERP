import axios from "axios";

import {
  clearStoredSession,
  getStoredSession,
  updateStoredAccessToken,
} from "@/features/auth/authStorage";
import { API_BASE_URL } from "@/shared/config/runtimeConfig";

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let refreshPromise = null;

httpClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  const token = session?.accessToken;
  const tenantId = session?.tenantId;
  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const requestUrl = config.url || "";

    if (!status && !config.__retryOnce) {
      config.__retryOnce = true;
      return httpClient.request(config);
    }

    if (
      status === 401 &&
      !config.__isRetryRequest &&
      !requestUrl.endsWith("/auth/login") &&
      !requestUrl.endsWith("/auth/refresh")
    ) {
      const session = getStoredSession();

      if (!session?.refreshToken) {
        clearStoredSession();
        return Promise.reject(error);
      }

      try {
        refreshPromise ??= refreshClient
          .post(
            "/auth/refresh",
            {},
            {
              headers: {
                Authorization: `Bearer ${session.refreshToken}`,
                ...(session.tenantId ? { "X-Tenant-ID": session.tenantId } : {}),
              },
            }
          )
          .then((response) => {
            const nextSession = updateStoredAccessToken(response.data.access_token);
            return nextSession?.accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });

        const nextAccessToken = await refreshPromise;

        if (!nextAccessToken) {
          clearStoredSession();
          return Promise.reject(error);
        }

        config.__isRetryRequest = true;
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${nextAccessToken}`,
        };

        return httpClient.request(config);
      } catch (refreshError) {
        clearStoredSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
