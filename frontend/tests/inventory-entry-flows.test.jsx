import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import { InventoryEntryPage } from "@/features/inventory/InventoryEntryPage";

function makeSession(overrides = {}) {
  const { user: userOverrides = {}, ...sessionOverrides } = overrides;

  return {
    access_token: "access-inventory",
    refresh_token: "refresh-inventory",
    user: {
      id: 42,
      email: "stock.user@example.com",
      first_name: "Stock",
      last_name: "User",
      user_type: "employee",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["inventory.read"],
      roles: [],
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
      <MemoryRouter>
        <AuthProvider>{element}</AuthProvider>
      </MemoryRouter>
    ),
  };
}

function registerInventoryMocks(session) {
  httpMock.on("GET", "/auth/me", {
    data: { ...session.user },
  });
  httpMock.on("GET", "/inventory/support-data", {
    data: {
      items: [
        {
          id: 501,
          sku: "CEM-001",
          name: "Ciment",
          unit: "bag",
          category: "material",
          available_quantity: 120,
          reserved_quantity: 20,
          stock_value: 720000,
          average_unit_cost: 6000,
          alert_level: "normal",
          average_monthly_consumption: 45,
          suggested_purchase_quantity: 30,
        },
      ],
      locations: [
        {
          id: 61,
          code: "DEP-01",
          name: "Depot central",
          location_type: "main_warehouse",
          address: "Akwa",
        },
      ],
      projects: [{ id: 71, name: "Residence Palmier" }],
      tasks: [{ id: 91, project_id: 71, title: "Coffrage" }],
      users: [{ id: 111, full_name: "Marcel Etoa" }],
      enums: {},
    },
  });
  httpMock.on("GET", "/inventory/dashboard", {
    data: {
      summary: { tracked_items: 1, locations: 1, critical_items: 0, stock_value: 720000, pending_validations: 1, suggested_purchases: 1 },
      alerts: [],
      latest_entries: [],
      latest_exits: [],
      pending_operations: [
        {
          id: 801,
          status: "pending",
          operation_kind: "entry",
          operation_date: "2026-04-08",
          lines: [{ item: { name: "Ciment" }, quantity: 10 }],
        },
      ],
    },
  });
  httpMock.on("GET", "/inventory/operations", {
    data: {
      items: [
        {
          id: 801,
          status: "pending",
          operation_kind: "entry",
          operation_date: "2026-04-08",
          source_location: null,
          destination_location: { name: "Depot central" },
          lines: [{ item: { name: "Ciment" }, quantity: 10 }],
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on("GET", "/inventory/movements", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on("GET", "/inventory/allocations", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on("GET", "/inventory/inventories", {
    data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
  });
  httpMock.on("GET", "/inventory/reports/summary", {
    data: {
      valuation: [],
      consumption_by_project: [],
      losses_and_anomalies: [],
      inventories: [],
      stock_state: {
        total_stock_value: 720000,
        tracked_items: 1,
        by_category: [{ category: "material", items: 1, stock_value: 720000 }],
      },
    },
  });
  httpMock.on("GET", "/inventory/activity", {
    data: { items: [], pagination: { page: 1, per_page: 15, total: 0, pages: 1 } },
  });
}

beforeEach(() => {
  httpMock.reset();
  socketMock.disconnect.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

test("stock: le magasinier ouvre le module stock reel depuis l'entree inventory", async () => {
  const session = makeSession({
    user: {
      operational_profile_code: "magasinier",
      permissions: ["inventory.read", "inventory.manage"],
      roles: [{ code: "magasinier", name: "Magasinier" }],
    },
  });

  registerInventoryMocks(session);

  renderFeature(<InventoryEntryPage />, { session });

  expect(await screen.findByText("Gestion des stocks et mouvements")).toBeInTheDocument();
  expect(screen.getByText("Creer une entree, sortie ou transfert")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enregistrer l'operation" })).toBeEnabled();
});

test("stock: le comptable passe sur le module reel avec garde-fou lecture seule", async () => {
  const session = makeSession({
    user: {
      operational_profile_code: "comptable",
      permissions: ["inventory.read"],
      roles: [{ code: "comptable", name: "Comptable" }],
    },
  });

  registerInventoryMocks(session);

  const { user } = renderFeature(<InventoryEntryPage />, { session });

  expect(await screen.findByText(/Vous etes en consultation sur le stock/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sortie chantier" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Inventaire express" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Catalogue" }));
  const createItemForm = (await screen.findByPlaceholderText("SKU")).closest("form");
  expect(createItemForm).not.toBeNull();
  expect(within(createItemForm).getByRole("button", { name: "Creer" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Operations" }));
  expect(await screen.findByRole("button", { name: "Enregistrer l'operation" })).toBeDisabled();
});
