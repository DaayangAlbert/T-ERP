import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/finance/FinancePage", () => ({
  FinancePage: () => <div>finance-real-page</div>,
}));

vi.mock("@/features/comptable/pages/ComptableFinancePage", () => ({
  ComptableFinancePage: () => <div>finance-prototype-page</div>,
}));

vi.mock("@/features/payroll/PayrollPage", () => ({
  PayrollPage: () => <div>payroll-real-page</div>,
}));

vi.mock("@/features/comptable/pages/ComptablePayrollPage", () => ({
  ComptablePayrollPage: () => <div>payroll-prototype-page</div>,
}));

vi.mock("@/features/chat/ChatPage", () => ({
  ChatPage: () => <div>chat-real-page</div>,
}));

vi.mock("@/features/magasinier/pages/MagasinierChatPage", () => ({
  MagasinierChatPage: () => <div>chat-prototype-page</div>,
}));

vi.mock("@/features/calls/CallsPage", () => ({
  CallsPage: () => <div>calls-real-page</div>,
}));

vi.mock("@/features/magasinier/pages/MagasinierCallsPage", () => ({
  MagasinierCallsPage: () => <div>calls-prototype-page</div>,
}));

import { FinanceEntryPage } from "@/features/finance/FinanceEntryPage";
import { PayrollEntryPage } from "@/features/payroll/PayrollEntryPage";
import { ChatEntryPage } from "@/features/chat/ChatEntryPage";
import { CallsEntryPage } from "@/features/calls/CallsEntryPage";

describe("role-aware entry pages", () => {
  it("opens the real finance module instead of the comptable prototype", () => {
    render(<FinanceEntryPage />);

    expect(screen.getByText("finance-real-page")).toBeInTheDocument();
    expect(screen.queryByText("finance-prototype-page")).not.toBeInTheDocument();
  });

  it("opens the real payroll module instead of the comptable payroll prototype", () => {
    render(<PayrollEntryPage />);

    expect(screen.getByText("payroll-real-page")).toBeInTheDocument();
    expect(screen.queryByText("payroll-prototype-page")).not.toBeInTheDocument();
  });

  it("opens the real chat module instead of the magasinier chat prototype", () => {
    render(<ChatEntryPage />);

    expect(screen.getByText("chat-real-page")).toBeInTheDocument();
    expect(screen.queryByText("chat-prototype-page")).not.toBeInTheDocument();
  });

  it("opens the real calls module instead of the magasinier calls prototype", () => {
    render(<CallsEntryPage />);

    expect(screen.getByText("calls-real-page")).toBeInTheDocument();
    expect(screen.queryByText("calls-prototype-page")).not.toBeInTheDocument();
  });
});
