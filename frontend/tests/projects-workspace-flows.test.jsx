import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
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
      headers: clone(config.headers),
    });

    if (!queue?.length) {
      throw new Error(`No mock route registered for ${routeKey}`);
    }

    const handler = queue.length > 1 ? queue.shift() : queue[0];
    const result = await handler({
      method: String(method || "GET").toUpperCase(),
      url,
      data: config.data,
      params: config.params,
      headers: config.headers,
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
import { ProjectsPage } from "@/features/projects/ProjectsPage";

function PathnameProbe() {
  const location = useLocation();
  return <p data-testid="pathname-probe">{location.pathname}</p>;
}

function makeCompanyAdminSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-company-admin",
    refresh_token: "refresh-company-admin",
    user: {
      id: 11,
      email: "admin@btp.example.com",
      first_name: "Alice",
      last_name: "Ngono",
      user_type: "company_admin",
      company_id: 42,
      preferred_language: "fr",
      permissions: [
        "companies.read",
        "users.read",
        "projects.read",
        "projects.manage",
      ],
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function renderFeature(element, { session } = {}) {
  if (session) {
    persistSession(session);
  }

  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={["/app/projects"]}>
        <AuthProvider>{element}</AuthProvider>
      </MemoryRouter>
    ),
  };
}

beforeEach(() => {
  httpMock.reset();
  socketMock.disconnect.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

test("projets: la selection d'un projet met a jour l'URL workspace", async () => {
  const session = makeCompanyAdminSession({
    user: {
      permissions: ["projects.read"],
    },
  });

  const workspaceFor = (id, name) => ({
    project: {
      id,
      code: `PRJ-${id}`,
      name,
      status: "in_progress",
      project_type: "public_market",
      progress_percent: 20,
      physical_progress_percent: 15,
      financial_progress_percent: 25,
      days_remaining: 40,
    },
    alerts: [],
    budgets: { items: [] },
    tasks: { items: [] },
    assignments: { items: [] },
    reports: { items: [] },
    risks: { items: [] },
    change_orders: { items: [] },
    documents: { items: [] },
    finance: { budget_amount: 0, expenses: 0, revenues: 0 },
    resources: { allocations_count: 0, equipment_quantity: 0 },
  });

  httpMock.on("GET", "/auth/me", { data: session.user });
  httpMock.on("GET", "/projects/dashboard", {
    data: {
      counts: { active_projects: 2, delayed_projects: 0 },
      financials: { budget_consumed_percent: 0 },
      alerts: { overdue_tasks: 0 },
    },
  });
  httpMock.on("GET", "/projects", {
    data: {
      items: [
        {
          id: 301,
          code: "PRJ-301",
          name: "Residence Palmier",
          status: "in_progress",
          project_type: "public_market",
          progress_percent: 20,
          start_date: "2026-01-01",
        },
        {
          id: 302,
          code: "PRJ-302",
          name: "Ecole Melen",
          status: "in_progress",
          project_type: "public_market",
          progress_percent: 10,
          start_date: "2026-02-01",
        },
        {
          id: 303,
          code: "PRJ-303",
          name: "Pont Acheve",
          status: "final_acceptance",
          project_type: "public_market",
          progress_percent: 100,
          start_date: "2025-01-01",
        },
      ],
      pagination: { page: 1, per_page: 20, total: 3, pages: 1 },
    },
  });
  httpMock.on("GET", "/projects/301/workspace", { data: workspaceFor(301, "Residence Palmier") });
  httpMock.on("GET", "/projects/302/workspace", { data: workspaceFor(302, "Ecole Melen") });

  persistSession(session);
  render(
    <MemoryRouter initialEntries={["/app/projects"]}>
      <AuthProvider>
        <ProjectsPage />
        <PathnameProbe />
      </AuthProvider>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: "Projets" }));

  expect(await screen.findByRole("button", { name: /PRJ-303/i })).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("Tous les projets"), { target: { value: "completed" } });
  expect(await screen.findByRole("button", { name: /PRJ-303/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /PRJ-301/i })).not.toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("Acheves"), { target: { value: "all" } });

  const [initialCard] = await screen.findAllByRole("button", { name: /PRJ-301/i });
  expect(initialCard).toBeInTheDocument();

  const [secondProjectCard] = await screen.findAllByRole("button", { name: /PRJ-302/i });
  fireEvent.click(secondProjectCard);

  await waitFor(() => {
    expect(screen.getByTestId("pathname-probe").textContent).toBe("/app/projects/302/overview");
  });
});

test("projets: le cockpit avance affiche rentabilite, capacite, alertes et validations", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", { data: session.user });
  httpMock.on("GET", "/projects/dashboard", {
    data: {
      counts: {
        active_projects: 1,
        delayed_projects: 0,
        assignments: 3,
      },
      financials: {
        budget_consumed_percent: 80,
        budget_total: 100000000,
        expenses_total: 80000000,
        revenues_total: 120000000,
        margin_total: 40000000,
      },
      alerts: {
        overdue_tasks: 0,
      },
      cockpit: {
        profitability: {
          count: 1,
          items: [
            {
              project_id: 701,
              project_code: "PRJ-701",
              project_name: "Marche Stade",
              initial_budget: 100000000,
              actual_cost: 80000000,
              revenue_basis: 120000000,
              final_margin: 40000000,
              budget_variance: 20000000,
              budget_consumed_percent: 80,
              progress_percent: 35,
              budget_progress_gap: 45,
              health: "warning",
            },
          ],
        },
        capacity: {
          count: 1,
          summary: { overloaded: 1, available: 0, busy: 0, allocated: 0 },
          items: [
            {
              user_id: 501,
              full_name: "Jean Capacity",
              email: "jean.capacity@example.com",
              job_title: "Chef de chantier",
              department: "Operations",
              active_assignments: 3,
              recommended_capacity: 2,
              load_percent: 150,
              status: "overloaded",
              assignments: [
                { assignment_id: 1, project_code: "PRJ-701", project_name: "Marche Stade" },
                { assignment_id: 2, project_code: "PRJ-702", project_name: "Ecole Nord" },
              ],
            },
          ],
        },
        budget_progress_alerts: {
          count: 1,
          items: [
            {
              project_id: 701,
              project_code: "PRJ-701",
              project_name: "Marche Stade",
              severity: "danger",
              budget_consumed_percent: 80,
              progress_percent: 35,
              gap_percent: 45,
              expenses: 80000000,
              budget_amount: 100000000,
            },
          ],
        },
        validation_queue: {
          count: 2,
          summary: { validation: 1, execution: 1 },
          items: [
            {
              id: "document-1",
              source_type: "document",
              title: "PV reception provisoire",
              status: "pending_review",
              stage: "validation",
              severity: "warning",
              project_code: "PRJ-701",
            },
            {
              id: "invoice-1",
              source_type: "invoice",
              title: "FAC-701",
              status: "sent",
              stage: "execution",
              severity: "info",
              project_code: "PRJ-701",
            },
          ],
        },
      },
      items: [
        {
          id: 701,
          code: "PRJ-701",
          name: "Marche Stade",
          status: "in_progress",
          progress_percent: 35,
          expenses: 80000000,
          revenues: 120000000,
          budget_consumed_percent: 80,
        },
      ],
    },
  });
  httpMock.on("GET", "/projects", {
    data: {
      items: [
        {
          id: 701,
          code: "PRJ-701",
          name: "Marche Stade",
          status: "in_progress",
          project_type: "public_market",
          progress_percent: 35,
          budget_amount: 100000000,
          contract_amount: 120000000,
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on("GET", "/users", {
    data: {
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, pages: 0 },
    },
  });

  const { user } = renderFeature(<ProjectsPage />, { session });

  await user.click(await screen.findByRole("button", { name: "Cockpit avance" }));

  expect(await screen.findByText("Rentabilite par projet")).toBeInTheDocument();
  expect(screen.getAllByText(/PRJ-701 - Marche Stade/).length).toBeGreaterThan(0);
  expect(screen.getByText("Matrice capacite equipe")).toBeInTheDocument();
  expect(screen.getByText("Jean Capacity")).toBeInTheDocument();
  expect(screen.getByText("Surcharge")).toBeInTheDocument();
  expect(screen.getByText("Alertes budget / avancement")).toBeInTheDocument();
  expect(screen.getByText("+45%")).toBeInTheDocument();
  expect(screen.getByText("Circuit de validation documentaire")).toBeInTheDocument();
  expect(screen.getByText("PV reception provisoire")).toBeInTheDocument();
  expect(screen.getByText("FAC-701")).toBeInTheDocument();
});

test("projets: la vue documents liste les documents techniques recents", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", { data: session.user });
  httpMock.on("GET", "/projects/dashboard", {
    data: {
      counts: { active_projects: 1, delayed_projects: 0, assignments: 0 },
      financials: { budget_consumed_percent: 0 },
      alerts: { overdue_tasks: 0 },
      recent_documents: {
        count: 3,
        items: [
          {
            id: "document-12",
            source_type: "document",
            document_type: "pv",
            reference: "DOC-12",
            title: "PV reception provisoire",
            status: "available",
            document_date: "2026-04-09",
            added_at: "2026-04-10T08:00:00",
            project_id: 701,
            project_code: "PRJ-701",
            project_name: "Marche Stade",
            uploaded_by: { full_name: "Alice Ngono" },
            file_url: "https://example.com/pv.pdf",
          },
          {
            id: "change-order-7",
            source_type: "change_order",
            document_type: "change_order",
            reference: "AV-007",
            title: "Avenant delai contractuel",
            status: "submitted",
            document_date: "2026-04-08",
            added_at: "2026-04-09T08:00:00",
            project_id: 701,
            project_code: "PRJ-701",
            project_name: "Marche Stade",
            uploaded_by: { full_name: "Alice Ngono" },
          },
          {
            id: "document-13",
            source_type: "document",
            document_type: "decompte",
            reference: "DOC-13",
            title: "Decompte travaux no 1",
            status: "available",
            document_date: "2026-04-07",
            added_at: "2026-04-08T08:00:00",
            project_id: 701,
            project_code: "PRJ-701",
            project_name: "Marche Stade",
            uploaded_by: { full_name: "Alice Ngono" },
            file_url: "https://example.com/decompte.pdf",
          },
        ],
      },
      items: [
        {
          id: 701,
          code: "PRJ-701",
          name: "Marche Stade",
          status: "in_progress",
          project_type: "public_market",
          progress_percent: 35,
        },
      ],
    },
  });
  httpMock.on("GET", "/projects", {
    data: {
      items: [
        {
          id: 701,
          code: "PRJ-701",
          name: "Marche Stade",
          status: "in_progress",
          project_type: "public_market",
          progress_percent: 35,
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on("GET", "/users", {
    data: {
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, pages: 0 },
    },
  });

  const { user } = renderFeature(<ProjectsPage />, { session });

  await user.click(await screen.findByRole("button", { name: "Documents" }));

  expect(await screen.findByText("Documents recemment ajoutes")).toBeInTheDocument();
  expect(screen.getByText("PV reception provisoire")).toBeInTheDocument();
  expect(screen.getByText("AV-007")).toBeInTheDocument();
  expect(screen.getByText("DOC-13")).toBeInTheDocument();
  expect(screen.getAllByText("Decompte").length).toBeGreaterThan(0);
});

test("projets: affectation depuis le cockpit chantier", async () => {
  const session = makeCompanyAdminSession();
  const collaborators = [
    {
      id: 501,
      first_name: "Marcel",
      last_name: "Etoa",
      email: "marcel.etoa@project.example.com",
      job_title: "Chef de chantier",
      department: "Operations",
      account_status: "active",
      user_type: "employee",
    },
    {
      id: 502,
      first_name: "Sarah",
      last_name: "Nde",
      email: "sarah.nde@project.example.com",
      job_title: "Conductrice travaux",
      department: "Operations",
      account_status: "active",
      user_type: "employee",
    },
  ];

  const workspaceState = {
    project: {
      id: 301,
      code: "PRJ-301",
      name: "Residence Palmier",
      description: "Construction d'une residence R+4.",
      progress_percent: 15,
      physical_progress_percent: 12,
      financial_progress_percent: 18,
      days_remaining: 120,
      status: "in_progress",
      project_type: "public_market",
      start_date: "2026-04-01",
      end_date: "2026-08-31",
    },
    alerts: [],
    budgets: { items: [] },
    tasks: { items: [] },
    assignments: { items: [] },
    reports: { items: [] },
    risks: { items: [] },
    change_orders: { items: [] },
    documents: { items: [] },
    finance: {
      budget_amount: 50000000,
      expenses: 12000000,
      revenues: 0,
    },
    resources: {
      allocations_count: 0,
      equipment_quantity: 0,
    },
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  httpMock.on("GET", "/auth/me", {
    data: {
      ...session.user,
    },
  });
  httpMock.on("GET", "/projects/dashboard", {
    data: {
      counts: {
        active_projects: 1,
        delayed_projects: 0,
      },
      financials: {
        budget_consumed_percent: 24,
      },
      alerts: {
        overdue_tasks: 0,
      },
    },
  });
  httpMock.on("GET", "/projects", {
    data: {
      items: [
        {
          id: 301,
          code: "PRJ-301",
          name: "Residence Palmier",
          status: "in_progress",
          progress_percent: 15,
          location: "Douala",
          client_name: "SCI Palmier",
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on("GET", "/projects/301/workspace", () => ({
    status: 200,
    data: clone(workspaceState),
  }));
  httpMock.on("GET", "/users", {
    data: {
      items: collaborators,
      pagination: { page: 1, per_page: 20, total: collaborators.length, pages: 1 },
    },
  });
  httpMock.on("POST", "/projects/301/assignments", ({ data }) => {
    const collaborator = collaborators.find((item) => item.id === data.user_id);
    workspaceState.assignments.items.push({
      id: 701,
      user_id: data.user_id,
      project_role: data.project_role,
      assignment_mode: data.assignment_mode,
      start_date: data.start_date,
      end_date: data.end_date,
      responsibility: data.responsibility,
      is_active: true,
      user: collaborator
        ? {
            id: collaborator.id,
            full_name: `${collaborator.first_name} ${collaborator.last_name}`,
            job_title: collaborator.job_title,
            email: collaborator.email,
          }
        : null,
    });

    return {
      status: 201,
      data: { assignment: { id: 701 } },
    };
  });
  httpMock.on("POST", "/projects/301/risks", ({ data }) => {
    const owner = collaborators.find((item) => item.id === data.owner_user_id);
    workspaceState.risks.items.push({
      id: 901,
      title: data.title,
      severity: data.severity,
      status: data.status,
      owner_user_id: data.owner_user_id,
      mitigation_plan: data.mitigation_plan,
      due_date: data.due_date,
      description: data.description,
      owner: owner ? { id: owner.id, full_name: `${owner.first_name} ${owner.last_name}` } : null,
    });

    return {
      status: 201,
      data: { risk: { id: 901 } },
    };
  });

  const { user } = renderFeature(<ProjectsPage forcedProjectId={301} workspaceTab="team" />, { session });

  await user.click(await screen.findByRole("button", { name: "Ajouter l'affectation" }));
  const assignmentDialog = await screen.findByRole("dialog", { name: "Ajouter l'affectation" });
  const assignmentSelect = await within(assignmentDialog).findByLabelText("project-assignment-user");
  expect(assignmentSelect).toBeInTheDocument();

  const assignmentForm = within(assignmentDialog).getByRole("button", { name: "Ajouter l'affectation" }).closest("form");
  expect(assignmentForm).not.toBeNull();
  await user.selectOptions(within(assignmentForm).getByLabelText("project-assignment-user"), "501");
  fireEvent.change(within(assignmentForm).getByPlaceholderText("Role sur projet"), { target: { value: "chef_chantier" } });
  fireEvent.change(within(assignmentForm).getByPlaceholderText("Responsabilite"), { target: { value: "Pilotage quotidien" } });
  await user.click(within(assignmentForm).getByRole("button", { name: "Ajouter l'affectation" }));

  await waitFor(() => {
    expect(httpMock.lastRequest("POST", "/projects/301/assignments")?.data).toMatchObject({
      user_id: 501,
      project_role: "chef_chantier",
      assignment_mode: "immediate",
      responsibility: "Pilotage quotidien",
    });
  });
  expect(await screen.findByText("Marcel Etoa")).toBeInTheDocument();
}, 30000);
