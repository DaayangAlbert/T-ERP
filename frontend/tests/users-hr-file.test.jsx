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
import { UsersPage } from "@/features/users/UsersPage.jsx";

function makeSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-users-hr",
    refresh_token: "refresh-users-hr",
    user: {
      id: 1,
      email: "admin@example.com",
      first_name: "Admin",
      last_name: "RH",
      user_type: "company_admin",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["users.read", "users.manage", "payroll.read", "payroll.manage"],
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function renderUsersPage(session) {
  persistSession(session);
  return render(
    <MemoryRouter initialEntries={["/app/users"]}>
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("UsersPage HR file", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("opens the HR file panel and saves sensitive HR and payroll data", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/users", {
      data: {
        items: [
          {
            id: 101,
            email: "nadine@example.com",
            first_name: "Nadine",
            last_name: "Mbida",
            full_name: "Nadine Mbida",
            phone: "+237600000111",
            login_identifier: "nadine.mbida",
            employee_number: "EMP-HR-101",
            user_type: "employee",
            preferred_language: "fr",
            operational_profile_code: "magasinier",
            job_title: "Magasinier",
            department: "Logistique",
            contract_type: "CDD",
            hire_date: "2026-03-10",
            hierarchy_level: 3,
            identity_document_type: "cni",
            identity_document_number: "CNI-101",
            identity_issue_date: "2024-01-20",
            identity_document_url: "https://example.com/docs/identity.pdf",
            taxpayer_number: "M0123456789A",
            cv_url: "https://example.com/docs/cv.pdf",
            account_status: "active",
            is_primary_admin: false,
            roles: [{ id: 11, code: "magasinier", name: "Magasinier" }],
          },
        ],
        count: 1,
      },
    }, {
      data: {
        items: [
          {
            id: 101,
            email: "nadine@example.com",
            first_name: "Nadine",
            last_name: "Mbida",
            full_name: "Nadine Mbida",
            phone: "+237600000111",
            login_identifier: "nadine.mbida",
            employee_number: "EMP-HR-101",
            user_type: "employee",
            preferred_language: "fr",
            operational_profile_code: "magasinier",
            job_title: "Magasinier",
            department: "Logistique",
            contract_type: "CDD",
            hire_date: "2026-03-10",
            hierarchy_level: 3,
            base_salary: 325000,
            employment_end_date: null,
            exit_reason: "Fin de mission",
            identity_document_type: "cni",
            identity_document_number: "CNI-101",
            identity_issue_date: "2024-01-20",
            identity_document_url: "https://example.com/docs/identity.pdf",
            taxpayer_number: "M0123456789A",
            cv_url: "https://example.com/docs/cv.pdf",
            account_status: "active",
            is_primary_admin: false,
            roles: [{ id: 11, code: "magasinier", name: "Magasinier" }],
          },
        ],
        count: 1,
      },
    });
    httpMock.on("GET", "/users/operational-profiles", {
      data: { items: [], interactions: [], access_matrix: [] },
    });
    httpMock.on("GET", "/users/organization-units", {
      data: { items: [], count: 0 },
    }, {
      data: { items: [], count: 0 },
    });
    httpMock.on("GET", "/users/dashboard", {
      data: {
        users: {
          total: 1,
          active: 1,
          by_department: { Logistique: 1 },
          by_contract_type: { CDD: 1 },
          by_account_status: { active: 1 },
        },
        personnel: { incomplete_profiles: 0, recent_hires_30d: 1 },
        alerts: [],
        latest_activity: [],
      },
    }, {
      data: {
        users: {
          total: 1,
          active: 1,
          by_department: { Logistique: 1 },
          by_contract_type: { CDI: 1 },
          by_account_status: { active: 1 },
        },
        personnel: { incomplete_profiles: 0, recent_hires_30d: 1 },
        alerts: [],
        latest_activity: [],
      },
    });
    httpMock.on("GET", "/payroll/employees/101/profile", {
      data: {
        company_id: 42,
        user_id: 101,
        exists: true,
        employee: {
          id: 101,
          full_name: "Nadine Mbida",
          employee_number: "EMP-HR-101",
          email: "nadine@example.com",
          job_title: "Magasinier",
          department: "Logistique",
          hire_date: "2026-03-10",
          base_salary: 250000,
        },
        profile: {
          id: 501,
          category: "4A",
          echelon: "2",
          cnps_number: "CNPS-101",
          convention_collective: "BTP",
          employment_label: "Magasinier chantier",
          hours_schedule: "07:30-17:15",
          family_status: "Celibataire",
          bank_account_number: "00112233",
          bank_domiciliation: "BICEC",
          payment_method: "bank_transfer",
          transport_allowance: 15000,
          other_fixed_gains: 5000,
          payroll_notes: "RAS",
          is_payroll_enabled: true,
        },
      },
    }, {
      data: {
        company_id: 42,
        user_id: 101,
        exists: true,
        employee: {
          id: 101,
          full_name: "Nadine Mbida",
          employee_number: "EMP-HR-101",
          email: "nadine@example.com",
          job_title: "Magasinier",
          department: "Logistique",
          hire_date: "2026-03-10",
          base_salary: 325000,
        },
        profile: {
          id: 501,
          category: "4A",
          echelon: "2",
          cnps_number: "CNPS-NEW-101",
          convention_collective: "BTP",
          employment_label: "Magasinier chantier",
          hours_schedule: "07:30-17:15",
          family_status: "Celibataire",
          bank_account_number: "00112233",
          bank_domiciliation: "BICEC",
          payment_method: "bank_transfer",
          transport_allowance: 15000,
          other_fixed_gains: 5000,
          payroll_notes: "RAS",
          is_payroll_enabled: true,
        },
      },
    });
    httpMock.on("GET", "/users/activity-logs", {
      data: {
        items: [
          {
            id: 701,
            description: "Profil paie employe enregistre",
            action: "employee_profile_updated",
            module: "payroll",
            actor_email: "admin@example.com",
            created_at: "2026-04-09T10:00:00Z",
          },
        ],
        count: 1,
      },
    }, {
      data: {
        items: [
          {
            id: 702,
            description: "User profile updated",
            action: "user_updated",
            module: "users",
            actor_email: "admin@example.com",
            created_at: "2026-04-09T10:05:00Z",
          },
        ],
        count: 1,
      },
    });
    httpMock.on("PATCH", "/users/101", {
      data: {
        message: "User updated",
        user: {
          id: 101,
          employment_end_date: "2026-12-31",
          exit_reason: "Fin de mission",
        },
      },
    });
    httpMock.on("PATCH", "/payroll/employees/101/profile", {
      data: {
        message: "Payroll employee profile saved",
        data: { user_id: 101 },
      },
    });

    renderUsersPage(session);

    expect(await screen.findByRole("heading", { name: "Personnel de l'entreprise" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dossier RH" }));

    expect(await screen.findByText("Dossier RH sensible")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Salaire de base"), { target: { value: "325000" } });
    fireEvent.change(screen.getByPlaceholderText("Motif de sortie"), { target: { value: "Fin de mission" } });
    fireEvent.change(screen.getByPlaceholderText("Numero CNPS"), { target: { value: "CNPS-NEW-101" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le dossier RH" }));

    await waitFor(() => {
      expect(screen.getByText("Dossier RH mis a jour.")).toBeInTheDocument();
    });

    expect(httpMock.lastRequest("PATCH", "/users/101")?.data).toMatchObject({
      exit_reason: "Fin de mission",
    });
    expect(httpMock.lastRequest("PATCH", "/payroll/employees/101/profile")?.data).toMatchObject({
      cnps_number: "CNPS-NEW-101",
      payment_method: "bank_transfer",
    });
  });
});
