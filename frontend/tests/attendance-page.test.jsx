import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
          replies.map((reply) => normalizeReply(reply)),
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
import { AttendancePage } from "@/features/attendance/AttendancePage";

function makeSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-attendance",
    refresh_token: "refresh-attendance",
    user: {
      id: 7,
      email: "rh@example.com",
      first_name: "Sarah",
      last_name: "Manga",
      user_type: "employee",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["attendance.read", "attendance.manage"],
      roles: [{ code: "responsable_rh", name: "Responsable RH" }],
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function renderAttendancePage(session) {
  persistSession(session);
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        <AuthProvider>
          <AttendancePage />
        </AuthProvider>
      </MemoryRouter>,
    ),
  };
}

describe("AttendancePage", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("renders the real attendance module and posts an absence record", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", {
      data: { ...session.user },
    });
    httpMock.on("GET", "/attendance/support-data", {
      data: {
        policy: {
          id: 1,
          company_id: 42,
          default_start_time: "07:30",
          default_end_time: "17:15",
          grace_minutes: 10,
          overtime_threshold_minutes: 60,
          timezone: "Africa/Douala",
        },
        employees: [
          {
            id: 101,
            full_name: "Marcel Etoa",
            email: "marcel@example.com",
            job_title: "Macon",
            department: "Chantier",
          },
        ],
        projects: [
          {
            id: 501,
            code: "PRJ-ATT-001",
            name: "Residence Palmier",
            status: "in_progress",
          },
        ],
        statuses: ["present", "late", "absent", "overtime"],
        sources: ["manual", "manager", "import"],
      },
    }, {
      data: {
        policy: {
          id: 1,
          company_id: 42,
          default_start_time: "07:30",
          default_end_time: "17:15",
          grace_minutes: 10,
          overtime_threshold_minutes: 60,
          timezone: "Africa/Douala",
        },
        employees: [
          {
            id: 101,
            full_name: "Marcel Etoa",
            email: "marcel@example.com",
            job_title: "Macon",
            department: "Chantier",
          },
        ],
        projects: [
          {
            id: 501,
            code: "PRJ-ATT-001",
            name: "Residence Palmier",
            status: "in_progress",
          },
        ],
        statuses: ["present", "late", "absent", "overtime"],
        sources: ["manual", "manager", "import"],
      },
    });
    httpMock.on("GET", "/attendance/summary", {
      data: {
        summary: {
          total_records: 0,
          employees_tracked: 0,
          present_count: 0,
          late_count: 0,
          absent_count: 0,
          overtime_count: 0,
          late_minutes_total: 0,
          overtime_minutes_total: 0,
        },
        by_project: [],
        trend: [],
      },
    }, {
      data: {
        summary: {
          total_records: 1,
          employees_tracked: 1,
          present_count: 0,
          late_count: 0,
          absent_count: 1,
          overtime_count: 0,
          late_minutes_total: 0,
          overtime_minutes_total: 0,
        },
        by_project: [
          {
            project_id: null,
            project: null,
            label: "unassigned",
            total_records: 1,
            employees_tracked: 1,
            present_count: 0,
            late_count: 0,
            absent_count: 1,
            overtime_count: 0,
            late_minutes_total: 0,
            overtime_minutes_total: 0,
            latest_attendance_date: "2026-04-08",
            recent_records: [],
          },
        ],
        trend: [],
      },
    });
    httpMock.on("GET", "/attendance", {
      data: {
        items: [],
        count: 0,
      },
    }, {
      data: {
        items: [
          {
            id: 900,
            user_id: 101,
            project_id: null,
            attendance_date: "2026-04-08",
            status: "absent",
            arrival_time: null,
            departure_time: null,
            minutes_late: 0,
            overtime_minutes: 0,
            notes: "Absence constatee sur chantier",
            user: {
              id: 101,
              full_name: "Marcel Etoa",
              email: "marcel@example.com",
              employee_number: "EMP-ATT-001",
              job_title: "Macon",
              department: "Chantier",
              account_status: "active",
            },
            project: null,
          },
        ],
        count: 1,
      },
    });
    httpMock.on("POST", "/attendance", {
      status: 201,
      data: {
        message: "Attendance record created",
        record: {
          id: 900,
          user_id: 101,
          attendance_date: "2026-04-08",
          status: "absent",
        },
      },
    });

    renderAttendancePage(session);

    expect(await screen.findByText("Presences et pointage terrain")).toBeInTheDocument();
    expect(screen.getByText("Journal des pointages")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mode de saisie"), { target: { value: "absent" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Absence constatee sur chantier" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le pointage" }));

    await waitFor(() => {
      expect(screen.getByText("Pointage enregistre.")).toBeInTheDocument();
    });

    const request = httpMock.lastRequest("POST", "/attendance");
    expect(request).not.toBeNull();
    expect(request.data).toMatchObject({
      user_id: 101,
      attendance_date: expect.any(String),
      status: "absent",
      notes: "Absence constatee sur chantier",
    });
  });

  it("surfaces a chantier team snapshot from attendance summary", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", {
      data: { ...session.user },
    });
    httpMock.on("GET", "/attendance/support-data", {
      data: {
        policy: {
          id: 1,
          company_id: 42,
          default_start_time: "07:30",
          default_end_time: "17:15",
          grace_minutes: 10,
          overtime_threshold_minutes: 60,
          timezone: "Africa/Douala",
        },
        employees: [
          {
            id: 101,
            full_name: "Marcel Etoa",
            email: "marcel@example.com",
            job_title: "Macon",
            department: "Chantier",
          },
        ],
        projects: [
          {
            id: 501,
            code: "PRJ-ATT-001",
            name: "Residence Palmier",
            status: "in_progress",
          },
        ],
        statuses: ["present", "late", "absent", "overtime"],
        sources: ["manual", "manager", "import"],
      },
    });
    httpMock.on("GET", "/attendance/summary", {
      data: {
        summary: {
          total_records: 2,
          employees_tracked: 1,
          present_count: 0,
          late_count: 1,
          absent_count: 1,
          overtime_count: 0,
          late_minutes_total: 30,
          overtime_minutes_total: 0,
        },
        by_project: [
          {
            project_id: 501,
            project: {
              id: 501,
              code: "PRJ-ATT-001",
              name: "Residence Palmier",
              status: "in_progress",
            },
            label: "Residence Palmier",
            total_records: 2,
            employees_tracked: 1,
            present_count: 0,
            late_count: 1,
            absent_count: 1,
            overtime_count: 0,
            late_minutes_total: 30,
            overtime_minutes_total: 0,
            latest_attendance_date: "2026-04-09",
            recent_records: [
              {
                id: 900,
                user_id: 101,
                project_id: 501,
                attendance_date: "2026-04-09",
                status: "absent",
                arrival_time: null,
                departure_time: null,
                minutes_late: 0,
                overtime_minutes: 0,
                notes: "Absence constatee sur chantier",
                user: {
                  id: 101,
                  full_name: "Marcel Etoa",
                  email: "marcel@example.com",
                  employee_number: "EMP-ATT-001",
                  job_title: "Macon",
                  department: "Chantier",
                  account_status: "active",
                },
                project: {
                  id: 501,
                  code: "PRJ-ATT-001",
                  name: "Residence Palmier",
                  status: "in_progress",
                },
              },
            ],
          },
        ],
        trend: [],
      },
    });
    httpMock.on("GET", "/attendance", {
      data: {
        items: [],
        count: 0,
      },
    });

    renderAttendancePage(session);

    expect(await screen.findByRole("heading", { name: "Vue chantier / equipe" })).toBeInTheDocument();
    expect(screen.getAllByText("Residence Palmier").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ouvrir le planning" })).toHaveAttribute("href", "/app/planning");
    expect(screen.getByRole("heading", { name: "Lecture manager d'equipe" })).toBeInTheDocument();
    expect(screen.getAllByText("Marcel Etoa").length).toBeGreaterThan(0);
    expect(screen.getByText("Absence constatee sur chantier")).toBeInTheDocument();
  });
});
