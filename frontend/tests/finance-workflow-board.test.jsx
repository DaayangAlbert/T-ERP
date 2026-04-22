import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { httpMock, httpClientMock, socketMock } = vi.hoisted(() => {
  const routes = new Map();

  const keyFor = (method, url) => `${String(method || "GET").toUpperCase()} ${url}`;

  const normalizeReply = (reply) => {
    if (typeof reply === "function") return reply;
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
    socketMock: { disconnect: vi.fn() },
    httpMock: {
      reset() {
        routes.clear();
      },
      on(method, url, ...replies) {
        routes.set(keyFor(method, url), replies.map((reply) => normalizeReply(reply)));
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
    access_token: "access-finance-workflow",
    refresh_token: "refresh-finance-workflow",
    user: {
      id: 1,
      email: "daf@example.com",
      first_name: "Daf",
      last_name: "Finance",
      user_type: "company_admin",
      company_id: 42,
      operational_profile_code: "daf",
      preferred_language: "fr",
      permissions: ["finance.read", "finance.manage"],
      roles: ["daf", "company_admin"],
    },
  };
}

function seedFinancePageMocks() {
  httpMock.on("GET", "/finance/summary", {
    data: { totals: { revenues: 250000, expenses: 180000, margin: 70000, outstanding: 470000, invoiced: 470000, collected: 0, cash_balance: 900000 } },
  });
  httpMock.on("GET", "/finance/reports/dashboard", {
    data: {
      kpis: {
        revenue: 250000,
        expenses: 180000,
        profit: 70000,
        cash_balance: 900000,
        overdue_receivables: 320000,
        revenues_today: 250000,
        expenses_today: 180000,
        payments_incoming_today: 250000,
        payments_outgoing_today: 180000,
        net_cash_flow_today: 70000,
        pending_invoices: 2,
        pending_expenses: 1,
        pending_expenses_amount: 120000,
        outstanding_amount: 470000,
        overdue_invoice_count: 1,
        treasury_accounts_in_alert: 0,
        treasury_accounts_count: 1,
      },
      alerts: [],
      treasury: [],
    },
  });
  httpMock.on("GET", "/finance/reports/project-profitability", { data: { items: [] } });
  httpMock.on("GET", "/finance/reports/cash-flow", { data: { recent_movements: [], accounts: [], summary: {} } });
  httpMock.on("GET", "/finance/reports/tax-summary", { data: { summary: { output_vat_invoiced: 0, input_vat_deductible: 0, output_vat_collected: 0, net_vat_payable: 0 } } });
  httpMock.on("GET", "/finance/reports/overdue-invoices", { data: { items: [] } });
  httpMock.on("GET", "/finance/notifications", { data: { items: [] } });
  httpMock.on("GET", "/finance/accounts", { data: { items: [] } });
  httpMock.on("GET", "/finance/journals", { data: { items: [] } });
  httpMock.on("GET", "/finance/partners", {
    data: {
      items: [
        { id: 501, partner_type: "supplier", legal_name: "Fournisseur Workflow" },
        { id: 601, partner_type: "customer", legal_name: "Client Workflow" },
      ],
    },
  });
  httpMock.on("GET", "/finance/treasury-accounts", {
    data: { items: [{ id: 301, name: "Banque principale", account_type: "bank", current_balance: 900000, alert_threshold: 50000, currency: "XAF" }] },
  });
  httpMock.on("GET", "/finance/budgets", { data: { items: [] } });
  httpMock.on("GET", "/finance/expenses", {
    data: {
      items: [
        {
          id: 801,
          expense_number: "DEP-801",
          category: "Achat ciment",
          amount: 120000,
          amount_due: 120000,
          paid_amount: 0,
          currency: "XAF",
          approval_status: "pending",
          payment_status: "unpaid",
          project_name: "Chantier A",
          partner_name: "Fournisseur Workflow",
        },
        {
          id: 810,
          expense_number: "DEP-810",
          category: "Location engin",
          amount: 200000,
          amount_due: 80000,
          paid_amount: 120000,
          currency: "XAF",
          approval_status: "approved",
          payment_status: "partial",
          project_name: "Chantier A",
          partner_name: "Fournisseur Workflow",
          treasury_account_id: 301,
        },
      ],
      pagination: { page: 1, per_page: 20, total: 2, pages: 1 },
    },
  });
  httpMock.on("GET", "/finance/revenues", {
    data: {
      items: [
        {
          id: 910,
          revenue_number: "REV-910",
          revenue_type: "Acompte client",
          amount: 200000,
          amount_due: 150000,
          collected_amount: 50000,
          currency: "XAF",
          collection_status: "partial",
          partner_id: 601,
          treasury_account_id: 301,
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
    },
  });
  httpMock.on("GET", "/finance/invoices", {
    data: {
      items: [
        {
          id: 701,
          invoice_number: "FAC-701",
          customer_name: "Client Workflow",
          amount_total: 320000,
          amount_paid: 60000,
          amount_due: 260000,
          currency: "XAF",
          status: "sent",
          effective_status: "overdue",
          due_on: "2026-03-30",
          issued_on: "2026-03-01",
        },
        {
          id: 702,
          invoice_number: "FAC-702",
          customer_name: "Client Workflow",
          amount_total: 150000,
          amount_paid: 0,
          amount_due: 150000,
          currency: "XAF",
          status: "sent",
          effective_status: "sent",
          due_on: "2026-05-30",
          issued_on: "2026-05-01",
        },
      ],
      pagination: { page: 1, per_page: 20, total: 2, pages: 1 },
    },
  });
  httpMock.on("GET", "/finance/payments", {
    data: {
      items: [
        {
          id: 990,
          expense_id: 810,
          payment_direction: "outgoing",
          payment_method: "bank_transfer",
          payment_date: "2026-03-18",
          amount: 120000,
          currency: "XAF",
          external_reference: "REG-DEP-810",
          status: "posted",
        },
        {
          id: 991,
          revenue_id: 910,
          payment_direction: "incoming",
          payment_method: "bank_transfer",
          payment_date: "2026-03-22",
          amount: 50000,
          currency: "XAF",
          external_reference: "ENC-REV-910",
          status: "posted",
        },
        {
          id: 992,
          invoice_id: 701,
          payment_direction: "incoming",
          payment_method: "bank_transfer",
          payment_date: "2026-03-21",
          amount: 60000,
          currency: "XAF",
          external_reference: "ENC-FAC-701",
          status: "posted",
        },
      ],
    },
  });
  httpMock.on("GET", "/projects", { data: { items: [{ id: 1001, name: "Chantier A" }], pagination: { page: 1, per_page: 20, total: 1, pages: 1 } } });
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

describe("FinancePage workflow board", () => {
  beforeEach(() => {
    httpMock.reset();
    localStorage.clear();
  });

  it("renders the visible workflow board with approval and settlement queues", async () => {
    const session = makeSession();
    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    seedFinancePageMocks();

    renderFinancePage(session);

    expect(await screen.findByText("Centre d'approbation et de suivi")).toBeInTheDocument();
    expect(screen.getAllByText("Depenses a valider").length).toBeGreaterThan(0);
    expect(screen.getByText("Depenses a regler")).toBeInTheDocument();
    expect(screen.getByText("Recettes a encaisser")).toBeInTheDocument();
    expect(screen.getByText("Factures a relancer")).toBeInTheDocument();
    expect(screen.getByText("Reglements fournisseurs")).toBeInTheDocument();
    expect(screen.getByText("Recouvrements clients")).toBeInTheDocument();
  });

  it("prepares workflow forms from the board and submits expense settlement and revenue collection from the finance screen", async () => {
    const session = makeSession();
    const expensePaymentSpy = vi.fn(() => ({ status: 201, data: { expense: { id: 810, payment_status: "paid" } } }));
    const revenueCollectionSpy = vi.fn(() => ({ status: 201, data: { revenue: { id: 910, collection_status: "collected" } } }));

    httpMock.on("GET", "/auth/me", { data: { ...session.user } });
    seedFinancePageMocks();
    httpMock.on("POST", "/finance/expenses/810/payments", expensePaymentSpy);
    httpMock.on("POST", "/finance/revenues/910/payments", revenueCollectionSpy);

    renderFinancePage(session);

    expect(await screen.findByText("Reglement depense")).toBeInTheDocument();

    const expenseCard = screen.getByText("DEP-810").closest("div");
    fireEvent.click(within(expenseCard).getByRole("button", { name: "Preparer le reglement" }));
    const expenseSettlementForm = screen.getByText("Reglement depense").closest("form");
    expect(within(expenseSettlementForm).getByPlaceholderText("Montant")).toHaveValue(80000);
    expect(within(expenseSettlementForm).getByText("REG-DEP-810")).toBeInTheDocument();
    fireEvent.click(within(expenseSettlementForm).getByRole("button", { name: "Enregistrer le reglement" }));

    await waitFor(() => expect(expensePaymentSpy).toHaveBeenCalledTimes(1));

    const revenueCard = screen.getByText("REV-910").closest("div");
    fireEvent.click(within(revenueCard).getByRole("button", { name: "Preparer l'encaissement" }));
    const revenueCollectionForm = screen.getByText("Encaissement recette").closest("form");
    expect(within(revenueCollectionForm).getByPlaceholderText("Montant")).toHaveValue(150000);
    expect(within(revenueCollectionForm).getByText("ENC-REV-910")).toBeInTheDocument();
    fireEvent.click(within(revenueCollectionForm).getByRole("button", { name: "Enregistrer l'encaissement" }));

    await waitFor(() => expect(revenueCollectionSpy).toHaveBeenCalledTimes(1));

    const invoiceCard = screen.getByText("FAC-701").closest("div");
    fireEvent.click(within(invoiceCard).getByRole("button", { name: "Encaisser" }));

    const paymentForm = screen.getByText("Paiement recu").closest("form");
    expect(within(paymentForm).getByPlaceholderText("Montant")).toHaveValue(260000);
    expect(within(paymentForm).getByText("ENC-FAC-701")).toBeInTheDocument();
  });
});
