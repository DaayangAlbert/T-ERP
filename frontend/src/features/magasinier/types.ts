export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export type ProjectStatus = "active" | "watch" | "critical";
export type StockStatus = "healthy" | "watch" | "critical";
export type MovementKind = "entry" | "exit" | "transfer";
export type SignalementStatus = "draft" | "sent" | "received" | "in_progress" | "resolved" | "rejected";
export type SignalementType = "rupture" | "anomaly" | "loss" | "breakage" | "replenishment" | "urgent";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type AttachmentKind = "image" | "video" | "document";
export type MessageKind = "text" | "image" | "video" | "document";
export type ConversationKind = "private" | "group";
export type CallMode = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "rejected";

export interface MagasinierUserProfile {
  id: number;
  displayName: string;
  email: string;
  roleLabel: string;
  department: string;
  jobTitle: string;
  online: boolean;
  initials: string;
}

export interface ProjectContact {
  id: number;
  displayName: string;
  email: string;
  roleLabel: string;
  roleCode: string;
  department: string;
  projectIds: string[];
  online: boolean;
  avatarTone: Tone;
  phone: string;
  canReceiveCalls: boolean;
}

export interface MagasinierProject {
  id: string;
  code: string;
  name: string;
  siteLabel: string;
  phaseLabel: string;
  managerIds: number[];
  status: ProjectStatus;
  progress: number;
  stockCoverageDays: number;
  managedStockUnits: number;
  criticalItems: number;
  pendingRequests: number;
  unreadMessages: number;
  movementCount: number;
}

export interface StockItem {
  id: string;
  projectId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  locationLabel: string;
  onHand: number;
  reserved: number;
  minThreshold: number;
  maxThreshold: number;
  unitCost: number;
  monthlyUsage: number;
  status: StockStatus;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  projectId: string;
  itemId: string;
  kind: MovementKind;
  quantity: number;
  fromLabel: string;
  toLabel: string;
  actorName: string;
  note: string;
  requestedBy: string;
  createdAt: string;
  statusLabel: string;
}

export interface StockRequest {
  id: string;
  projectId: string;
  itemName: string;
  quantity: number;
  neededBy: string;
  requesterName: string;
  title: string;
  statusLabel: string;
  priority: PriorityLevel;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: Tone;
}

export interface FileAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  sizeLabel: string;
  previewUrl?: string;
}

export interface Signalement {
  id: string;
  projectId: string;
  type: SignalementType;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: SignalementStatus;
  createdAt: string;
  updatedAt: string;
  attachments: FileAttachment[];
}

export interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  kind: MessageKind;
  content: string;
  attachments: FileAttachment[];
  createdAt: string;
  readByCount: number;
}

export interface ConversationMember {
  id: number;
  displayName: string;
  roleLabel: string;
  online: boolean;
  avatarTone: Tone;
}

export interface ConversationThread {
  id: string;
  kind: ConversationKind;
  projectId?: string;
  title: string;
  description: string;
  participantIds: number[];
  members: ConversationMember[];
  messages: ChatMessage[];
  unreadCount: number;
  lastActivityAt: string;
}

export interface CallSession {
  id: string;
  conversationId?: string;
  projectId?: string;
  mode: CallMode;
  status: CallStatus;
  title: string;
  startedAt: string;
  durationMinutes: number;
  participants: ConversationMember[];
  micEnabled: boolean;
  cameraEnabled: boolean;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}

export interface MovementTrendPoint {
  label: string;
  entries: number;
  exits: number;
}

export interface CategorySplit {
  label: string;
  quantity: number;
  tone: Tone;
}

export interface ProjectConsumption {
  projectId: string;
  label: string;
  quantity: number;
  tone: Tone;
}

export interface MagasinierScopeFlags {
  canViewGlobalProjects: false;
  canAccessAdminSettings: false;
  canViewFinance: false;
  canMessageOnlyScopedUsers: true;
  canManageProjectStock: true;
}

export interface MagasinierWorkspaceData {
  currentUser: MagasinierUserProfile;
  projects: MagasinierProject[];
  items: StockItem[];
  movements: StockMovement[];
  requests: StockRequest[];
  signalements: Signalement[];
  contacts: ProjectContact[];
  conversations: ConversationThread[];
  notifications: NotificationItem[];
  callHistory: CallSession[];
  activeCall: CallSession | null;
  selectedProjectId: string;
  selectedConversationId: string;
  scope: MagasinierScopeFlags;
}

export interface MovementDraftInput {
  projectId: string;
  itemId: string;
  kind: MovementKind;
  quantity: number;
  note: string;
  fromLabel: string;
  toLabel: string;
}

export interface SignalementDraftInput {
  projectId: string;
  type: SignalementType;
  title: string;
  description: string;
  priority: PriorityLevel;
  attachments: FileAttachment[];
}

export interface GroupDraftInput {
  title: string;
  projectId: string;
  participantIds: number[];
}
