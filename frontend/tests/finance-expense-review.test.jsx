import { fireEvent, render, screen } from "@testing-library/react";
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
          replies.map((reply) => normalizeReply(reply)),
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
import { FinancePage } from "@/features/finance/FinancePage";

function makeSession() {
  return {
    access_token: "access-finance-expense-review",
    refresh_token: "refresh-finance-expense-review",
    user: {
      id: 1,
      email: "finance.admin@example.com",
      first_name: "Finance",
      last_name: "Admin",
      user_type: "company_admin",
      company_id: 42,
      preferred_language: "fr",
      permissions: ["finance.read", "finance.manage"],
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
    },
  };
}

function renderFinancePage(session) {
  persistSession(session);
  return render(
    <MemoryRouter initialEntries={["/app/finance"]}>
      <AuthProvider>
        <FinancePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinancePage expense review queue", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("shows review actions only for pending expenses and posts a reject decision", async () => {
    const session = makeSession();
    const rejectSpy = vi.fn(() => ({
      status: 200,
      data: {
        expense: {
          id: 801,
          category: "Depense pending",
          amount: 100000,
          currency: "XAF",
          approval_status: "rejected",
          payment_status: "unpaid",
        },
      },
    }));

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/finance/summary", {
      data: { totals: { revenues: 0, expenses: 0, margin: 0, outstanding: 0, invoiced: 0, collected: 0 } },
    });
    httpMock.on("GET", "/finance/reports/dashboard", {
      data: {
        kpis: {
          revenue: 0,
          expenses: 0,
          profit: 0,
          cash_balance: 0,
          overdue_receivables: 0,
          revenues_today: 0,
          expenses_today: 0,
          pending_invoices: 0,
        },
        alerts: [],
        treasury: [],
      },
    });
    httpMock.on("GET", "/finance/reports/project-profitability", { data: { items: [] } });
    httpMock.on("GET", "/finance/reports/cash-flow", { data: { recent_movements: [], accounts: [], summary: {} } });
    httpMock.on("GET", "/finance/reports/tax-summary", { data: { summary: { output_vat_invoiced: 0, input_vat_deductible: 0 } } });
    httpMock.on("GET", "/finance/reports/overdue-invoices", { data: { items: [] } });
    httpMock.on("GET", "/finance/notifications", { data: { items: [] } });
    httpMock.on("GET", "/finance/accounts", { data: { items: [] } });
    httpMock.on("GET", "/finance/journals", { data: { items: [] } });
    httpMock.on("GET", "/finance/partners", { data: { items: [] } });
    httpMock.on("GET", "/finance/treasury-accounts", { data: { items: [] } });
    httpMock.on("GET", "/finance/budgets", { data: { items: [] } });
    httpMock.on("GET", "/finance/revenues", { data: { items: [] } });
    httpMock.on("GET", "/finance/invoices", { data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } } });
    httpMock.on("GET", "/finance/payments", { data: { items: [] } });
    httpMock.on("GET", "/projects", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });
    httpMock.on("GET", "/finance/expenses", {
      data: {
        items: [
          { id: 801, category: "Depense pending", amount: 100000, currency: "XAF", approval_status: "pending" },
          { id: 802, category: "Depense draft", amount: 120000, currency: "XAF", approval_status: "draft" },
          { id: 803, category: "Depense rejected", amount: 140000, currency: "XAF", approval_status: "rejected" },
        ],
        pagination: { page: 1, per_page: 20, total: 3, pages: 1 },
      },
    });
    httpMock.on("POST", "/finance/expenses/801/reject", rejectSpy);

    renderFinancePage(session);

    expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Valider depense" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Rejeter depense" }).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: "Rejeter depense" }));

    expect(rejectSpy).toHaveBeenCalledTimes(1);
  });
});
