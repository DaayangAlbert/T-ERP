import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { httpMock, httpClientMock, socketMock } = vi.hoisted(() => {
  const routes = new Map();

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

    if (!queue?.length) {
      throw new Error(`No mock route registered for ${routeKey}`);
    }

    const handler = queue.length > 1 ? queue.shift() : queue[0];
    const result = await handler({
      method: String(method || "GET").toUpperCase(),
      url,
      data: clone(config.data),
      params: clone(config.params),
      headers: clone(config.headers),
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
      put(url, data, config = {}) {
        return dispatch("PUT", url, { ...config, data });
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
import { PayrollEntryPage } from "@/features/payroll/PayrollEntryPage";
import { PlanningPage } from "@/features/planning/PlanningPage";

function makeSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-boundary",
    refresh_token: "refresh-boundary",
    user: {
      id: 77,
      email: "agent@example.com",
      first_name: "Mila",
      last_name: "Mve",
      user_type: "employee",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["payroll.read", "projects.read"],
      roles: [],
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function renderFeature(element, { session, initialEntry = "/" } = {}) {
  if (session) {
    persistSession(session);
  }

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>{element}</AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  httpMock.reset();
  socketMock.disconnect.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

test("paie: le self-service distingue planning, demandes de conge et bulletins", async () => {
  const session = makeSession();

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/payroll/status", { data: { module: "payroll", status: "ready", cnps_ceiling: 750000 } });
  httpMock.on("GET", "/payroll/me/summary", {
    data: {
      employee: { full_name: "Mila Mve", base_salary: 240000, department: "Operations", job_title: "Magasinier" },
      payroll_profile: { hours_schedule: "08:00-17:00", payment_method: "bank_transfer" },
      attendance: {
        source: "attendance_records",
        absence_days: 1,
        approved_leave_days: 1,
        unjustified_absence_days: 0,
        present_days: 20,
        tracked_days: 21,
        late_hours: 2,
        overtime_hours: 1.5,
        days_paid: 21,
        period_days: 22,
        period_key: "2026-04",
        period_label: "Avril 2026",
      },
      leave_summary: { approved_days_total: 2, approved_requests: 1, pending_requests: 1, pending_days_total: 1, total_requests: 2 },
      payslips_count: 1,
    },
  });
  httpMock.on("GET", "/payroll/me/payslips", {
    data: {
      items: [{ id: 1, period_key: "2026-04", net_a_payer: 232000, run_reference: "RUN-2026-04", download_path: null }],
    },
  });
  httpMock.on("GET", "/payroll/me/leave-requests", {
    data: {
      items: [
        {
          id: 9,
          title: "Conge annuel",
          type: "paid_leave",
          status: "pending",
          start_date: "2026-04-15",
          end_date: "2026-04-16",
          reason: "Repos",
          days_requested: 2,
          created_at: "2026-04-10T08:00:00Z",
        },
      ],
    },
  });
  httpMock.on("POST", "/users/me/notifications/mark-seen", { data: { ok: true } });

  renderFeature(<PayrollEntryPage />, { session, initialEntry: "/app/payroll?focus=leave" });

  expect(await screen.findByRole("heading", { name: "Espace paie personnel" })).toBeInTheDocument();
  expect(screen.getByText(/La paie gere vos bulletins, absences, retards et demandes officielles de conge/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Demandes de conge" })).toHaveAttribute("href", "/app/payroll?focus=leave");
  expect(screen.getByRole("link", { name: "Mes bulletins" })).toHaveAttribute("href", "/app/payroll?focus=payslips");
  expect(screen.getByRole("link", { name: "Ouvrir le planning" })).toHaveAttribute("href", "/app/planning");
  expect(screen.getByText("Frontiere planning / paie")).toBeInTheDocument();
  expect(screen.getByText("Agenda, rappels, taches assignees et planification projet.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Absence, retard et conges" })).toBeInTheDocument();
  expect(screen.getByText(/1 couvert\(es\) par conge\(s\) \| 0 non couvert\(es\)/i)).toBeInTheDocument();
  expect(screen.getByText("Conges approuves")).toBeInTheDocument();
});

test("planning: l'ecran rappelle que les demandes officielles passent par la paie", async () => {
  const session = makeSession({
    user: {
      permissions: ["payroll.read", "projects.read", "attendance.read"],
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/planning/overview", {
    data: {
      permissions: { can_read_projects: false, can_manage_projects: false },
      agenda_summary: { today_count: 1, upcoming_count: 2 },
      my_tasks: [],
      projects: [],
    },
  });
  httpMock.on("GET", "/planning/agenda", {
    data: {
      items: [
        {
          id: 101,
          title: "Reception fournisseur",
          category: "meeting",
          start_at: "2026-04-08T08:00:00Z",
          end_at: "2026-04-08T09:00:00Z",
          location: "Depot central",
          is_completed: false,
          project: null,
        },
      ],
    },
  });

  renderFeature(<PlanningPage />, { session, initialEntry: "/app/planning" });

  expect(await screen.findByRole("heading", { name: "Frontiere planning / paie" })).toBeInTheDocument();
  expect(screen.getByText(/Les demandes officielles de conge, d'absence et de retard restent traitees dans la paie/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ouvrir les presences" })).toHaveAttribute("href", "/app/attendance");
  expect(screen.getByRole("link", { name: "Ouvrir la paie" })).toHaveAttribute("href", "/app/payroll?focus=leave");
  expect(screen.getByText("Indisponibilite")).toBeInTheDocument();
});

test("paie: un approbateur workflow voit seulement le circuit conges et pas le cycle complet", async () => {
  const session = makeSession({
    user: {
      operational_profile_code: "chef_chantier",
      permissions: ["payroll.read", "projects.read"],
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/payroll/status", { data: { module: "payroll", status: "ready", cnps_ceiling: 750000 } });
  httpMock.on("GET", "/payroll/leave-requests", {
    data: {
      summary: {
        total_requests: 1,
        pending_requests: 1,
        approved_days_total: 0,
      },
      items: [
        {
          id: 81,
          title: "Conge chantier",
          type: "paid_leave",
          status: "submitted",
          start_date: "2026-04-15",
          end_date: "2026-04-16",
          reason: "Repos annuel",
          days_requested: 2,
          created_at: "2026-04-10T08:00:00Z",
          employee: {
            id: 91,
            full_name: "Luc Mballa",
            employee_number: "EMP-091",
            job_title: "Magasinier",
            department: "Logistique",
          },
          employee_leave_summary: {
            total_requests: 2,
            approved_days_total: 3,
            pending_requests: 1,
          },
          workflow: {
            current_stage_code: "manager_review",
            current_stage_label: "Validation manager",
            available_actions: ["approve", "reject"],
            stages: [
              { code: "manager_review", label: "Validation manager", status: "current" },
              { code: "hr_review", label: "Validation RH", status: "pending" },
            ],
            history: [
              {
                id: 1001,
                label: "Demande soumise",
                workflow_stage: null,
                workflow_stage_label: null,
                decision: null,
                decision_note: null,
                created_at: "2026-04-10T08:00:00Z",
                actor: { full_name: "Luc Mballa", email: "luc@example.com" },
              },
            ],
          },
        },
      ],
    },
  });
  httpMock.on("POST", "/users/me/notifications/mark-seen", { data: { ok: true } });

  renderFeature(<PayrollEntryPage />, { session, initialEntry: "/app/payroll?focus=leave-management" });

  expect(await screen.findByRole("heading", { name: "Circuit d'approbation RH" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Circuit d'approbation des conges" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Cycle mensuel de paie" })).not.toBeInTheDocument();
  expect(screen.getByText("Validation manager")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rejeter" })).toBeInTheDocument();
});
