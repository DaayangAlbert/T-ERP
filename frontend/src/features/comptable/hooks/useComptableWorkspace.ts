import { startTransition, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { buildComptableWorkspaceSeed } from "@/features/comptable/data/mockComptableData";
import type {
  AttendanceDraftInput,
  AttendanceTrendPoint,
  ChargeSplitItem,
  ComptableWorkspaceData,
  LeaveRequestDraftInput,
  MonthlyFlowPoint,
  ProjectFinancePoint,
  Tone,
  TransactionDraftInput,
} from "@/features/comptable/types";

const STORAGE_PREFIX = "t-erp.comptable-workspace";
const TREND_LABELS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function formatMonthKey(date: string) {
  return String(date || "").slice(0, 7);
}

function diffDaysInclusive(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function deriveAttendanceStatus(arrivalTime?: string, departureTime?: string) {
  if (!arrivalTime && !departureTime) {
    return { status: "absent" as const, minutesLate: 0, overtimeHours: 0 };
  }

  const arrivalMinutes = arrivalTime
    ? Number(arrivalTime.split(":")[0] || 0) * 60 + Number(arrivalTime.split(":")[1] || 0)
    : 0;
  const departureMinutes = departureTime
    ? Number(departureTime.split(":")[0] || 0) * 60 + Number(departureTime.split(":")[1] || 0)
    : 0;

  const baselineArrival = 7 * 60 + 30;
  const baselineDeparture = 17 * 60 + 15;
  const minutesLate = Math.max(0, arrivalMinutes - baselineArrival);
  const overtimeHours = Math.max(0, departureMinutes - baselineDeparture) / 60;

  if (overtimeHours >= 1) {
    return { status: "overtime" as const, minutesLate, overtimeHours: Number(overtimeHours.toFixed(1)) };
  }
  if (minutesLate > 0) {
    return { status: "late" as const, minutesLate, overtimeHours: 0 };
  }
  return { status: "present" as const, minutesLate: 0, overtimeHours: Number(overtimeHours.toFixed(1)) };
}

function storageKey(user: any) {
  return `${STORAGE_PREFIX}.${user?.id || "anonymous"}`;
}

function normalizeWorkspace(user: any, payload?: Partial<ComptableWorkspaceData> | null): ComptableWorkspaceData {
  const seed = buildComptableWorkspaceSeed(user);
  const workspace = payload || {};
  const projects = Array.isArray(workspace.projects) ? workspace.projects : seed.projects;
  const selectedProjectId =
    workspace.selectedProjectId && projects.some((project) => project.id === workspace.selectedProjectId)
      ? workspace.selectedProjectId
      : projects[0]?.id || "";

  return {
    ...seed,
    ...workspace,
    currentUser: workspace.currentUser || seed.currentUser,
    scope: workspace.scope || seed.scope,
    selectedProjectId,
    personalPayrollProfile: workspace.personalPayrollProfile || seed.personalPayrollProfile,
    personalAttendanceSummary: workspace.personalAttendanceSummary || seed.personalAttendanceSummary,
    personalPayslips: Array.isArray(workspace.personalPayslips) ? workspace.personalPayslips : seed.personalPayslips,
    projects,
    workers: Array.isArray(workspace.workers) ? workspace.workers : seed.workers,
    proofs: Array.isArray(workspace.proofs) ? workspace.proofs : seed.proofs,
    transactions: Array.isArray(workspace.transactions) ? workspace.transactions : seed.transactions,
    payslips: Array.isArray(workspace.payslips) ? workspace.payslips : seed.payslips,
    attendance: Array.isArray(workspace.attendance) ? workspace.attendance : seed.attendance,
    stockItems: Array.isArray(workspace.stockItems) ? workspace.stockItems : seed.stockItems,
    stockMovements: Array.isArray(workspace.stockMovements) ? workspace.stockMovements : seed.stockMovements,
    notifications: Array.isArray(workspace.notifications) ? workspace.notifications : seed.notifications,
    inbox: Array.isArray(workspace.inbox) ? workspace.inbox : seed.inbox,
    leaveBalance: workspace.leaveBalance || seed.leaveBalance,
    leaveRequests: Array.isArray(workspace.leaveRequests) ? workspace.leaveRequests : seed.leaveRequests,
  };
}

function loadWorkspace(user: any): ComptableWorkspaceData {
  if (typeof window === "undefined") {
    return normalizeWorkspace(user);
  }

  const stored = window.localStorage.getItem(storageKey(user));
  if (!stored) {
    return normalizeWorkspace(user);
  }

  try {
    return normalizeWorkspace(user, JSON.parse(stored));
  } catch {
    return normalizeWorkspace(user);
  }
}

function buildMonthlyFlow(transactions: ComptableWorkspaceData["transactions"]): MonthlyFlowPoint[] {
  const monthMap = new Map<string, { inflow: number; outflow: number }>();

  transactions.forEach((record) => {
    const key = formatMonthKey(record.date);
    const current = monthMap.get(key) || { inflow: 0, outflow: 0 };
    if (record.direction === "in") {
      current.inflow += record.amount;
    } else {
      current.outflow += record.amount;
    }
    monthMap.set(key, current);
  });

  return [...monthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([key, value], index) => ({
      label: TREND_LABELS[index] || key,
      inflow: value.inflow,
      outflow: value.outflow,
      balance: value.inflow - value.outflow,
    }));
}

function buildProjectFinance(
  projects: ComptableWorkspaceData["projects"],
  transactions: ComptableWorkspaceData["transactions"],
): ProjectFinancePoint[] {
  return projects.map((project) => {
    const scopedTransactions = transactions.filter((record) => record.projectId === project.id);
    const expenses = scopedTransactions.filter((record) => record.direction === "out").reduce((sum, record) => sum + record.amount, 0);
    const revenues = scopedTransactions.filter((record) => record.direction === "in").reduce((sum, record) => sum + record.amount, 0);

    return {
      projectId: project.id,
      label: project.name,
      expenses,
      revenues,
      balance: revenues - expenses,
    };
  });
}

function buildChargeSplit(transactions: ComptableWorkspaceData["transactions"]): ChargeSplitItem[] {
  const tones: Tone[] = ["warning", "danger", "info", "success"];
  const categoryMap = new Map<string, number>();

  transactions
    .filter((record) => record.direction === "out")
    .forEach((record) => {
      categoryMap.set(record.category, (categoryMap.get(record.category) || 0) + record.amount);
    });

  return [...categoryMap.entries()].map(([label, amount], index) => ({
    label,
    amount,
    tone: tones[index % tones.length],
  }));
}

function buildAttendanceTrend(records: ComptableWorkspaceData["attendance"]): AttendanceTrendPoint[] {
  const dateMap = new Map<string, AttendanceTrendPoint>();

  records.forEach((record) => {
    const current =
      dateMap.get(record.date) || {
        label: record.date.slice(5).replace("-", "/"),
        present: 0,
        late: 0,
        absent: 0,
        overtime: 0,
      };

    if (record.status === "present") {
      current.present += 1;
    }
    if (record.status === "late") {
      current.late += 1;
    }
    if (record.status === "absent") {
      current.absent += 1;
    }
    if (record.status === "overtime") {
      current.present += 1;
      current.overtime += record.overtimeHours;
    }

    dateMap.set(record.date, current);
  });

  return [...dateMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([, value]) => value);
}

export function useComptableWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<ComptableWorkspaceData>(() => loadWorkspace(user));

  useEffect(() => {
    setWorkspace(loadWorkspace(user));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey(user), JSON.stringify(workspace));
  }, [user, workspace]);

  const selectedProject =
    workspace.projects.find((project) => project.id === workspace.selectedProjectId) || workspace.projects[0] || null;
  const scopedTransactions = selectedProject
    ? workspace.transactions.filter((record) => record.projectId === selectedProject.id)
    : workspace.transactions;
  const scopedAttendance = selectedProject
    ? workspace.attendance.filter((record) => record.projectId === selectedProject.id)
    : workspace.attendance;
  const scopedPayslips = selectedProject
    ? workspace.payslips.filter((payslip) => payslip.projectId === selectedProject.id)
    : workspace.payslips;
  const scopedStockItems = selectedProject
    ? workspace.stockItems.filter((item) => item.projectId === selectedProject.id)
    : workspace.stockItems;
  const scopedStockMovements = selectedProject
    ? workspace.stockMovements.filter((movement) => movement.projectId === selectedProject.id)
    : workspace.stockMovements;
  const visibleWorkers = selectedProject
    ? workspace.workers.filter((worker) => worker.projectId === selectedProject.id)
    : workspace.workers;
  const attendanceWorkers = visibleWorkers.filter((worker) => !worker.excludedFromAttendance);
  const monthlyFlow = buildMonthlyFlow(workspace.transactions);
  const projectFinance = buildProjectFinance(workspace.projects, workspace.transactions);
  const chargeSplit = buildChargeSplit(workspace.transactions);
  const attendanceTrend = buildAttendanceTrend(workspace.attendance);
  const inflow = workspace.transactions.filter((record) => record.direction === "in").reduce((sum, record) => sum + record.amount, 0);
  const outflow = workspace.transactions.filter((record) => record.direction === "out").reduce((sum, record) => sum + record.amount, 0);
  const totalBalance = inflow - outflow;
  const presentCount = workspace.attendance.filter((record) => record.status === "present" || record.status === "overtime").length;
  const lateCount = workspace.attendance.filter((record) => record.status === "late").length;
  const absenceCount = workspace.attendance.filter((record) => record.status === "absent").length;
  const overtimeHours = workspace.attendance.reduce((sum, record) => sum + record.overtimeHours, 0);
  const unreadMessages = workspace.inbox.reduce((sum, thread) => sum + thread.unreadCount, 0);
  const proofsById = Object.fromEntries(workspace.proofs.map((proof) => [proof.id, proof]));
  const workersById = Object.fromEntries(workspace.workers.map((worker) => [worker.id, worker]));
  const personalLatestPayslip = workspace.personalPayslips[0] || null;

  const setSelectedProjectId = (projectId: string) => {
    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        selectedProjectId: projectId,
      }));
    });
  };

  const createTransaction = (draft: TransactionDraftInput) => {
    if (!draft.projectId || !draft.proofNames.length) {
      return { ok: false, error: "Le projet et le justificatif sont obligatoires." };
    }

    startTransition(() => {
      setWorkspace((current) => {
        const createdAt = new Date().toISOString();
        const createdProofs = draft.proofNames.map((name) => ({
          id: nextId("proof"),
          name,
          kind: draft.type === "payment" && draft.linkedPayslipId ? "payslip" as const : draft.type === "expense" ? "invoice" as const : "receipt" as const,
          sizeLabel: "Nouveau fichier",
          uploadedAt: createdAt,
          uploadedBy: current.currentUser.displayName,
        }));

        const direction = draft.type === "revenue" ? "in" : "out";
        return {
          ...current,
          proofs: [...createdProofs, ...current.proofs],
          transactions: [
            {
              id: nextId("txn"),
              type: draft.type,
              direction,
              projectId: draft.projectId,
              title: draft.title,
              counterparty: draft.counterparty,
              category: draft.category,
              amount: Number(draft.amount || 0),
              method: draft.method,
              date: draft.date,
              status: "validated",
              proofIds: createdProofs.map((proof) => proof.id),
              note: draft.note,
              linkedPayslipId: draft.linkedPayslipId,
              employeeId: draft.employeeId,
            },
            ...current.transactions,
          ],
          payslips: current.payslips.map((payslip) =>
            payslip.id === draft.linkedPayslipId ? { ...payslip, status: "paid" } : payslip
          ),
          notifications: [
            {
              id: nextId("notif"),
              title:
                draft.type === "expense"
                  ? "Depense enregistree"
                  : draft.type === "revenue"
                    ? "Recette enregistree"
                    : "Paiement enregistre",
              description: `${draft.projectId} : ${draft.title}`,
              createdAt,
              tone: draft.type === "expense" ? "warning" : draft.type === "revenue" ? "success" : "info",
              module: "finance",
            },
            ...current.notifications,
          ].slice(0, 8),
        };
      });
    });

    return { ok: true };
  };

  const createAttendanceRecord = (draft: AttendanceDraftInput) => {
    const worker = workersById[draft.employeeId];
    if (!worker || worker.excludedFromAttendance) {
      return { ok: false, error: "Le directeur de projet n'est pas suivi dans les presences." };
    }

    const derived = draft.status === "absent"
      ? { status: "absent" as const, minutesLate: 0, overtimeHours: 0 }
      : deriveAttendanceStatus(draft.arrivalTime, draft.departureTime);

    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        attendance: [
          {
            id: nextId("att"),
            employeeId: worker.id,
            employeeName: worker.displayName,
            roleLabel: worker.roleLabel,
            projectId: draft.projectId,
            date: draft.date,
            arrivalTime: draft.status === "absent" ? undefined : draft.arrivalTime,
            departureTime: draft.status === "absent" ? undefined : draft.departureTime,
            status: draft.status || derived.status,
            overtimeHours: derived.overtimeHours,
            minutesLate: derived.minutesLate,
            notes: draft.notes,
          },
          ...current.attendance,
        ],
        notifications: [
          {
            id: nextId("notif"),
            title: draft.status === "absent" ? "Absence enregistree" : "Presence consolidee",
            description: `${worker.displayName} - ${draft.date}`,
            createdAt: new Date().toISOString(),
            tone: draft.status === "absent" ? "danger" : derived.status === "late" ? "warning" : "success",
            module: "attendance",
          },
          ...current.notifications,
        ].slice(0, 8),
      }));
    });

    return { ok: true };
  };

  const createLeaveRequest = (draft: LeaveRequestDraftInput) => {
    const requestedDays = diffDaysInclusive(draft.startDate, draft.endDate);

    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        leaveRequests: [
          {
            id: nextId("leave"),
            type: draft.type,
            startDate: draft.startDate,
            endDate: draft.endDate,
            reason: draft.reason,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...current.leaveRequests,
        ],
        leaveBalance: {
          ...current.leaveBalance,
          pendingDays: current.leaveBalance.pendingDays + requestedDays,
          lastRequestAt: new Date().toISOString(),
        },
      }));
    });

    return { ok: true };
  };

  return {
    workspace,
    selectedProject,
    scopedTransactions,
    scopedAttendance,
    scopedPayslips,
    scopedStockItems,
    scopedStockMovements,
    visibleWorkers,
    attendanceWorkers,
    proofsById,
    workersById,
    monthlyFlow,
    projectFinance,
    chargeSplit,
    attendanceTrend,
    personalLatestPayslip,
    totals: {
      inflow,
      outflow,
      totalBalance,
      presentCount,
      lateCount,
      absenceCount,
      overtimeHours,
      unreadMessages,
      proofsCount: workspace.proofs.length,
      payslipCount: workspace.payslips.length,
      personalPayslipCount: workspace.personalPayslips.length,
      stockValue: workspace.stockItems.reduce((sum, item) => sum + item.value, 0),
    },
    actions: {
      setSelectedProjectId,
      createTransaction,
      createAttendanceRecord,
      createLeaveRequest,
    },
  };
}

export type ComptableWorkspaceModel = ReturnType<typeof useComptableWorkspace>;
