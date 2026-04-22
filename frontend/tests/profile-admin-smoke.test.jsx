import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { httpMock, httpClientMock, socketMock } = vi.hoisted(() => {
  const routes = new Map();
  const requests = [];

  const clone = (value) => {
    if (value === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value));
  };

  const keyFor = (method, url) => `${String(method || "GET").toUpperCase()} ${url}`;

  const buildError = (response, config) => {
    const error = new Error(response?.data?.message || "Mock request failed");
    error.response = {
      status: response?.status ?? 400,
      data: response?.data ?? { message: "Mock request failed" },
    };
    error.config = config;
    return error;
  };

  const normalizeReply = (reply) => {
    if (typeof reply === "function") {
      return reply;
    }
    if (reply && typeof reply === "object" && ("data" in reply || "status" in reply || "error" in reply)) {
      return () => reply;
    }
    return () => ({ data: reply, status: 200 });
  };

  const dispatch = async (method, url, config = {}) => {
    const routeKey = keyFor(method, url);
    const queue = routes.get(routeKey);

    requests.push({
      method: String(method || "GET").toUpperCase(),
      url,
      data: clone(config.data),
      params: clone(config.params),
    });

    if (!queue?.length) {
      throw new Error(`No mock route registered for ${routeKey}`);
    }

    const handler = queue.length > 1 ? queue.shift() : queue[0];
    const result = await handler({
      method: String(method || "GET").toUpperCase(),
      url,
      data: clone(config.data),
      params: clone(config.params),
    });

    if (result?.error) {
      throw buildError(result, config);
    }

    return {
      status: result?.status ?? 200,
      data: result?.data ?? result,
    };
  };

  return {
    socketMock: {
      disconnect: vi.fn(),
    },
    httpMock: {
      reset() {
        routes.clear();
        requests.length = 0;
      },
      on(method, url, ...replies) {
        routes.set(
          keyFor(method, url),
          replies.map((reply) => normalizeReply(reply))
        );
      },
      lastRequest(method, url) {
        const routeKey = keyFor(method, url);
        return [...requests].reverse().find((entry) => keyFor(entry.method, entry.url) === routeKey) ?? null;
      },
    },
    httpClientMock: {
      get(url, config = {}) {
        return dispatch("GET", url, config);
      },
      post(url, data, config = {}) {
        return dispatch("POST", url, { ...config, data });
      },
      patch(url, data, config = {}) {
        return dispatch("PATCH", url, { ...config, data });
      },
      request(config = {}) {
        return dispatch(config.method || "GET", config.url, config);
      },
    },
  };
});

vi.mock("@/shared/api/httpClient", () => ({
  httpClient: httpClientMock,
}));

vi.mock("@/shared/realtime/socketClient", () => ({
  socket: socketMock,
}));

import { AuthProvider } from "@/features/auth/AuthContext";
import { persistSession } from "@/features/auth/authStorage";
import { ProfilePage } from "@/features/profile/ProfilePage";

function makeProfilePayload() {
  return {
    company_id: 42,
    user: {
      id: 11,
      company_id: 42,
      email: "admin@btp.example.com",
      first_name: "Alice",
      last_name: "Ngono",
      phone: "+237690000111",
      gender: "female",
      birth_date: null,
      address_line: "Douala",
      preferred_language: "fr",
      profile_photo_url: null,
      identity_document_type: "cni",
      identity_document_number: "CNI-999",
      identity_issue_date: null,
      identity_document_url: null,
      taxpayer_number: null,
      cv_url: null,
      chat_notifications_enabled: true,
      payslip_notifications_enabled: true,
      user_type: "company_admin",
      operational_profile_code: "company_admin",
    },
    payroll_profile: {
      cnps_number: null,
      bank_account_number: null,
      bank_name: null,
      payment_method: "bank_transfer",
    },
    uploads: {
      profile_photo: { available: false, filename: null, download_url: null },
      identity_document: { available: false, filename: null, download_url: null },
      cv: { available: false, filename: null, download_url: null },
    },
    notifications: {
      chat: { enabled: true, total_unread: 0, items: [] },
      payslips: { enabled: true, new_count: 0, items: [], last_seen_at: null },
      total_active: 0,
      items: [],
    },
  };
}

function makeSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-admin-profile",
    refresh_token: "refresh-admin-profile",
    user: {
      id: 11,
      email: "admin@btp.example.com",
      first_name: "Alice",
      last_name: "Ngono",
      user_type: "company_admin",
      company_id: 42,
      preferred_language: "fr",
      operational_profile_code: "company_admin",
      is_primary_admin: true,
      permissions: ["users.read", "users.manage", "companies.read"],
      company_context: {
        id: 42,
        legal_name: "Batimax SARL",
        onboarding_status: "approved",
        account_status: "active",
        subscription_status: "active",
        setup_status: "in_progress",
      },
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function renderProfile(session) {
  persistSession(session);
  return render(
    <MemoryRouter initialEntries={["/app/profile"]}>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProfilePage admin mode", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders the dedicated company_admin profile blocks", async () => {
    const session = makeSession();
    const profilePayload = makeProfilePayload();

    httpMock.on("GET", "/auth/me", { data: session.user });
    httpMock.on("GET", "/users/me/profile", { data: profilePayload });
    httpMock.on("GET", "/users/dashboard", {
      data: {
        personnel: { incomplete_profiles: 3 },
        alerts: [{ type: "incomplete_profiles" }, { type: "pending_leave_requests" }],
      },
    });

    renderProfile(session);

    expect(await screen.findByText("Profil utilisateur admin")).toBeInTheDocument();
    expect(screen.getByText("Profil personnel admin")).toBeInTheDocument();
    expect(screen.getByText("Informations de pilotage admin")).toBeInTheDocument();
    expect(screen.getByText("Preferences de notification")).toBeInTheDocument();
    expect(screen.getAllByText("Profil entreprise").length).toBeGreaterThan(0);
  });

  it("saves admin profile and excludes forbidden payroll fields from payload", async () => {
    const session = makeSession();
    const profilePayload = makeProfilePayload();

    httpMock.on("GET", "/auth/me", { data: session.user }, { data: session.user });
    httpMock.on("GET", "/users/me/profile", { data: profilePayload }, { data: profilePayload });
    httpMock.on("GET", "/users/dashboard", { data: { personnel: { incomplete_profiles: 1 }, alerts: [] } });
    httpMock.on("PATCH", "/users/me/profile", {
      data: {
        message: "Profile updated",
        data: profilePayload,
      },
    });

    renderProfile(session);

    const saveButton = await screen.findByRole("button", { name: "Enregistrer les modifications" });
    fireEvent.click(saveButton);

    await screen.findByText("Profil mis a jour avec succes.");

    const patchRequest = httpMock.lastRequest("PATCH", "/users/me/profile");
    expect(patchRequest).not.toBeNull();
    expect(patchRequest.data.cnps_number).toBeUndefined();
    expect(patchRequest.data.bank_account_number).toBeUndefined();
    expect(patchRequest.data.bank_name).toBeUndefined();
    expect(patchRequest.data.payment_method).toBeUndefined();
  });

  it("uploads an admin identity document", async () => {
    const session = makeSession();
    const profilePayload = makeProfilePayload();

    httpMock.on("GET", "/auth/me", { data: session.user }, { data: session.user });
    httpMock.on("GET", "/users/me/profile", { data: profilePayload });
    httpMock.on("GET", "/users/dashboard", { data: { personnel: { incomplete_profiles: 0 }, alerts: [] } });
    httpMock.on("POST", "/users/me/profile/uploads/identity_document", {
      status: 201,
      data: {
        message: "Profile asset uploaded",
        data: {
          ...profilePayload,
          uploads: {
            ...profilePayload.uploads,
            identity_document: {
              available: true,
              filename: "piece-admin.pdf",
              download_url: "/api/v1/users/me/profile/assets/identity_document",
            },
          },
        },
      },
    });

    renderProfile(session);

    await screen.findByText("Profil personnel admin");
    const uploadInput = document.querySelector('input[type="file"][accept=".pdf,image/*"]');
    expect(uploadInput).not.toBeNull();

    const file = new File(["%PDF-1.4 admin"], "piece-admin.pdf", { type: "application/pdf" });
    fireEvent.change(uploadInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(httpMock.lastRequest("POST", "/users/me/profile/uploads/identity_document")).not.toBeNull();
    });
    expect(await screen.findByText("Fichier televerse avec succes.")).toBeInTheDocument();
  });

  it("surfaces API error when admin profile save fails", async () => {
    const session = makeSession();
    const profilePayload = makeProfilePayload();

    httpMock.on("GET", "/auth/me", { data: session.user });
    httpMock.on("GET", "/users/me/profile", { data: profilePayload });
    httpMock.on("GET", "/users/dashboard", { data: { personnel: { incomplete_profiles: 0 }, alerts: [] } });
    httpMock.on("PATCH", "/users/me/profile", {
      status: 400,
      error: true,
      data: { message: "These fields are not editable for company_admin" },
    });

    renderProfile(session);

    const saveButton = await screen.findByRole("button", { name: "Enregistrer les modifications" });
    fireEvent.click(saveButton);

    expect(await screen.findByText("These fields are not editable for company_admin")).toBeInTheDocument();
  });
});
