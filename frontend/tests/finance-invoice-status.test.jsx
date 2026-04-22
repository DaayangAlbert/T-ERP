import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { FinancePage } from "@/features/finance/FinancePage";

function makeSession() {
  return {
    access_token: "access-finance-status",
    refresh_token: "refresh-finance-status",
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
    </MemoryRouter>
  );
}

describe("FinancePage invoice status", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("renders the consolidated dashboard KPI helpers and follow-up cards", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/finance/summary", {
      data: { totals: { revenues: 50000, expenses: 70000, margin: -20000, outstanding: 420000, invoiced: 420000, collected: 0 } },
    });
    httpMock.on("GET", "/finance/reports/dashboard", {
      data: {
        kpis: {
          revenue: 50000,
          expenses: 70000,
          profit: -20000,
          cash_balance: 180000,
          overdue_receivables: 300000,
          revenues_today: 50000,
          expenses_today: 70000,
          payments_incoming_today: 50000,
          payments_outgoing_today: 70000,
          net_cash_flow_today: -20000,
          pending_invoices: 2,
          outstanding_amount: 420000,
          overdue_invoice_count: 1,
          pending_expenses: 1,
          pending_expenses_amount: 120000,
          treasury_accounts_in_alert: 1,
          treasury_accounts_count: 1,
        },
        alerts: [
          { level: "high", code: "overdue_invoice", message: "1 facture(s) en retard", count: 1, amount: 300000 },
          { level: "medium", code: "pending_expense", message: "1 depense(s) en attente de validation", count: 1, amount: 120000 },
        ],
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
    httpMock.on("GET", "/finance/expenses", { data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } } });
    httpMock.on("GET", "/finance/revenues", { data: { items: [] } });
    httpMock.on("GET", "/finance/payments", { data: { items: [] } });
    httpMock.on("GET", "/projects", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });
    httpMock.on("GET", "/finance/invoices", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });

    renderFinancePage(session);

    expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();
    expect(screen.getByText("1 compte(s) en alerte")).toBeInTheDocument();
    expect(screen.getByText(/Encaissements/i)).toHaveTextContent("50");
    expect(screen.getByText(/Decaissements/i)).toHaveTextContent("70");
    expect(screen.getByText("1 en retard")).toBeInTheDocument();

    const outstandingCard = screen.getByText("Encours clients").closest("div");
    expect(outstandingCard).not.toBeNull();
    expect(outstandingCard).toHaveTextContent("420");
    expect(outstandingCard).toHaveTextContent("2 facture(s) ouvertes");

    const pendingExpenseCard = screen.getAllByText("Depenses a valider")[0].closest("div");
    expect(pendingExpenseCard).not.toBeNull();
    expect(pendingExpenseCard).toHaveTextContent("120");
    expect(pendingExpenseCard).toHaveTextContent("1 dossier(s) en attente");

    const overdueCard = screen.getByText("Retards clients").closest("div");
    expect(overdueCard).not.toBeNull();
    expect(overdueCard).toHaveTextContent("300");
    expect(overdueCard).toHaveTextContent("1 facture(s) en retard");
  });

  it("uses effective invoice status for display, keeps invoice creation statuses coherent and excludes cancelled invoices from payment selection", async () => {
    const session = makeSession();

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/finance/summary", {
      data: { totals: { revenues: 0, expenses: 0, margin: 0, outstanding: 300000, invoiced: 300000, collected: 0 } },
    });
    httpMock.on("GET", "/finance/reports/dashboard", {
      data: {
        kpis: {
          revenue: 0,
          expenses: 0,
          profit: 0,
          cash_balance: 1000000,
          overdue_receivables: 100000,
          revenues_today: 0,
          expenses_today: 0,
          pending_invoices: 1,
        },
        alerts: [],
        treasury: [],
      },
    });
    httpMock.on("GET", "/finance/reports/project-profitability", { data: { items: [] } });
    httpMock.on("GET", "/finance/reports/cash-flow", { data: { recent_movements: [], accounts: [], summary: {} } });
    httpMock.on("GET", "/finance/reports/tax-summary", { data: { summary: { output_vat_invoiced: 0, input_vat_deductible: 0 } } });
    httpMock.on("GET", "/finance/reports/overdue-invoices", {
      data: {
        items: [
          {
            id: 701,
            invoice_number: "FAC-OVER-001",
            customer_name: "Client Retard",
            amount_total: 100000,
            amount_paid: 0,
            amount_due: 100000,
            currency: "XAF",
            status: "sent",
            effective_status: "overdue",
            due_on: "2026-01-31",
            is_overdue: true,
            days_overdue: 10,
          },
        ],
      },
    });
    httpMock.on("GET", "/finance/notifications", { data: { items: [] } });
    httpMock.on("GET", "/finance/accounts", { data: { items: [] } });
    httpMock.on("GET", "/finance/journals", { data: { items: [] } });
    httpMock.on("GET", "/finance/partners", { data: { items: [] } });
    httpMock.on("GET", "/finance/treasury-accounts", { data: { items: [] } });
    httpMock.on("GET", "/finance/budgets", { data: { items: [] } });
    httpMock.on("GET", "/finance/expenses", { data: { items: [] } });
    httpMock.on("GET", "/finance/revenues", { data: { items: [] } });
    httpMock.on("GET", "/finance/payments", { data: { items: [] } });
    httpMock.on("GET", "/projects", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });
    httpMock.on("GET", "/finance/invoices", {
      data: {
        items: [
          {
            id: 701,
            invoice_number: "FAC-OVER-001",
            customer_name: "Client Retard",
            amount_total: 100000,
            subtotal_amount: 100000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 100000,
            currency: "XAF",
            status: "sent",
            effective_status: "overdue",
            due_on: "2026-01-31",
            issued_on: "2026-01-10",
            is_overdue: true,
          },
          {
            id: 702,
            invoice_number: "FAC-CAN-001",
            customer_name: "Client Annule",
            amount_total: 200000,
            subtotal_amount: 200000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 200000,
            currency: "XAF",
            status: "cancelled",
            effective_status: "cancelled",
            due_on: "2026-02-28",
            issued_on: "2026-02-01",
            is_overdue: false,
          },
          {
            id: 703,
            invoice_number: "FAC-DRF-001",
            customer_name: "Client Brouillon",
            amount_total: 180000,
            subtotal_amount: 180000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 180000,
            currency: "XAF",
            status: "draft",
            effective_status: "draft",
            due_on: "2026-01-05",
            issued_on: "2026-01-02",
            is_overdue: false,
          },
        ],
        pagination: { page: 1, per_page: 20, total: 3, pages: 1 },
      },
    });

    renderFinancePage(session);

    expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();
    expect((await screen.findAllByText("FAC-OVER-001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);

    const paymentForm = screen.getByText("Paiement recu").closest("form");
    expect(paymentForm).not.toBeNull();
    const paymentInvoiceSelect = within(paymentForm).getAllByRole("combobox")[0];
    const optionsText = within(paymentInvoiceSelect)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(optionsText.some((label) => String(label).includes("FAC-OVER-001"))).toBe(true);
    expect(optionsText.some((label) => String(label).includes("FAC-CAN-001"))).toBe(false);
    expect(optionsText.some((label) => String(label).includes("FAC-DRF-001"))).toBe(false);

    fireEvent.change(paymentInvoiceSelect, { target: { value: "701" } });
    expect(within(paymentForm).getByPlaceholderText("Montant")).toHaveValue(100000);
    const paymentContextLine = within(paymentForm).getAllByText((_, node) => {
      const text = node?.textContent || "";
      return node?.tagName === "P" && text.includes("Reste du") && text.includes("Overdue");
    })[0];
    expect(paymentContextLine).toHaveTextContent("100");

    const invoiceForm = screen.getByText("Facture").closest("form");
    expect(invoiceForm).not.toBeNull();
    const creationStatusSelect = within(invoiceForm).getAllByRole("combobox").at(-1);
    const creationStatuses = within(creationStatusSelect)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(creationStatuses).toEqual(expect.arrayContaining(["Draft", "Sent"]));
    expect(creationStatuses).not.toEqual(expect.arrayContaining(["Cancelled", "Partially Paid", "Paid", "Overdue"]));
  });

  it("posts an explicit send transition for draft invoices", async () => {
    const session = makeSession();
    const sendSpy = vi.fn(() => ({ status: 200, data: { invoice: { id: 701, status: "sent", effective_status: "sent" } } }));

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/finance/summary", {
      data: { totals: { revenues: 0, expenses: 0, margin: 0, outstanding: 200000, invoiced: 300000, collected: 100000 } },
    });
    httpMock.on("GET", "/finance/reports/dashboard", {
      data: {
        kpis: {
          revenue: 0,
          expenses: 0,
          profit: 0,
          cash_balance: 1000000,
          overdue_receivables: 0,
          revenues_today: 0,
          expenses_today: 0,
          pending_invoices: 1,
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
    httpMock.on("GET", "/finance/expenses", { data: { items: [] } });
    httpMock.on("GET", "/finance/revenues", { data: { items: [] } });
    httpMock.on("GET", "/finance/payments", { data: { items: [] } });
    httpMock.on("GET", "/projects", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });
    httpMock.on("GET", "/finance/invoices", {
      data: {
        items: [
          {
            id: 701,
            invoice_number: "FAC-DRAFT-002",
            customer_name: "Client Brouillon",
            amount_total: 120000,
            subtotal_amount: 120000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 120000,
            currency: "XAF",
            status: "draft",
            effective_status: "draft",
            due_on: "2026-05-31",
            issued_on: "2026-05-10",
            is_overdue: false,
          },
          {
            id: 702,
            invoice_number: "FAC-SENT-002",
            customer_name: "Client Envoye",
            amount_total: 180000,
            subtotal_amount: 180000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 180000,
            currency: "XAF",
            status: "sent",
            effective_status: "sent",
            due_on: "2099-05-31",
            issued_on: "2026-05-12",
            is_overdue: false,
          },
        ],
        pagination: { page: 1, per_page: 20, total: 2, pages: 1 },
      },
    });
    httpMock.on("POST", "/finance/invoices/701/send", sendSpy);

    renderFinancePage(session);

    expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer facture" }));

    await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1));
  });

  it("posts an explicit cancel transition for cancellable invoices", async () => {
    const session = makeSession();
    const cancelSpy = vi.fn(() => ({ status: 200, data: { invoice: { id: 702, status: "cancelled", effective_status: "cancelled" } } }));

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    httpMock.on("GET", "/finance/summary", {
      data: { totals: { revenues: 0, expenses: 0, margin: 0, outstanding: 200000, invoiced: 300000, collected: 100000 } },
    });
    httpMock.on("GET", "/finance/reports/dashboard", {
      data: {
        kpis: {
          revenue: 0,
          expenses: 0,
          profit: 0,
          cash_balance: 1000000,
          overdue_receivables: 0,
          revenues_today: 0,
          expenses_today: 0,
          pending_invoices: 1,
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
    httpMock.on("GET", "/finance/expenses", { data: { items: [] } });
    httpMock.on("GET", "/finance/revenues", { data: { items: [] } });
    httpMock.on("GET", "/finance/payments", { data: { items: [] } });
    httpMock.on("GET", "/projects", {
      data: { items: [], pagination: { page: 1, per_page: 20, total: 0, pages: 1 } },
    });
    httpMock.on("GET", "/finance/invoices", {
      data: {
        items: [
          {
            id: 701,
            invoice_number: "FAC-DRAFT-002",
            customer_name: "Client Brouillon",
            amount_total: 120000,
            subtotal_amount: 120000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 120000,
            currency: "XAF",
            status: "draft",
            effective_status: "draft",
            due_on: "2026-05-31",
            issued_on: "2026-05-10",
            is_overdue: false,
          },
          {
            id: 702,
            invoice_number: "FAC-SENT-002",
            customer_name: "Client Envoye",
            amount_total: 180000,
            subtotal_amount: 180000,
            tax_amount: 0,
            tax_rate: 0,
            amount_paid: 0,
            amount_due: 180000,
            currency: "XAF",
            status: "sent",
            effective_status: "sent",
            due_on: "2099-05-31",
            issued_on: "2026-05-12",
            is_overdue: false,
          },
        ],
        pagination: { page: 1, per_page: 20, total: 2, pages: 1 },
      },
    });
    httpMock.on("POST", "/finance/invoices/701/cancel", cancelSpy);
    httpMock.on("POST", "/finance/invoices/702/cancel", cancelSpy);

    renderFinancePage(session);

    expect(await screen.findByRole("heading", { name: "Gestion financiere" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Annuler facture" })[0]);

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledTimes(1));
  });
});
