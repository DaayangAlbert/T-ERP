const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;
const API_PREFIX = "/api/v1";

const DEFAULT_ENABLED_BACKEND_MODULES = [
  "companies",
  "users",
  "projects",
  "planning",
  "attendance",
  "finance",
  "inventory",
  "procurement",
  "recruitment",
  "payroll",
  "chat",
  "calls",
];

function normalizePath(value) {
  return `/${String(value || "").replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function normalizeAbsoluteApiBaseUrl(value) {
  const url = new URL(value);
  const pathname = url.pathname.replace(/\/+$/, "");

  if (!pathname || pathname === "/") {
    return `${url.origin}${API_PREFIX}`;
  }

  if (pathname === "/api") {
    return `${url.origin}${API_PREFIX}`;
  }

  return `${url.origin}${pathname}`;
}

function normalizeRelativeApiBaseUrl(value) {
  const normalizedPath = normalizePath(value);

  if (normalizedPath === "/") {
    return API_PREFIX;
  }

  if (normalizedPath === "/api") {
    return API_PREFIX;
  }

  if (normalizedPath === API_PREFIX) {
    return normalizedPath;
  }

  return `${normalizedPath}${API_PREFIX}`;
}

export function normalizeApiBaseUrl(value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return API_PREFIX;
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedValue)) {
    return normalizeAbsoluteApiBaseUrl(trimmedValue);
  }

  return normalizeRelativeApiBaseUrl(trimmedValue);
}

function normalizeSocketUrl(value, apiBaseUrl) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    if (ABSOLUTE_URL_PATTERN.test(trimmedValue)) {
      return trimmedValue.replace(/\/+$/, "");
    }

    return normalizePath(trimmedValue);
  }

  if (ABSOLUTE_URL_PATTERN.test(apiBaseUrl)) {
    return new URL(apiBaseUrl).origin;
  }

  return typeof window !== "undefined" ? window.location.origin : undefined;
}

function parseEnabledBackendModules(value) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return new Set(DEFAULT_ENABLED_BACKEND_MODULES);
  }

  return new Set(
    trimmedValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const SOCKET_URL = normalizeSocketUrl(import.meta.env.VITE_SOCKET_URL, API_BASE_URL);

const enabledBackendModules = parseEnabledBackendModules(import.meta.env.VITE_ENABLED_BACKEND_MODULES);

export function isBackendModuleEnabled(moduleKey) {
  return enabledBackendModules.has(moduleKey);
}
