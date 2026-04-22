export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export type FinanceRecordType = "expense" | "revenue" | "payment";
export type FinanceDirection = "in" | "out";
export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "check";
export type ProofKind = "invoice" | "receipt" | "payslip" | "statement" | "other";
export type AttendanceStatus = "present" | "late" | "absent" | "overtime";
export type PayslipStatus = "draft" | "ready" | "paid";

export interface ComptableScopeFlags {
  canReadInventory: boolean;
  canManageInventory: boolean;
  canAccessProjects: boolean;
  canAccessCompanies: boolean;
  canAccessAdministration: boolean;
  allowedModules: string[];
}

export interface ComptableUserProfile {
  id: number;
  displayName: string;
  email: string;
  roleLabel: string;
  department: string;
  jobTitle: string;
  initials: string;
  online: boolean;
}

export interface PersonalPayrollProfile {
  employeeId: string;
  roleLabel: string;
  primaryProjectId: string;
  paymentMethodLabel: string;
  bankLabel: string;
  nextPaymentDate: string;
}

export interface PersonalAttendanceSummary {
  trackedMonth: string;
  lateCount: number;
  absenceCount: number;
  overtimeHours: number;
  delayedMinutes: number;
}

export interface ComptableProject {
  id: string;
  code: string;
  name: string;
  siteLabel: string;
  phaseLabel: string;
  managerName: string;
  progress: number;
  budget: number;
  spent: number;
  received: number;
  availableCash: number;
  workerCount: number;
}

export interface WorkerProfile {
  id: string;
  displayName: string;
  roleLabel: string;
  projectId: string;
  dailyRate: number;
  salaryNet: number;
  excludedFromAttendance?: boolean;
}

export interface ProofFile {
  id: string;
  name: string;
  kind: ProofKind;
  sizeLabel: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface FinanceRecord {
  id: string;
  type: FinanceRecordType;
  direction: FinanceDirection;
  projectId: string;
  title: string;
  counterparty: string;
  category: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: "validated" | "pending";
  proofIds: string[];
  note?: string;
  linkedPayslipId?: string;
  employeeId?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  roleLabel: string;
  projectId: string;
  monthKey: string;
  periodLabel: string;
  grossAmount: number;
  netAmount: number;
  overtimeHours: number;
  absenceDays: number;
  leaveDays: number;
  status: PayslipStatus;
  proofId: string;
  fileName?: string;
  paymentDate?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  roleLabel: string;
  projectId: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  status: AttendanceStatus;
  overtimeHours: number;
  minutesLate: number;
  notes?: string;
}

export interface StockItemSnapshot {
  id: string;
  projectId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  available: number;
  reserved: number;
  value: number;
  lastMovementAt: string;
}

export interface StockMovementSnapshot {
  id: string;
  projectId: string;
  itemName: string;
  kind: "entry" | "exit" | "transfer";
  quantity: number;
  unit: string;
  reference: string;
  actorName: string;
  note: string;
  date: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: Tone;
  module: "finance" | "attendance" | "payroll" | "inventory" | "chat";
}

export interface InboxThread {
  id: string;
  title: string;
  senderName: string;
  snippet: string;
  receivedAt: string;
  unreadCount: number;
  channelLabel: string;
  projectId?: string;
}

export interface LeaveBalance {
  remainingDays: number;
  approvedDays: number;
  pendingDays: number;
  lastRequestAt?: string;
}

export interface LeaveRequest {
  id: string;
  type: "paid_leave" | "permission" | "sick_leave";
  startDate: string;
  endDate: string;
  reason: string;
  status: "submitted" | "approved" | "pending";
  createdAt: string;
}

export interface MonthlyFlowPoint {
  label: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface AttendanceTrendPoint {
  label: string;
  present: number;
  late: number;
  absent: number;
  overtime: number;
}

export interface ProjectFinancePoint {
  projectId: string;
  label: string;
  expenses: number;
  revenues: number;
  balance: number;
}

export interface ChargeSplitItem {
  label: string;
  amount: number;
  tone: Tone;
}

export interface TransactionDraftInput {
  type: FinanceRecordType;
  projectId: string;
  title: string;
  counterparty: string;
  category: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  proofNames: string[];
  linkedPayslipId?: string;
  employeeId?: string;
}

export interface AttendanceDraftInput {
  employeeId: string;
  projectId: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface LeaveRequestDraftInput {
  type: "paid_leave" | "permission" | "sick_leave";
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ComptableWorkspaceData {
  currentUser: ComptableUserProfile;
  scope: ComptableScopeFlags;
  selectedProjectId: string;
  personalPayrollProfile: PersonalPayrollProfile;
  personalAttendanceSummary: PersonalAttendanceSummary;
  personalPayslips: Payslip[];
  projects: ComptableProject[];
  workers: WorkerProfile[];
  proofs: ProofFile[];
  transactions: FinanceRecord[];
  payslips: Payslip[];
  attendance: AttendanceRecord[];
  stockItems: StockItemSnapshot[];
  stockMovements: StockMovementSnapshot[];
  notifications: NotificationItem[];
  inbox: InboxThread[];
  leaveBalance: LeaveBalance;
  leaveRequests: LeaveRequest[];
}
