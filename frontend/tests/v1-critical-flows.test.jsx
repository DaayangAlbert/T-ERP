import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
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

import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AuthProvider } from "@/features/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute, PublicOnlyRoute } from "@/features/auth/RouteGuards";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { CompaniesPage } from "@/features/companies/CompaniesPage";
import { getStoredSession, persistSession } from "@/features/auth/authStorage";
import { FinancePage } from "@/features/finance/FinancePage";
import { InventoryEntryPage } from "@/features/inventory/InventoryEntryPage";
import { ProcurementPage } from "@/features/procurement/ProcurementPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { RecruitmentPage } from "@/features/recruitment/RecruitmentPage";
import { UsersPage } from "@/features/users/UsersPage.jsx";

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
        "users.manage",
        "projects.read",
        "projects.manage",
        "finance.read",
        "finance.manage",
        "inventory.read",
        "inventory.manage",
      ],
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      ...userOverrides,
    },
    ...sessionOverrides,
  };
}

function makeUsersDashboardPayload(overrides = {}) {
  return {
    company: { id: 42, account_status: "active", subscription_status: "active" },
    users: {
      total: 1,
      active: 1,
      inactive: 0,
      by_job_title: {},
      by_department: {},
      by_contract_type: {},
      by_user_type: {},
      by_account_status: { active: 1 },
    },
    personnel: {
      managers: 1,
      recent_hires_30d: 0,
      without_department: 0,
      without_job_title: 0,
      without_employee_number: 0,
      incomplete_profiles: 0,
    },
    projects: { total: 0, in_progress: 0, delayed: 0, spotlight: [] },
    inventory: { low_stock_items: 0 },
    finance: { revenues: 0, expenses: 0, outstanding_invoices: 0 },
    subscription: { status: "active", end_date: null },
    alerts: [],
    latest_activity: [],
    ...overrides,
  };
}

function renderAppAt(pathname, { session } = {}) {
  if (session) {
    persistSession(session);
  }

  const router = createMemoryRouter(
    [
      { path: "/", element: <div>Accueil</div> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/app",
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "companies", element: <CompaniesPage /> },
              { path: "projects", element: <ProjectsPage /> },
              { path: "users", element: <UsersPage /> },
              { path: "inventory", element: <InventoryEntryPage /> },
              { path: "finance", element: <FinancePage /> },
              { path: "procurement", element: <ProcurementPage /> },
              { path: "recruitment", element: <RecruitmentPage /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [pathname] }
  );

  return {
    router,
    user: userEvent.setup(),
    ...render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    ),
  };
}

function renderFeature(element, { session } = {}) {
  if (session) {
    persistSession(session);
  }

  return {
    user: userEvent.setup(),
    ...render(<AuthProvider>{element}</AuthProvider>),
  };
}

beforeEach(() => {
  httpMock.reset();
  socketMock.disconnect.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

test("inscription entreprise: le formulaire aboutit a l'ecran de succes", async () => {
  httpMock.on("POST", "/companies/register", {
    status: 201,
    data: {
      company: {
        id: 101,
        legal_name: "Batimax SARL",
      },
    },
  });

  const { user } = renderAppAt("/register");

  fireEvent.change(screen.getByLabelText("Prenom"), { target: { value: "Alice" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Ngono" } });
  fireEvent.change(screen.getByLabelText("Nom de l'entreprise"), { target: { value: "Batimax SARL" } });
  fireEvent.change(screen.getByLabelText("Numero d'immatriculation"), { target: { value: "RC-2026-001" } });
  fireEvent.change(screen.getByLabelText("Code pays"), { target: { value: "cm" } });
  fireEvent.change(screen.getByLabelText("Email entreprise"), { target: { value: "CONTACT@BATIMAX.EXAMPLE.COM" } });
  fireEvent.change(screen.getByLabelText("Telephone entreprise (optionnel)"), { target: { value: "+237699999999" } });
  fireEvent.change(screen.getByLabelText("Domaine d'activite (optionnel)"), { target: { value: "BTP" } });
  fireEvent.change(screen.getByLabelText("Email administrateur"), { target: { value: "ADMIN@BATIMAX.EXAMPLE.COM" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "BatimaxPass123!" } });
  fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "BatimaxPass123!" } });
  await user.click(screen.getByRole("button", { name: "Creer mon compte" }));

  expect(await screen.findByText("Compte cree !")).toBeInTheDocument();

  expect(httpMock.lastRequest("POST", "/companies/register")?.data).toEqual({
    legal_name: "Batimax SARL",
    registration_number: "RC-2026-001",
    email: "contact@batimax.example.com",
    phone: "+237699999999",
    activity_domain: "BTP",
    country_code: "CM",
    admin_first_name: "Alice",
    admin_last_name: "Ngono",
    admin_email: "admin@batimax.example.com",
    admin_password: "BatimaxPass123!",
  });
});

test("acces protege: redirection vers login puis ouverture du module prioritaire", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("POST", "/auth/login", {
    status: 200,
    data: session,
  });
  httpMock.on("GET", "/users", {
    data: {
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, pages: 1 },
    },
  });
  httpMock.on("GET", "/users/operational-profiles", {
    data: {
      items: [],
      interactions: [],
      access_matrix: [],
    },
  });
  httpMock.on("GET", "/users/organization-units", {
    data: {
      items: [],
      tree: [],
      count: 0,
    },
  });

  const { user, router } = renderAppAt("/app");

  expect(await screen.findByText("Connectez-vous pour acceder a l'application.")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Adresse email"), "admin@btp.example.com");
  await user.type(screen.getByLabelText("Mot de passe"), "CompanyPass123!");
  await user.type(screen.getByLabelText("ID entreprise (optionnel)"), "42");
  await user.click(screen.getByRole("button", { name: "Se connecter" }));

  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/app/users");
    expect(getStoredSession()?.user?.email).toBe("admin@btp.example.com");
  });
});

test("connexion entreprise: un premier setup priorise l'espace entreprise apres login", async () => {
  const session = makeCompanyAdminSession({
    user: {
      company_setup_pending: true,
      company_setup_status: "pending",
      company_setup_pending_task_codes: ["company_phone", "company_address"],
    },
  });

  httpMock.on("POST", "/auth/login", {
    status: 200,
    data: session,
  });
  httpMock.on("GET", "/companies/me", {
    data: {
      id: 42,
      legal_name: "BTP Setup SARL",
      email: "contact@btp-setup.example.com",
      onboarding_status: "approved",
      account_status: "active",
      subscription_status: "active",
      administrative_documents: {},
      setup: {
        status: "pending",
        completion_percent: 40,
        completed_tasks: 2,
        total_tasks: 5,
        pending_task_codes: ["company_phone", "company_address", "compliance_documents"],
      },
      settings: {
        contact_person_name: null,
        contact_person_phone: null,
        website_url: null,
      },
    },
  });
  httpMock.on("GET", "/chat/contacts", {
    data: { items: [] },
  });

  const { user, router } = renderAppAt("/app");

  expect(await screen.findByText("Connectez-vous pour acceder a l'application.")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Adresse email"), "admin@btp.example.com");
  await user.type(screen.getByLabelText("Mot de passe"), "CompanyPass123!");
  await user.type(screen.getByLabelText("ID entreprise (optionnel)"), "42");
  await user.click(screen.getByRole("button", { name: "Se connecter" }));

  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/app/companies");
  });
  await waitFor(() => {
    expect(screen.getByText("Configuration initiale de l'entreprise")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("shell: le menu mobile peut s'ouvrir et se refermer sans casser la navigation", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on("GET", "/users", {
    data: {
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, pages: 1 },
    },
  });
  httpMock.on("GET", "/users/operational-profiles", {
    data: {
      items: [],
      interactions: [],
      access_matrix: [],
    },
  });
  httpMock.on("GET", "/users/organization-units", {
    data: {
      items: [],
      tree: [],
      count: 0,
    },
  });
  httpMock.on("GET", "/users/dashboard", {
    data: makeUsersDashboardPayload(),
  });

  const { user } = renderAppAt("/app/users", { session });

  await user.click(await screen.findByRole("button", { name: "Ouvrir le menu" }));
  expect(screen.getByRole("button", { name: "Fermer le menu" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Fermer le menu" }));
  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Fermer le menu" })).not.toBeInTheDocument();
  });
});

test("dashboard: le profil candidat voit des entrees explicites dans la navigation et les raccourcis", async () => {
  const session = makeCompanyAdminSession({
    user: {
      user_type: "job_seeker",
      permissions: ["recruitment.read"],
      roles: [{ code: "candidat_job_seeker", name: "Candidat" }],
      operational_profile_code: "candidat_job_seeker",
      department: "Parcours candidature",
      job_title: "Candidat",
      first_name: "Sarah",
      last_name: "Meka",
      email: "sarah.meka@example.com",
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/recruitment/job-offers", {
    data: {
      items: [
        {
          id: 701,
          title: "Juriste marches",
          description: "Pilotage contractuel et controle des pieces DAO.",
          contract_type: "CDI",
          location: "Douala",
          status: "published",
        },
      ],
    },
  });
  httpMock.on("GET", "/recruitment/candidate-profiles/me", {
    data: {
      candidate: {
        id: 301,
        user_id: session.user.id,
        email: "sarah.meka@example.com",
        first_name: "Sarah",
        last_name: "Meka",
        availability_status: "immediate",
        profile_score: 90,
      },
    },
  });
  httpMock.on("GET", "/recruitment/applications/me", {
    data: {
      items: [],
      pagination: { page: 1, page_size: 30, total: 0, total_pages: 0 },
    },
  });

  renderAppAt("/app", { session });

  expect((await screen.findAllByText(/Mon espace candidature/)).length).toBeGreaterThan(0);
  expect(screen.getByText("Entrees recommandees")).toBeInTheDocument();
  expect(screen.getAllByText(/Profil, offres ouvertes et suivi de mes candidatures/).length).toBeGreaterThan(0);
});

test("projets: creation d'un projet depuis l'interface", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on("GET", "/projects/dashboard", {
    data: {
      counts: {
        active_projects: 0,
        delayed_projects: 0,
      },
      financials: {
        budget_consumed_percent: 0,
      },
      alerts: {
        overdue_tasks: 0,
      },
    },
  });
  httpMock.on("GET", "/users", {
    data: {
      items: [
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
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on(
    "GET",
    "/projects",
    { data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } } },
    {
      data: {
        items: [
          {
            id: 301,
            code: "PRJ-001",
            name: "Immeuble Test",
            status: "planned",
            progress_percent: 0,
            location: "Douala",
            client_name: "Client Test",
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    }
  );
  httpMock.on("POST", "/projects", {
    status: 201,
    data: {
      project: {
        id: 301,
        code: "PRJ-001",
        name: "Immeuble Test",
      },
    },
  });
  httpMock.on("GET", "/projects/301/workspace", {
    data: {
      project: {
        id: 301,
        code: "PRJ-001",
        name: "Immeuble Test",
        description: "",
        progress_percent: 0,
        physical_progress_percent: 0,
        financial_progress_percent: 0,
        days_remaining: 30,
        status: "draft",
        project_type: "public_market",
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
        budget_amount: 0,
        expenses: 0,
        revenues: 0,
      },
      resources: {
        allocations_count: 0,
        equipment_quantity: 0,
      },
    },
  });

  const { user } = renderAppAt("/app/projects", { session });

  await user.click(await screen.findByRole("button", { name: "Ajouter un nouveau projet" }));
  expect(await screen.findByRole("dialog", { name: "Nouveau projet / marche" })).toBeInTheDocument();
  expect(await screen.findByPlaceholderText("Code projet")).toBeInTheDocument();

  await user.type(screen.getByPlaceholderText("Code projet"), "PRJ-001");
  await user.type(screen.getByPlaceholderText("Nom du projet"), "Immeuble Test");
  await user.click(screen.getByRole("button", { name: "Creer" }));

  expect((await screen.findAllByText("Immeuble Test")).length).toBeGreaterThan(0);
  expect(httpMock.lastRequest("POST", "/projects")?.data?.name).toBe("Immeuble Test");
});


test("utilisateurs: creation d'un collaborateur operationnel", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on(
    "GET",
    "/users",
    { data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } } },
    {
      data: {
        items: [
          {
            id: 401,
            first_name: "Paul",
            last_name: "Essama",
            email: "employee@hr-company.example.com",
            job_title: "Chef de chantier",
            department: "Operations",
            account_status: "active",
            user_type: "employee",
            roles: [{ code: "ops_lead", name: "Operations Lead" }],
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    }
  );
  httpMock.on("GET", "/users/operational-profiles", {
    data: {
      items: [
        {
          code: "chef_chantier",
          name: "Chef de chantier",
          definition: "Coordonne l'execution quotidienne du chantier.",
          linked_roles: [{ code: "ops_lead", name: "Operations Lead", permissions: ["projects.read", "users.read"] }],
          system_access: [{ module: "projects", level: "write" }],
          missions: ["Coordonner l'equipe terrain"],
          feature_groups: [{ title: "Pilotage", items: ["Suivi des equipes"] }],
          indicators: ["Avancement chantier"],
          controls: ["Validation quotidienne"],
          default_assignment: {
            user_type: "employee",
            job_title: "Chef de chantier",
            department: "Operations",
            hierarchy_level: 2,
          },
          default_role_ids: [7],
        },
      ],
      interactions: [{ source: "Chef de chantier", target: "Magasin", description: "Coordonne les besoins materiels." }],
      access_matrix: [{ role: "Chef de chantier", projects: "Ecriture", inventory: "Lecture", finance: "Lecture", hr: "Lecture" }],
    },
  });
  httpMock.on("GET", "/users/organization-units", {
    data: {
      items: [
        {
          id: 901,
          code: "SRV-OPS",
          name: "Operations",
          unit_type: "service",
          headcount: 1,
          parent_unit: null,
        },
      ],
      tree: [],
      count: 1,
    },
  });
  httpMock.on("GET", "/users/dashboard", {
    data: makeUsersDashboardPayload({
      users: {
        total: 1,
        active: 1,
        inactive: 0,
        by_job_title: { "Chef de chantier": 1 },
        by_department: { Operations: 1 },
        by_contract_type: {},
        by_user_type: { employee: 1 },
        by_account_status: { active: 1 },
      },
      personnel: {
        managers: 1,
        recent_hires_30d: 1,
        without_department: 0,
        without_job_title: 0,
        without_employee_number: 0,
        incomplete_profiles: 0,
      },
    }),
  });
  httpMock.on("POST", "/users", {
    status: 201,
    data: {
      user: {
        id: 401,
        first_name: "Paul",
        last_name: "Essama",
        email: "employee@hr-company.example.com",
      },
    },
  });

  const { user } = renderAppAt("/app/users", { session });

  expect(await screen.findByPlaceholderText("Prenom")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByPlaceholderText("Fonction")).toHaveValue("Chef de chantier");
  });

  fireEvent.change(screen.getByPlaceholderText("Prenom"), { target: { value: "Paul" } });
  fireEvent.change(screen.getByPlaceholderText("Nom"), { target: { value: "Essama" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "employee@hr-company.example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Mot de passe"), { target: { value: "EmployeePass123!" } });
  fireEvent.change(screen.getByPlaceholderText("Matricule"), { target: { value: "EMP-001" } });
  await user.click(screen.getByRole("button", { name: "Creer le collaborateur operationnel" }));

  expect(await screen.findByText("Paul Essama")).toBeInTheDocument();
  expect(screen.getByText("employee@hr-company.example.com")).toBeInTheDocument();
  expect(httpMock.lastRequest("POST", "/users")?.data?.operational_profile_code).toBe("chef_chantier");
});

test("utilisateurs: edition d'un collaborateur et rattachement a un service", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on(
    "GET",
    "/users",
    {
      data: {
        items: [
          {
            id: 402,
            first_name: "Luc",
            last_name: "Bika",
            email: "luc.bika@hr-company.example.com",
            job_title: "Magasinier",
            department: "Stock et logistique",
            account_status: "active",
            user_type: "employee",
            operational_profile_code: "magasinier",
            organization_unit_id: 902,
            organization_unit: { id: 902, name: "Stock et logistique", code: "SRV-STOCK", unit_type: "service" },
            roles: [{ id: 17, code: "magasinier", name: "Magasinier" }],
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    },
    {
      data: {
        items: [
          {
            id: 402,
            first_name: "Luc",
            last_name: "Bika",
            email: "luc.bika@hr-company.example.com",
            job_title: "Chef parc logistique",
            department: "Parc et equipements",
            account_status: "active",
            user_type: "employee",
            operational_profile_code: "magasinier",
            organization_unit_id: 903,
            organization_unit: { id: 903, name: "Parc et equipements", code: "SRV-PARC", unit_type: "service" },
            roles: [{ id: 17, code: "magasinier", name: "Magasinier" }],
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    }
  );
  httpMock.on("GET", "/users/operational-profiles", {
    data: {
      items: [
        {
          code: "magasinier",
          name: "Magasinier",
          definition: "Gere les stocks et mouvements.",
          linked_roles: [{ id: 17, code: "magasinier", name: "Magasinier", permissions: ["inventory.manage"] }],
          system_access: [{ module: "Stock", level: "Complet" }],
          missions: ["Tenir le stock"],
          feature_groups: [{ title: "Stock", items: ["Inventaire"] }],
          indicators: ["Ruptures"],
          controls: ["Validation"],
          default_assignment: {
            user_type: "employee",
            job_title: "Magasinier",
            department: "Stock et logistique",
            hierarchy_level: 3,
            organization_unit_id: 902,
          },
          default_role_ids: [17],
          default_organization_unit_id: 902,
          default_organization_unit: { id: 902, name: "Stock et logistique", code: "SRV-STOCK", unit_type: "service" },
        },
      ],
      interactions: [],
      access_matrix: [],
    },
  });
  httpMock.on("GET", "/users/organization-units", {
    data: {
      items: [
        { id: 902, code: "SRV-STOCK", name: "Stock et logistique", unit_type: "service", headcount: 1, parent_unit: null },
        { id: 903, code: "SRV-PARC", name: "Parc et equipements", unit_type: "service", headcount: 0, parent_unit: null },
      ],
      tree: [],
      count: 2,
    },
  });
  httpMock.on("GET", "/users/dashboard", {
    data: makeUsersDashboardPayload({
      users: {
        total: 1,
        active: 1,
        inactive: 0,
        by_job_title: { Magasinier: 1 },
        by_department: { "Stock et logistique": 1 },
        by_contract_type: {},
        by_user_type: { employee: 1 },
        by_account_status: { active: 1 },
      },
    }),
  });
  httpMock.on("PATCH", "/users/402", {
    status: 200,
    data: {
      user: {
        id: 402,
        first_name: "Luc",
        last_name: "Bika",
        email: "luc.bika@hr-company.example.com",
        job_title: "Chef parc logistique",
        department: "Parc et equipements",
      },
    },
  });

  const { user } = renderAppAt("/app/users", { session });

  expect(await screen.findByText("luc.bika@hr-company.example.com")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Modifier" }));

  const jobTitleInput = screen.getByPlaceholderText("Fonction");
  fireEvent.change(jobTitleInput, { target: { value: "Chef parc logistique" } });
  fireEvent.change(screen.getByLabelText("user-organization-unit"), { target: { value: "903" } });
  await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

  expect(httpMock.lastRequest("PATCH", "/users/402")?.data?.organization_unit_id).toBe(903);
  expect(httpMock.lastRequest("PATCH", "/users/402")?.data?.job_title).toBe("Chef parc logistique");

  const userCardTitle = await screen.findByText("luc.bika@hr-company.example.com");
  const userCard = userCardTitle.closest(".rounded-2xl");
  expect(userCard).not.toBeNull();
  expect(within(userCard).getByText(/Affectation: Parc et equipements/)).toBeInTheDocument();
});

test("utilisateurs: suspension, reinitialisation du mot de passe et forçage de deconnexion", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on(
    "GET",
    "/users",
    {
      data: {
        items: [
          {
            id: 403,
            first_name: "Claire",
            last_name: "Mvondo",
            email: "claire.mvondo@hr-company.example.com",
            job_title: "Assistante RH",
            department: "Ressources humaines",
            account_status: "active",
            user_type: "employee",
            employee_number: "EMP-403",
            login_identifier: "claire.mvondo",
            contract_type: "CDI",
            roles: [{ id: 21, code: "assistant_rh", name: "Assistante RH" }],
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    },
    {
      data: {
        items: [
          {
            id: 403,
            first_name: "Claire",
            last_name: "Mvondo",
            email: "claire.mvondo@hr-company.example.com",
            job_title: "Assistante RH",
            department: "Ressources humaines",
            account_status: "suspended",
            user_type: "employee",
            employee_number: "EMP-403",
            login_identifier: "claire.mvondo",
            contract_type: "CDI",
            roles: [{ id: 21, code: "assistant_rh", name: "Assistante RH" }],
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    }
  );
  httpMock.on("GET", "/users/operational-profiles", {
    data: {
      items: [],
      interactions: [],
      access_matrix: [],
    },
  });
  httpMock.on("GET", "/users/organization-units", {
    data: {
      items: [],
      tree: [],
      count: 0,
    },
  });
  httpMock.on(
    "GET",
    "/users/dashboard",
    {
      data: makeUsersDashboardPayload({
        users: {
          total: 1,
          active: 1,
          inactive: 0,
          by_job_title: { "Assistante RH": 1 },
          by_department: { "Ressources humaines": 1 },
          by_contract_type: { CDI: 1 },
          by_user_type: { employee: 1 },
          by_account_status: { active: 1 },
        },
      }),
    },
    {
      data: makeUsersDashboardPayload({
        users: {
          total: 1,
          active: 1,
          inactive: 0,
          by_job_title: { "Assistante RH": 1 },
          by_department: { "Ressources humaines": 1 },
          by_contract_type: { CDI: 1 },
          by_user_type: { employee: 1 },
          by_account_status: { active: 1 },
        },
      }),
    },
    {
      data: makeUsersDashboardPayload({
        users: {
          total: 1,
          active: 0,
          inactive: 0,
          by_job_title: { "Assistante RH": 1 },
          by_department: { "Ressources humaines": 1 },
          by_contract_type: { CDI: 1 },
          by_user_type: { employee: 1 },
          by_account_status: { suspended: 1 },
        },
        alerts: [{ type: "suspended_users", count: 1 }],
      }),
    }
  );
  httpMock.on("PATCH", "/users/403/status", {
    status: 200,
    data: {
      message: "Compte suspendu",
      user: {
        id: 403,
        account_status: "suspended",
      },
    },
  });
  httpMock.on("POST", "/users/403/reset-password", {
    status: 200,
    data: {
      message: "Mot de passe reinitialise",
      user: {
        id: 403,
        must_change_password: true,
      },
    },
  });
  httpMock.on("POST", "/users/403/force-logout", {
    status: 200,
    data: {
      message: "Sessions revoquees",
    },
  });

  const { user } = renderAppAt("/app/users", { session });

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Suspendre" })).toBeInTheDocument();
  }, { timeout: 5000 });

  const cardTitle = await screen.findByText("claire.mvondo@hr-company.example.com");
  let userCard = cardTitle.closest(".rounded-2xl");
  expect(userCard).not.toBeNull();

  await user.click(within(userCard).getByRole("button", { name: "Suspendre" }));

  expect(httpMock.lastRequest("PATCH", "/users/403/status")?.data).toMatchObject({
    account_status: "suspended",
    reason: "Suspended from personnel workspace",
  });

  expect(await screen.findByRole("button", { name: "Reactiver" })).toBeInTheDocument();

  userCard = (await screen.findByText("claire.mvondo@hr-company.example.com")).closest(".rounded-2xl");
  expect(userCard).not.toBeNull();
  await user.click(within(userCard).getByRole("button", { name: "Reinitialiser le mot de passe" }));

  const newPasswordInput = await screen.findByPlaceholderText("Entrez le nouveau mot de passe temporaire");
  fireEvent.change(newPasswordInput, { target: { value: "TempPass789!" } });

  const resetPanel = newPasswordInput.closest(".rounded-2xl");
  expect(resetPanel).not.toBeNull();
  await user.click(within(resetPanel).getByRole("button", { name: "Reinitialiser le mot de passe" }));

  expect(httpMock.lastRequest("POST", "/users/403/reset-password")?.data).toMatchObject({
    new_password: "TempPass789!",
    must_change_password: true,
  });

  userCard = (await screen.findByText("claire.mvondo@hr-company.example.com")).closest(".rounded-2xl");
  expect(userCard).not.toBeNull();
  await user.click(within(userCard).getByRole("button", { name: "Forcer la deconnexion" }));

  expect(httpMock.lastRequest("POST", "/users/403/force-logout")?.data).toEqual({});
});

test("stock: creation d'un article depuis l'interface", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on(
    "GET",
    "/inventory/support-data",
    {
      data: {
        items: [],
        locations: [],
        projects: [],
        tasks: [],
        users: [],
      },
    },
    {
      data: {
        items: [{ id: 501, sku: "CEM-001", name: "Ciment", unit: "bag", category: "material", available_quantity: 0, min_threshold: 0 }],
        locations: [],
        projects: [],
        tasks: [],
        users: [],
      },
    }
  );
  httpMock.on("GET", "/inventory/dashboard", {
    data: {
      summary: { tracked_items: 0, critical_items: 0, pending_validations: 0, stock_value: 0 },
      alerts: [],
      latest_entries: [],
      latest_exits: [],
      pending_operations: [],
    },
  });
  httpMock.on("GET", "/inventory/operations", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on("GET", "/inventory/inventories", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on("GET", "/inventory/reports/summary", {
    data: { valuation: [], consumption_by_project: [], losses_and_anomalies: [] },
  });
  httpMock.on("GET", "/inventory/activity", {
    data: { items: [], pagination: { page: 1, per_page: 15, total: 0, pages: 1 } },
  });
  httpMock.on("POST", "/inventory/items", {
    status: 201,
    data: {
      item: {
        id: 501,
        sku: "CEM-001",
        name: "Ciment",
        unit: "bag",
      },
    },
  });

  const { user } = renderAppAt("/app/inventory", { session });

  const skuInput = await screen.findByPlaceholderText("SKU");
  const createItemForm = skuInput.closest("form");
  expect(createItemForm).not.toBeNull();

  await user.type(within(createItemForm).getByPlaceholderText("SKU"), "CEM-001");
  await user.type(within(createItemForm).getByPlaceholderText("Nom article"), "Ciment");
  await user.clear(within(createItemForm).getByPlaceholderText("Unite"));
  await user.type(within(createItemForm).getByPlaceholderText("Unite"), "bag");
  await user.click(within(createItemForm).getByRole("button", { name: "Creer" }));

  expect(await screen.findByText("Ciment")).toBeInTheDocument();
  expect(screen.getByText(/CEM-001/)).toBeInTheDocument();
});

test("finance: creation d'une facture depuis l'interface", async () => {
  const session = makeCompanyAdminSession();

  httpMock.on("GET", "/auth/me", {
    data: {
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      user_type: session.user.user_type,
      preferred_language: session.user.preferred_language,
      company_id: session.user.company_id,
      permissions: session.user.permissions,
      roles: session.user.roles,
    },
  });
  httpMock.on("GET", "/finance/summary", {
    data: {
      totals: {
        revenues: 5000000,
        expenses: 3000000,
        margin: 2000000,
        outstanding: 1000000,
        invoiced: 1500000,
        collected: 500000,
      },
    },
  });
  httpMock.on("GET", "/finance/reports/dashboard", {
    data: {
      kpis: {
        cash_balance: 2500000,
        revenues_today: 0,
        expenses_today: 0,
        pending_invoices: 1,
      },
      alerts: [],
    },
  });
  httpMock.on("GET", "/finance/reports/project-profitability", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/reports/cash-flow", {
    data: { recent_movements: [] },
  });
  httpMock.on("GET", "/finance/reports/overdue-invoices", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/accounts", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/journals", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/partners", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/treasury-accounts", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/budgets", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/expenses", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/revenues", {
    data: { items: [] },
  });
  httpMock.on("GET", "/finance/payments", {
    data: { items: [] },
  });
  httpMock.on("GET", "/projects", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on(
    "GET",
    "/finance/invoices",
    { data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } } },
    {
      data: {
        items: [
          {
            id: 601,
            invoice_number: "FAC-001",
            customer_name: "Client Test",
            amount_total: 1500000,
            amount_due: 1000000,
            status: "partially_paid",
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      },
    }
  );
  httpMock.on("POST", "/finance/invoices", {
    status: 201,
    data: {
      invoice: {
        id: 601,
        invoice_number: "FAC-001",
      },
    },
  });

  const { user } = renderAppAt("/app/finance", { session });

  expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();

  const invoiceForm = screen.getByPlaceholderText("Nom du client").closest("form");
  expect(invoiceForm).not.toBeNull();

  fireEvent.change(within(invoiceForm).getByPlaceholderText("Nom du client"), { target: { value: "Client Test" } });
  fireEvent.change(within(invoiceForm).getByPlaceholderText(/Montant/), { target: { value: "1500000" } });
  const invoiceDateInputs = invoiceForm.querySelectorAll('input[type="date"]');
  expect(invoiceDateInputs.length).toBeGreaterThanOrEqual(2);
  fireEvent.change(invoiceDateInputs[0], { target: { value: "2026-01-10" } });
  fireEvent.change(invoiceDateInputs[1], { target: { value: "2026-01-31" } });
  await user.click(within(invoiceForm).getByRole("button", { name: "Creer la facture" }));

  expect(await screen.findByText("FAC-001")).toBeInTheDocument();
  await waitFor(() => {
    expect(httpMock.lastRequest("POST", "/finance/invoices")?.data?.customer_name).toBe("Client Test");
    expect(httpMock.lastRequest("POST", "/finance/invoices")?.data?.amount_total).toBe("1500000");
  });
});

test("marches publics: le juriste dispose d'une vue ciblee en lecture seule", async () => {
  const session = makeCompanyAdminSession({
    user: {
      user_type: "employee",
      permissions: ["procurement.read", "companies.read"],
      roles: [{ code: "juriste", name: "Juriste" }],
      operational_profile_code: "juriste",
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/procurement/summary", {
    data: {
      counts: {
        tenders: 3,
        submissions: 1,
        awarded: 0,
        lost: 0,
      },
    },
  });
  httpMock.on("GET", "/procurement/tenders", {
    data: {
      items: [
        {
          id: 610,
          reference: "DAO-2026-01",
          title: "Construction d'un centre de sante",
          contracting_authority: "Commune test",
          location: "Douala",
          status: "monitoring",
        },
      ],
    },
  });
  httpMock.on("GET", "/procurement/submissions", {
    data: {
      items: [
        {
          id: 810,
          tender_id: 610,
          status: "under_review",
          submission_amount: 25000000,
          notes: "Dossier en verification",
        },
      ],
    },
  });

  renderFeature(<ProcurementPage />, { session });

  expect(await screen.findByText("Espace juridique procurement")).toBeInTheDocument();
  expect(screen.getByText(/consultation sur les marches publics/i)).toBeInTheDocument();
  expect(screen.getByText(/Construction d'un centre de sante/)).toBeInTheDocument();
  expect(screen.queryByText("Nouveau marche")).not.toBeInTheDocument();
});

test("entreprises: le controleur externe voit une fiche audit en lecture seule", async () => {
  const session = makeCompanyAdminSession({
    user: {
      user_type: "external_controller",
      permissions: ["companies.read", "projects.read", "inventory.read", "finance.read", "procurement.read", "recruitment.read"],
      roles: [{ code: "controleur_externe", name: "Controleur externe" }],
      operational_profile_code: "controleur_externe",
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/companies/me", {
    data: {
      id: 42,
      legal_name: "Batimax SARL",
      trade_name: "Batimax",
      registration_number: "RC/DLA/2026/001",
      email: "contact@batimax.example.com",
      phone: "+237699000111",
      city: "Douala",
      country_code: "CM",
      activity_domain: "BTP",
      address_line: "Akwa",
      subscription_status: "active",
      settings: {
        contact_person_name: "Alice Ngono",
        contact_person_phone: "+237677000111",
        website_url: "https://batimax.example.com",
        default_language: "fr",
        currency: "XAF",
      },
      primary_admin: {
        email: "admin@batimax.example.com",
      },
      current_subscription: {
        status: "active",
        plan: { name: "Business" },
      },
    },
  });

  renderFeature(<CompaniesPage />, { session });

  expect(await screen.findByText(/Conformite entreprise/i)).toBeInTheDocument();
  expect(screen.getByText(/Documents administratifs a jour/i)).toBeInTheDocument();
  expect(screen.getByText("Lecture seule")).toBeInTheDocument();
  expect(screen.getAllByText("Batimax SARL").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Ajouter un document/i })).not.toBeInTheDocument();
});

test("recrutement: le candidat gere son profil et postule a une offre publiee", async () => {
  const session = makeCompanyAdminSession({
    user: {
      user_type: "job_seeker",
      permissions: ["recruitment.read"],
      roles: [{ code: "candidat_job_seeker", name: "Candidat" }],
      operational_profile_code: "candidat_job_seeker",
      department: "Parcours candidature",
      job_title: "Candidat",
      first_name: "Sarah",
      last_name: "Meka",
      email: "sarah.meka@example.com",
    },
  });

  httpMock.on("GET", "/auth/me", { data: { ...session.user } });
  httpMock.on("GET", "/recruitment/job-offers", {
    data: {
      items: [
        {
          id: 701,
          title: "Juriste marches",
          description: "Pilotage contractuel et controle des pieces DAO.",
          contract_type: "CDI",
          location: "Douala",
          status: "published",
        },
      ],
    },
  });
  httpMock.on(
    "GET",
    "/recruitment/candidate-profiles/me",
    { data: { candidate: null } },
    {
      data: {
        candidate: {
          id: 301,
          user_id: session.user.id,
          email: "sarah.meka@example.com",
          first_name: "Sarah",
          last_name: "Meka",
          phone: "+237690001122",
          city: "Douala",
          years_experience: 5,
          desired_position: "Juriste marches",
          skills_summary: "Conformite, contrats, preuves documentaires",
          availability_status: "immediate",
          cv_url: "https://cv.example.com/sarah-meka.pdf",
          profile_score: 100,
        },
      },
    }
  );
  httpMock.on(
    "GET",
    "/recruitment/applications/me",
    { data: { items: [], count: 0 } },
    {
      data: {
        items: [
          {
            id: 990,
            job_offer_id: 701,
            candidate_id: 301,
            status: "submitted",
            score: 82,
            job_offer: {
              id: 701,
              title: "Juriste marches",
              location: "Douala",
              contract_type: "CDI",
            },
          },
        ],
        count: 1,
      },
    }
  );
  httpMock.on("PUT", "/recruitment/candidate-profiles/me", {
    status: 200,
    data: {
      message: "Candidate profile saved",
    },
  });
  httpMock.on("POST", "/recruitment/job-offers/701/apply", {
    status: 201,
    data: {
      message: "Application submitted",
    },
  });

  const { user } = renderFeature(<RecruitmentPage />, { session });

  expect(await screen.findByText("Espace candidature")).toBeInTheDocument();
  expect(httpMock.lastRequest("GET", "/recruitment/job-offers")?.params).toEqual({ status: "published" });

  await user.clear(screen.getByPlaceholderText("Poste recherche"));
  await user.type(screen.getByPlaceholderText("Poste recherche"), "Juriste marches");
  await user.clear(screen.getByPlaceholderText("Annees d'experience"));
  await user.type(screen.getByPlaceholderText("Annees d'experience"), "5");
  await user.type(screen.getByPlaceholderText("Telephone"), "+237690001122");
  await user.type(screen.getByPlaceholderText("Lien CV"), "https://cv.example.com/sarah-meka.pdf");
  await user.type(screen.getByPlaceholderText("Competences et resume"), "Conformite, contrats, preuves documentaires");
  await user.click(screen.getByRole("button", { name: "Enregistrer mon profil" }));

  await waitFor(() => {
    expect(httpMock.lastRequest("PUT", "/recruitment/candidate-profiles/me")?.data).toMatchObject({
      desired_position: "Juriste marches",
      years_experience: "5",
      email: "sarah.meka@example.com",
    });
  });

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Postuler" })).not.toBeDisabled();
  });
  await user.click(screen.getByRole("button", { name: "Postuler" }));

  expect(await screen.findByRole("heading", { name: "Mes candidatures" })).toBeInTheDocument();
  expect((await screen.findAllByText("Juriste marches")).length).toBeGreaterThan(0);
  expect(httpMock.lastRequest("POST", "/recruitment/job-offers/701/apply")).not.toBeNull();
});
