import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { httpMock, httpClientMock, socketMock } = vi.hoisted(() => {
  const routes = new Map();

  const keyFor = (method, url) => `${String(method || "GET").toUpperCase()} ${url}`;

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

    if (!queue?.length) {
      throw new Error(`No mock route registered for ${routeKey}`);
    }

    const handler = queue.length > 1 ? queue.shift() : queue[0];
    const result = await handler({
      method: String(method || "GET").toUpperCase(),
      url,
      data: config.data,
      params: config.params,
    });

    if (result?.error) {
      const error = new Error(result?.data?.message || "Mock request failed");
      error.response = {
        status: result?.status ?? 400,
        data: result?.data ?? { message: "Mock request failed" },
      };
      throw error;
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
      },
      on(method, url, ...replies) {
        routes.set(
          keyFor(method, url),
          replies.map((reply) => normalizeReply(reply))
        );
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

function makeSession() {
  return {
    access_token: "access-users-dashboard",
    refresh_token: "refresh-users-dashboard",
    user: {
      id: 1,
      email: "admin@example.com",
      first_name: "Admin",
      last_name: "RH",
      user_type: "company_admin",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["users.read", "users.manage"],
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
    },
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

describe("UsersPage HR dashboard", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("renders attendance insights and HR approval alerts", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/users", {
      data: {
        items: [],
        count: 0,
      },
    });
    httpMock.on("GET", "/users/operational-profiles", {
      data: { items: [], interactions: [], access_matrix: [] },
    });
    httpMock.on("GET", "/users/organization-units", {
      data: { items: [], count: 0 },
    });
    httpMock.on("GET", "/users/dashboard", {
      data: {
        users: {
          total: 4,
          active: 3,
          by_department: { "Direction technique": 2, Logistique: 1 },
          by_contract_type: { CDI: 2, CDD: 1 },
          by_account_status: { active: 3, suspended: 1 },
        },
        personnel: {
          incomplete_profiles: 1,
          recent_hires_30d: 2,
        },
        attendance: {
          lookback_days: 30,
          tracked_records: 12,
          employees_tracked: 4,
          late_records: 3,
          absent_records: 2,
          unjustified_absent_records: 1,
          overtime_records: 2,
        },
        leave_requests: {
          lookback_days: 30,
          pending_requests: 2,
          pending_days_total: 5,
          approved_last_30d: 3,
          pending_by_type: {
            paid_leave: 1,
            sick_leave: 1,
          },
        },
        alerts: [
          { type: "pending_leave_requests", count: 2 },
          { type: "attendance_absences", count: 1 },
          { type: "attendance_lateness", count: 3 },
        ],
        latest_activity: [],
      },
    });

    renderUsersPage(session);

    expect(await screen.findByRole("heading", { name: "Personnel de l'entreprise" })).toBeInTheDocument();
    expect(await screen.findByText("RH terrain et alertes")).toBeInTheDocument();
    expect(screen.getByText("File de validation RH")).toBeInTheDocument();
    expect(screen.getByText("Demandes en attente")).toBeInTheDocument();
    expect(screen.getByText("Absences non couvertes")).toBeInTheDocument();
    expect(screen.getByText("Conge paye: 1")).toBeInTheDocument();
    expect(screen.getByText("Conge maladie: 1")).toBeInTheDocument();
    expect(screen.getByText("2 demande(s) RH attendent une decision.")).toBeInTheDocument();
    expect(screen.getByText("1 absence(s) non couverte(s) ressortent du pointage recent.")).toBeInTheDocument();
    expect(screen.getByText("3 pointage(s) signalent des retards repetes.")).toBeInTheDocument();
  });
});
