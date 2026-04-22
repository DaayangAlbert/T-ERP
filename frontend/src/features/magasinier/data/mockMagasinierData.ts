import type {
  ConversationThread,
  FileAttachment,
  MagasinierProject,
  NotificationItem,
  ProjectContact,
  Signalement,
  StockItem,
  StockMovement,
  StockRequest,
  Tone,
} from "@/features/magasinier/types";
import {
  buildCurrentMagasinierUser,
  filterScopedContacts,
  filterScopedItems,
  filterScopedMovements,
  filterScopedNotifications,
  filterScopedProjects,
  filterScopedRequests,
  filterScopedSignalements,
  getAssignedProjectIds,
  MAGASINIER_SCOPE_FLAGS,
} from "@/features/magasinier/permissions";
import { formatFileSize, inferAttachmentKind } from "@/features/magasinier/utils/format";

function createAttachment(id: string, name: string, size = 240_000): FileAttachment {
  return {
    id,
    name,
    kind: inferAttachmentKind(name),
    sizeLabel: formatFileSize(size),
  };
}

const PROJECTS: MagasinierProject[] = [
  {
    id: "prj-bonanjo",
    code: "BON-24",
    name: "Residence Bonanjo",
    siteLabel: "Douala - Bonanjo",
    phaseLabel: "Second oeuvre",
    managerIds: [120, 121],
    status: "watch",
    progress: 71,
    stockCoverageDays: 12,
    managedStockUnits: 1840,
    criticalItems: 4,
    pendingRequests: 2,
    unreadMessages: 5,
    movementCount: 26,
  },
  {
    id: "prj-yassa",
    code: "YAS-11",
    name: "Base vie Yassa",
    siteLabel: "Douala - Yassa",
    phaseLabel: "Gros oeuvre",
    managerIds: [122],
    status: "active",
    progress: 54,
    stockCoverageDays: 21,
    managedStockUnits: 1230,
    criticalItems: 2,
    pendingRequests: 1,
    unreadMessages: 3,
    movementCount: 18,
  },
  {
    id: "prj-limbe",
    code: "LIM-08",
    name: "Depot Limbe",
    siteLabel: "Limbe - Down Beach",
    phaseLabel: "Preparation",
    managerIds: [123],
    status: "critical",
    progress: 19,
    stockCoverageDays: 7,
    managedStockUnits: 810,
    criticalItems: 6,
    pendingRequests: 4,
    unreadMessages: 8,
    movementCount: 11,
  },
];

const CONTACTS: ProjectContact[] = [
  {
    id: 11,
    displayName: "Alice Ngono",
    email: "alice.ngono@t-erp.demo",
    roleLabel: "Admin entreprise",
    roleCode: "admin",
    department: "Administration",
    projectIds: [],
    online: true,
    avatarTone: "info",
    phone: "+237 690 000 111",
    canReceiveCalls: true,
  },
  {
    id: 120,
    displayName: "Boris Tamo",
    email: "boris.tamo@t-erp.demo",
    roleLabel: "Responsable projet",
    roleCode: "project_manager",
    department: "Operations",
    projectIds: ["prj-bonanjo"],
    online: true,
    avatarTone: "warning",
    phone: "+237 691 000 120",
    canReceiveCalls: true,
  },
  {
    id: 121,
    displayName: "Clarisse Eboue",
    email: "clarisse.eboue@t-erp.demo",
    roleLabel: "Conductrice travaux",
    roleCode: "project_manager",
    department: "Operations",
    projectIds: ["prj-bonanjo"],
    online: false,
    avatarTone: "neutral",
    phone: "+237 691 000 121",
    canReceiveCalls: true,
  },
  {
    id: 122,
    displayName: "Cedric Meka",
    email: "cedric.meka@t-erp.demo",
    roleLabel: "Chef de projet",
    roleCode: "project_manager",
    department: "Operations",
    projectIds: ["prj-yassa"],
    online: true,
    avatarTone: "success",
    phone: "+237 691 000 122",
    canReceiveCalls: true,
  },
  {
    id: 123,
    displayName: "Rita Simo",
    email: "rita.simo@t-erp.demo",
    roleLabel: "Responsable projet",
    roleCode: "project_manager",
    department: "Operations",
    projectIds: ["prj-limbe"],
    online: true,
    avatarTone: "danger",
    phone: "+237 691 000 123",
    canReceiveCalls: true,
  },
];

const ITEMS: StockItem[] = [
  {
    id: "itm-cem-bon",
    projectId: "prj-bonanjo",
    sku: "CEM-042",
    name: "Ciment 42.5",
    category: "Materiaux",
    unit: "sacs",
    locationLabel: "Magasin central Bonanjo",
    onHand: 148,
    reserved: 54,
    minThreshold: 160,
    maxThreshold: 450,
    unitCost: 6200,
    monthlyUsage: 210,
    status: "critical",
    updatedAt: "2026-04-03T08:25:00.000Z",
  },
  {
    id: "itm-acier-bon",
    projectId: "prj-bonanjo",
    sku: "ACI-12",
    name: "Fer tor 12",
    category: "Armatures",
    unit: "barres",
    locationLabel: "Parc acier Bonanjo",
    onHand: 460,
    reserved: 130,
    minThreshold: 240,
    maxThreshold: 900,
    unitCost: 7800,
    monthlyUsage: 180,
    status: "healthy",
    updatedAt: "2026-04-03T09:12:00.000Z",
  },
  {
    id: "itm-gants-bon",
    projectId: "prj-bonanjo",
    sku: "EPI-GLV",
    name: "Gants de manutention",
    category: "EPI",
    unit: "paires",
    locationLabel: "Local EPI Bonanjo",
    onHand: 44,
    reserved: 20,
    minThreshold: 60,
    maxThreshold: 180,
    unitCost: 2400,
    monthlyUsage: 52,
    status: "watch",
    updatedAt: "2026-04-02T16:15:00.000Z",
  },
  {
    id: "itm-coffrage-yas",
    projectId: "prj-yassa",
    sku: "COF-MOD",
    name: "Panneaux de coffrage",
    category: "Materiaux",
    unit: "pieces",
    locationLabel: "Zone prefabrication Yassa",
    onHand: 92,
    reserved: 24,
    minThreshold: 60,
    maxThreshold: 140,
    unitCost: 45000,
    monthlyUsage: 26,
    status: "healthy",
    updatedAt: "2026-04-02T11:22:00.000Z",
  },
  {
    id: "itm-ciment-yas",
    projectId: "prj-yassa",
    sku: "CEM-052",
    name: "Ciment 52.5",
    category: "Materiaux",
    unit: "sacs",
    locationLabel: "Magasin Yassa",
    onHand: 190,
    reserved: 46,
    minThreshold: 170,
    maxThreshold: 400,
    unitCost: 6450,
    monthlyUsage: 156,
    status: "healthy",
    updatedAt: "2026-04-03T07:40:00.000Z",
  },
  {
    id: "itm-disque-yas",
    projectId: "prj-yassa",
    sku: "DISC-230",
    name: "Disques beton 230 mm",
    category: "Consommables",
    unit: "pieces",
    locationLabel: "Atelier Yassa",
    onHand: 18,
    reserved: 6,
    minThreshold: 26,
    maxThreshold: 90,
    unitCost: 6900,
    monthlyUsage: 24,
    status: "watch",
    updatedAt: "2026-04-01T13:55:00.000Z",
  },
  {
    id: "itm-casque-lim",
    projectId: "prj-limbe",
    sku: "EPI-HLM",
    name: "Casques chantier",
    category: "EPI",
    unit: "pieces",
    locationLabel: "Depot Limbe",
    onHand: 12,
    reserved: 8,
    minThreshold: 30,
    maxThreshold: 80,
    unitCost: 3900,
    monthlyUsage: 18,
    status: "critical",
    updatedAt: "2026-04-02T10:05:00.000Z",
  },
];

const MOVEMENTS: StockMovement[] = [
  {
    id: "mov-001",
    projectId: "prj-bonanjo",
    itemId: "itm-cem-bon",
    kind: "exit",
    quantity: 38,
    fromLabel: "Magasin central Bonanjo",
    toLabel: "Zone facade",
    actorName: "Luc Bika",
    note: "Dotation equipe facade A",
    requestedBy: "Boris Tamo",
    createdAt: "2026-04-03T08:35:00.000Z",
    statusLabel: "Valide",
  },
  {
    id: "mov-002",
    projectId: "prj-bonanjo",
    itemId: "itm-acier-bon",
    kind: "entry",
    quantity: 120,
    fromLabel: "Fournisseur Acier CM",
    toLabel: "Parc acier Bonanjo",
    actorName: "Luc Bika",
    note: "Reception bordereau BL-441",
    requestedBy: "Clarisse Eboue",
    createdAt: "2026-04-02T14:10:00.000Z",
    statusLabel: "Valide",
  },
  {
    id: "mov-003",
    projectId: "prj-yassa",
    itemId: "itm-ciment-yas",
    kind: "entry",
    quantity: 80,
    fromLabel: "Depot central",
    toLabel: "Magasin Yassa",
    actorName: "Luc Bika",
    note: "Renfort coulage dalle",
    requestedBy: "Cedric Meka",
    createdAt: "2026-04-02T11:45:00.000Z",
    statusLabel: "Valide",
  },
  {
    id: "mov-004",
    projectId: "prj-yassa",
    itemId: "itm-disque-yas",
    kind: "exit",
    quantity: 12,
    fromLabel: "Atelier Yassa",
    toLabel: "Equipe sciage",
    actorName: "Luc Bika",
    note: "Besoin urgent coffrage",
    requestedBy: "Cedric Meka",
    createdAt: "2026-04-01T14:25:00.000Z",
    statusLabel: "Valide",
  },
  {
    id: "mov-005",
    projectId: "prj-bonanjo",
    itemId: "itm-gants-bon",
    kind: "transfer",
    quantity: 24,
    fromLabel: "Local EPI Bonanjo",
    toLabel: "Base vie Yassa",
    actorName: "Luc Bika",
    note: "Transfert EPI inter-projets",
    requestedBy: "Alice Ngono",
    createdAt: "2026-03-31T16:00:00.000Z",
    statusLabel: "Transfere",
  },
  {
    id: "mov-006",
    projectId: "prj-limbe",
    itemId: "itm-casque-lim",
    kind: "exit",
    quantity: 10,
    fromLabel: "Depot Limbe",
    toLabel: "Equipe terrassement",
    actorName: "Merveille Bita",
    note: "Projet hors perimetre magasinier demo",
    requestedBy: "Rita Simo",
    createdAt: "2026-04-02T09:18:00.000Z",
    statusLabel: "Valide",
  },
];

const REQUESTS: StockRequest[] = [
  {
    id: "req-bon-01",
    projectId: "prj-bonanjo",
    itemName: "Ciment 42.5",
    quantity: 220,
    neededBy: "2026-04-05T09:00:00.000Z",
    requesterName: "Boris Tamo",
    title: "Reappro facade nord",
    statusLabel: "En attente validation",
    priority: "urgent",
  },
  {
    id: "req-bon-02",
    projectId: "prj-bonanjo",
    itemName: "Gants de manutention",
    quantity: 30,
    neededBy: "2026-04-06T11:00:00.000Z",
    requesterName: "Clarisse Eboue",
    title: "Renfort EPI equipe finition",
    statusLabel: "Prepare",
    priority: "medium",
  },
  {
    id: "req-yas-01",
    projectId: "prj-yassa",
    itemName: "Disques beton 230 mm",
    quantity: 18,
    neededBy: "2026-04-04T13:00:00.000Z",
    requesterName: "Cedric Meka",
    title: "Appro atelier sciage",
    statusLabel: "A traiter",
    priority: "high",
  },
  {
    id: "req-lim-01",
    projectId: "prj-limbe",
    itemName: "Casques chantier",
    quantity: 40,
    neededBy: "2026-04-06T07:30:00.000Z",
    requesterName: "Rita Simo",
    title: "Recompler kit securite",
    statusLabel: "A traiter",
    priority: "urgent",
  },
];

const SIGNALEMENTS: Signalement[] = [
  {
    id: "rep-bon-01",
    projectId: "prj-bonanjo",
    type: "rupture",
    title: "Seuil critique sur le ciment facade",
    description: "Le niveau disponible ne couvre plus les deux prochains coulage prevus.",
    priority: "urgent",
    status: "sent",
    createdAt: "2026-04-03T07:55:00.000Z",
    updatedAt: "2026-04-03T08:02:00.000Z",
    attachments: [createAttachment("att-bon-01", "photo-seuil-ciment.jpg", 420_000)],
  },
  {
    id: "rep-bon-02",
    projectId: "prj-bonanjo",
    type: "breakage",
    title: "Casse sur palette de carreaux",
    description: "17 pieces cassees a la reception, verification fournisseur en cours.",
    priority: "medium",
    status: "in_progress",
    createdAt: "2026-04-02T12:10:00.000Z",
    updatedAt: "2026-04-02T16:45:00.000Z",
    attachments: [createAttachment("att-bon-02", "constat-casse.pdf", 680_000)],
  },
  {
    id: "rep-yas-01",
    projectId: "prj-yassa",
    type: "replenishment",
    title: "Besoin anticipatif disques beton",
    description: "La consommation atelier augmente avant la phase de sciage intensif.",
    priority: "high",
    status: "received",
    createdAt: "2026-04-01T10:40:00.000Z",
    updatedAt: "2026-04-01T11:20:00.000Z",
    attachments: [createAttachment("att-yas-01", "atelier-yassa.mp4", 2_600_000)],
  },
  {
    id: "rep-lim-01",
    projectId: "prj-limbe",
    type: "loss",
    title: "Perte de lots EPI",
    description: "Signalement hors perimetre utile pour tester le filtrage strict.",
    priority: "high",
    status: "rejected",
    createdAt: "2026-04-01T08:15:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z",
    attachments: [],
  },
];

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-prj-bonanjo-01",
    title: "Rupture a traiter",
    description: "prj-bonanjo : ciment 42.5 sous le seuil mini.",
    createdAt: "2026-04-03T08:05:00.000Z",
    tone: "danger",
  },
  {
    id: "notif-prj-yassa-01",
    title: "Message admin non lu",
    description: "prj-yassa : Alice attend le point sur le transfert EPI.",
    createdAt: "2026-04-03T07:20:00.000Z",
    tone: "info",
  },
  {
    id: "notif-prj-bonanjo-02",
    title: "Demande a preparer",
    description: "prj-bonanjo : reappro facade nord a confirmer avant 10h.",
    createdAt: "2026-04-03T06:50:00.000Z",
    tone: "warning",
  },
  {
    id: "notif-prj-limbe-01",
    title: "Projet non affecte",
    description: "prj-limbe : ne doit jamais remonter dans l'espace magasinier.",
    createdAt: "2026-04-01T09:00:00.000Z",
    tone: "neutral",
  },
];

type ContactKey = "admin" | "bonanjoLead" | "bonanjoOps" | "yassaLead" | "limbeLead";

function resolveContactByKey(key: ContactKey, contacts: ProjectContact[]) {
  const idMap: Record<ContactKey, number> = {
    admin: 11,
    bonanjoLead: 120,
    bonanjoOps: 121,
    yassaLead: 122,
    limbeLead: 123,
  };

  return contacts.find((contact) => contact.id === idMap[key]);
}

function createConversation(
  currentUser: ReturnType<typeof buildCurrentMagasinierUser>,
  contacts: ProjectContact[],
  id: string,
  kind: ConversationThread["kind"],
  config: {
    title: string;
    description: string;
    participantKeys: ContactKey[];
    projectId?: string;
    unreadCount: number;
    lastActivityAt: string;
    messages: Array<{
      id: string;
      from: "current" | ContactKey;
      kind?: "text" | "image" | "video" | "document";
      content: string;
      createdAt: string;
      attachments?: FileAttachment[];
      readByCount?: number;
    }>;
  }
): ConversationThread {
  const contactMembers = config.participantKeys
    .map((key) => resolveContactByKey(key, contacts))
    .filter(Boolean);

  const members = [
    {
      id: currentUser.id,
      displayName: currentUser.displayName,
      roleLabel: currentUser.roleLabel,
      online: currentUser.online,
      avatarTone: "success" as Tone,
    },
    ...contactMembers.map((contact) => ({
      id: contact!.id,
      displayName: contact!.displayName,
      roleLabel: contact!.roleLabel,
      online: contact!.online,
      avatarTone: contact!.avatarTone,
    })),
  ];

  return {
    id,
    kind,
    projectId: config.projectId,
    title: config.title,
    description: config.description,
    participantIds: members.map((member) => member.id),
    members,
    unreadCount: config.unreadCount,
    lastActivityAt: config.lastActivityAt,
    messages: config.messages.map((message) => {
      const sender =
        message.from === "current" ? currentUser : resolveContactByKey(message.from, contacts);

      return {
        id: message.id,
        senderId: message.from === "current" ? currentUser.id : sender?.id || 0,
        senderName: message.from === "current" ? currentUser.displayName : sender?.displayName || "Equipe",
        senderRole: message.from === "current" ? currentUser.roleLabel : sender?.roleLabel || "Equipe",
        kind: message.kind || "text",
        content: message.content,
        createdAt: message.createdAt,
        attachments: message.attachments || [],
        readByCount: message.readByCount || members.length,
      };
    }),
  };
}

function buildConversations(
  currentUser: ReturnType<typeof buildCurrentMagasinierUser>,
  contacts: ProjectContact[],
  assignedProjectIds: string[]
) {
  const baseConversations = [
    createConversation(currentUser, contacts, "conv-admin", "private", {
      title: "Alice Ngono",
      description: "Admin entreprise",
      participantKeys: ["admin"],
      unreadCount: 2,
      lastActivityAt: "2026-04-03T08:20:00.000Z",
      messages: [
        {
          id: "msg-admin-01",
          from: "admin",
          content: "Je veux un point sur les seuils critiques avant 10h.",
          createdAt: "2026-04-03T08:05:00.000Z",
        },
        {
          id: "msg-admin-02",
          from: "current",
          content: "Je finalise le signalement Bonanjo et je te remonte le recap.",
          createdAt: "2026-04-03T08:10:00.000Z",
        },
        {
          id: "msg-admin-03",
          from: "admin",
          content: "Parfait. Ajoute aussi l'etat du transfert EPI vers Yassa.",
          createdAt: "2026-04-03T08:20:00.000Z",
          readByCount: 1,
        },
      ],
    }),
    createConversation(currentUser, contacts, "conv-bonanjo", "private", {
      title: "Boris Tamo",
      description: "Responsable Residence Bonanjo",
      projectId: "prj-bonanjo",
      participantKeys: ["bonanjoLead"],
      unreadCount: 1,
      lastActivityAt: "2026-04-03T07:58:00.000Z",
      messages: [
        {
          id: "msg-bon-01",
          from: "bonanjoLead",
          content: "Le coulage facade repart a 11h. As-tu le point exact sur le ciment ?",
          createdAt: "2026-04-03T07:50:00.000Z",
        },
        {
          id: "msg-bon-02",
          from: "current",
          content: "148 sacs disponibles, 220 demandes sur la prochaine rotation. Je lance le signalement.",
          createdAt: "2026-04-03T07:54:00.000Z",
        },
        {
          id: "msg-bon-03",
          from: "bonanjoLead",
          content: "Recu. Ajoute la photo du stock physique dans le message admin.",
          createdAt: "2026-04-03T07:58:00.000Z",
          readByCount: 1,
        },
      ],
    }),
    createConversation(currentUser, contacts, "conv-yassa-group", "group", {
      title: "Yassa - Stock et appro",
      description: "Groupe projet limite aux membres autorises",
      projectId: "prj-yassa",
      participantKeys: ["admin", "yassaLead"],
      unreadCount: 0,
      lastActivityAt: "2026-04-02T15:15:00.000Z",
      messages: [
        {
          id: "msg-yas-01",
          from: "yassaLead",
          content: "La phase de sciage commence demain, confirme-moi les disques disponibles.",
          createdAt: "2026-04-02T14:55:00.000Z",
        },
        {
          id: "msg-yas-02",
          from: "current",
          content: "Il reste 18 pieces. J'ai remonte un besoin anticipatif pour eviter la rupture.",
          createdAt: "2026-04-02T15:05:00.000Z",
        },
        {
          id: "msg-yas-03",
          from: "admin",
          content: "Merci. On passe la commande si le seuil critique est confirme.",
          createdAt: "2026-04-02T15:15:00.000Z",
        },
      ],
    }),
    createConversation(currentUser, contacts, "conv-limbe", "private", {
      title: "Rita Simo",
      description: "Projet hors affectation",
      projectId: "prj-limbe",
      participantKeys: ["limbeLead"],
      unreadCount: 4,
      lastActivityAt: "2026-04-02T09:10:00.000Z",
      messages: [
        {
          id: "msg-lim-01",
          from: "limbeLead",
          content: "Conversation qui doit etre filtree hors du perimetre magasinier.",
          createdAt: "2026-04-02T09:10:00.000Z",
        },
      ],
    }),
  ];

  return baseConversations.filter((conversation) => {
    if (!conversation.projectId) {
      return true;
    }

    return assignedProjectIds.includes(conversation.projectId);
  });
}

function buildCallHistory(conversations: ConversationThread[]) {
  return [
    {
      id: "call-bon-01",
      conversationId: "conv-bonanjo",
      projectId: "prj-bonanjo",
      mode: "audio",
      status: "ended",
      title: "Point stock facade Bonanjo",
      startedAt: "2026-04-02T16:10:00.000Z",
      durationMinutes: 8,
      participants: conversations.find((conversation) => conversation.id === "conv-bonanjo")?.members || [],
      micEnabled: true,
      cameraEnabled: false,
    },
    {
      id: "call-yas-01",
      conversationId: "conv-yassa-group",
      projectId: "prj-yassa",
      mode: "video",
      status: "missed",
      title: "Inspection visuelle atelier Yassa",
      startedAt: "2026-04-01T17:05:00.000Z",
      durationMinutes: 0,
      participants: conversations.find((conversation) => conversation.id === "conv-yassa-group")?.members || [],
      micEnabled: true,
      cameraEnabled: true,
    },
  ];
}

export function buildMagasinierWorkspaceSeed(user: any) {
  const assignedProjectIds = getAssignedProjectIds(user);
  const currentUser = buildCurrentMagasinierUser(user);
  const projects = filterScopedProjects(PROJECTS, assignedProjectIds);
  const items = filterScopedItems(ITEMS, assignedProjectIds);
  const movements = filterScopedMovements(MOVEMENTS, assignedProjectIds);
  const requests = filterScopedRequests(REQUESTS, assignedProjectIds);
  const signalements = filterScopedSignalements(SIGNALEMENTS, assignedProjectIds);
  const contacts = filterScopedContacts(CONTACTS, assignedProjectIds);
  const conversations = buildConversations(currentUser, contacts, assignedProjectIds);
  const notifications = filterScopedNotifications(NOTIFICATIONS, assignedProjectIds);
  const callHistory = buildCallHistory(conversations);

  return {
    currentUser,
    projects,
    items,
    movements,
    requests,
    signalements,
    contacts,
    conversations,
    notifications,
    callHistory,
    activeCall: null,
    selectedProjectId: projects[0]?.id || "",
    selectedConversationId: conversations[0]?.id || "",
    scope: MAGASINIER_SCOPE_FLAGS,
  };
}
