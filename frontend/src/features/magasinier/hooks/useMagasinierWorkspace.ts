import { startTransition, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { buildMagasinierWorkspaceSeed } from "@/features/magasinier/data/mockMagasinierData";
import type {
  CallMode,
  FileAttachment,
  GroupDraftInput,
  MagasinierWorkspaceData,
  MovementDraftInput,
  SignalementDraftInput,
  SignalementStatus,
  StockItem,
} from "@/features/magasinier/types";
import { formatCompactNumber, formatMoney, formatShortDate } from "@/features/magasinier/utils/format";

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function buildDashboardMetrics(workspace: MagasinierWorkspaceData) {
  const totalManagedStock = workspace.items.reduce((total, item) => total + item.onHand, 0);
  const criticalItems = workspace.items.filter((item) => item.onHand <= item.minThreshold).length;
  const recentEntries = workspace.movements.filter((movement) => movement.kind === "entry").length;
  const recentExits = workspace.movements.filter((movement) => movement.kind === "exit").length;

  return [
    {
      id: "projects",
      label: "Projets affectes",
      value: formatCompactNumber(workspace.projects.length),
      helper: "Seulement les chantiers rattaches a votre affectation",
      tone: "info" as const,
    },
    {
      id: "stock",
      label: "Stock total gere",
      value: formatCompactNumber(totalManagedStock),
      helper: `${workspace.items.length} articles suivis`,
      tone: "success" as const,
    },
    {
      id: "critical",
      label: "Articles critiques",
      value: formatCompactNumber(criticalItems),
      helper: "Sous seuil ou a surveiller immediatement",
      tone: criticalItems ? ("danger" as const) : ("success" as const),
    },
    {
      id: "movements",
      label: "Mouvements recents",
      value: formatCompactNumber(recentEntries + recentExits),
      helper: `${recentEntries} entrees / ${recentExits} sorties`,
      tone: "warning" as const,
    },
  ];
}

function buildMovementTrend(workspace: MagasinierWorkspaceData) {
  const buckets = [
    { label: "Lun", entries: 0, exits: 0 },
    { label: "Mar", entries: 0, exits: 0 },
    { label: "Mer", entries: 0, exits: 0 },
    { label: "Jeu", entries: 0, exits: 0 },
    { label: "Ven", entries: 0, exits: 0 },
    { label: "Sam", entries: 0, exits: 0 },
  ];

  workspace.movements.slice(0, 18).forEach((movement, index) => {
    const bucket = buckets[index % buckets.length];
    if (movement.kind === "entry") {
      bucket.entries += movement.quantity;
    }
    if (movement.kind === "exit" || movement.kind === "transfer") {
      bucket.exits += movement.quantity;
    }
  });

  return buckets;
}

function buildCategorySplit(items: StockItem[]) {
  const map = new Map<string, { quantity: number; tone: "info" | "success" | "warning" | "danger" }>();
  const tones = ["info", "success", "warning", "danger"] as const;

  items.forEach((item, index) => {
    const current = map.get(item.category) || { quantity: 0, tone: tones[index % tones.length] };
    current.quantity += item.onHand;
    map.set(item.category, current);
  });

  return [...map.entries()].map(([label, value]) => ({
    label,
    quantity: value.quantity,
    tone: value.tone,
  }));
}

function buildProjectConsumption(workspace: MagasinierWorkspaceData) {
  return workspace.projects.map((project, index) => ({
    projectId: project.id,
    label: project.name,
    quantity: workspace.movements
      .filter((movement) => movement.projectId === project.id && movement.kind !== "entry")
      .reduce((total, movement) => total + movement.quantity, 0),
    tone: (["warning", "info", "success"] as const)[index % 3],
  }));
}

function buildSharedFiles(conversation: MagasinierWorkspaceData["conversations"][number]) {
  return conversation.messages.flatMap((message) => message.attachments);
}

export function useMagasinierWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<MagasinierWorkspaceData>(() => buildMagasinierWorkspaceSeed(user));

  const selectedProject =
    workspace.projects.find((project) => project.id === workspace.selectedProjectId) || workspace.projects[0] || null;

  const selectedConversation =
    workspace.conversations.find((conversation) => conversation.id === workspace.selectedConversationId) ||
    workspace.conversations[0] ||
    null;

  const scopedItems = selectedProject
    ? workspace.items.filter((item) => item.projectId === selectedProject.id)
    : workspace.items;
  const scopedMovements = selectedProject
    ? workspace.movements.filter((movement) => movement.projectId === selectedProject.id)
    : workspace.movements;
  const scopedRequests = selectedProject
    ? workspace.requests.filter((request) => request.projectId === selectedProject.id)
    : workspace.requests;
  const scopedSignalements = selectedProject
    ? workspace.signalements.filter((signalement) => signalement.projectId === selectedProject.id)
    : workspace.signalements;

  const metrics = buildDashboardMetrics(workspace);
  const movementTrend = buildMovementTrend(workspace);
  const categorySplit = buildCategorySplit(workspace.items);
  const projectConsumption = buildProjectConsumption(workspace);
  const sharedFiles = selectedConversation ? buildSharedFiles(selectedConversation) : [];
  const totalStockValue = workspace.items.reduce((total, item) => total + item.onHand * item.unitCost, 0);
  const criticalItems = workspace.items.filter((item) => item.onHand <= item.minThreshold);

  const setSelectedProjectId = (projectId: string) => {
    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        selectedProjectId: projectId,
      }));
    });
  };

  const setSelectedConversationId = (conversationId: string) => {
    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        selectedConversationId: conversationId,
        conversations: current.conversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        ),
      }));
    });
  };

  const createMovement = (draft: MovementDraftInput) => {
    const item = workspace.items.find((entry) => entry.id === draft.itemId);
    const project = workspace.projects.find((entry) => entry.id === draft.projectId);

    if (!item || !project) {
      return;
    }

    startTransition(() => {
      setWorkspace((current) => {
        const createdAt = new Date().toISOString();
        let nextItems = current.items.map((entry) => {
          if (entry.id !== draft.itemId) {
            return entry;
          }

          const delta = draft.kind === "entry" ? draft.quantity : -draft.quantity;
          const onHand = Math.max(0, entry.onHand + delta);
          const status =
            onHand <= entry.minThreshold ? "critical" : onHand <= entry.minThreshold * 1.2 ? "watch" : "healthy";

          return {
            ...entry,
            onHand,
            status,
            updatedAt: createdAt,
          };
        });

        if (
          draft.kind === "transfer" &&
          draft.toLabel &&
          current.projects.some((entry) => entry.name === draft.toLabel || entry.id === draft.toLabel)
        ) {
          const targetProject =
            current.projects.find((entry) => entry.id === draft.toLabel) ||
            current.projects.find((entry) => entry.name === draft.toLabel);

          if (targetProject) {
            const existingTargetItem = current.items.find(
              (entry) => entry.projectId === targetProject.id && entry.sku === item.sku
            );

            if (existingTargetItem) {
              nextItems = nextItems.map((entry) =>
                entry.id === existingTargetItem.id
                  ? {
                      ...entry,
                      onHand: entry.onHand + draft.quantity,
                      updatedAt: createdAt,
                    }
                  : entry
              );
            } else {
              nextItems = [
                ...nextItems,
                {
                  ...item,
                  id: nextId("itm"),
                  projectId: targetProject.id,
                  locationLabel: "Depot recepteur",
                  onHand: draft.quantity,
                  reserved: 0,
                  updatedAt: createdAt,
                  status: "healthy",
                },
              ];
            }
          }
        }

        return {
          ...current,
          items: nextItems,
          movements: [
            {
              id: nextId("mov"),
              projectId: draft.projectId,
              itemId: draft.itemId,
              kind: draft.kind,
              quantity: draft.quantity,
              fromLabel: draft.fromLabel || item.locationLabel,
              toLabel: draft.toLabel || project.name,
              actorName: current.currentUser.displayName,
              note: draft.note,
              requestedBy: current.currentUser.displayName,
              createdAt,
              statusLabel: draft.kind === "transfer" ? "Transfere" : "Enregistre",
            },
            ...current.movements,
          ],
          notifications: [
            {
              id: nextId("notif"),
              title:
                draft.kind === "entry"
                  ? "Entree enregistree"
                  : draft.kind === "exit"
                    ? "Sortie enregistree"
                    : "Transfert enregistre",
              description: `${project.code} : ${item.name} - ${draft.quantity} ${item.unit}`,
              createdAt,
              tone: draft.kind === "entry" ? "success" : draft.kind === "exit" ? "warning" : "info",
            },
            ...current.notifications,
          ].slice(0, 8),
        };
      });
    });
  };

  const createSignalement = (draft: SignalementDraftInput, status: SignalementStatus) => {
    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        signalements: [
          {
            id: nextId("rep"),
            projectId: draft.projectId,
            type: draft.type,
            title: draft.title,
            description: draft.description,
            priority: draft.priority,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: draft.attachments,
          },
          ...current.signalements,
        ],
        notifications: [
          {
            id: nextId("notif"),
            title: status === "draft" ? "Brouillon enregistre" : "Signalement transmis",
            description: `${draft.title} - ${status === "draft" ? "brouillon" : "envoye a la hierarchie"}`,
            createdAt: new Date().toISOString(),
            tone: status === "draft" ? "neutral" : "warning",
          },
          ...current.notifications,
        ].slice(0, 8),
      }));
    });
  };

  const updateSignalementStatus = (signalementId: string, status: SignalementStatus) => {
    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        signalements: current.signalements.map((signalement) =>
          signalement.id === signalementId
            ? { ...signalement, status, updatedAt: new Date().toISOString() }
            : signalement
        ),
      }));
    });
  };

  const createGroupConversation = (draft: GroupDraftInput) => {
    const participants = workspace.contacts.filter((contact) => draft.participantIds.includes(contact.id));
    if (!participants.length) {
      return;
    }

    startTransition(() => {
      setWorkspace((current) => {
        const createdAt = new Date().toISOString();
        const conversationId = nextId("conv");
        return {
          ...current,
          selectedConversationId: conversationId,
          conversations: [
            {
              id: conversationId,
              kind: "group",
              projectId: draft.projectId,
              title: draft.title || "Nouveau groupe projet",
              description: "Groupe restreint aux membres autorises",
              participantIds: [current.currentUser.id, ...participants.map((participant) => participant.id)],
              members: [
                {
                  id: current.currentUser.id,
                  displayName: current.currentUser.displayName,
                  roleLabel: current.currentUser.roleLabel,
                  online: true,
                  avatarTone: "success",
                },
                ...participants.map((participant) => ({
                  id: participant.id,
                  displayName: participant.displayName,
                  roleLabel: participant.roleLabel,
                  online: participant.online,
                  avatarTone: participant.avatarTone,
                })),
              ],
              messages: [],
              unreadCount: 0,
              lastActivityAt: createdAt,
            },
            ...current.conversations,
          ],
        };
      });
    });
  };

  const sendMessage = (conversationId: string, content: string, attachments: FileAttachment[] = []) => {
    if (!content.trim() && !attachments.length) {
      return;
    }

    startTransition(() => {
      setWorkspace((current) => {
        const createdAt = new Date().toISOString();
        return {
          ...current,
          conversations: current.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const nextMessage = {
              id: nextId("msg"),
              senderId: current.currentUser.id,
              senderName: current.currentUser.displayName,
              senderRole: current.currentUser.roleLabel,
              kind: attachments[0]?.kind || "text",
              content: content.trim(),
              attachments,
              createdAt,
              readByCount: 1,
            };

            return {
              ...conversation,
              lastActivityAt: createdAt,
              messages: [...conversation.messages, nextMessage],
            };
          }),
        };
      });
    });
  };

  const startCall = (conversationId: string, mode: CallMode) => {
    const conversation = workspace.conversations.find((entry) => entry.id === conversationId);
    if (!conversation) {
      return;
    }

    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        activeCall: {
          id: nextId("call"),
          conversationId,
          projectId: conversation.projectId,
          mode,
          status: "ringing",
          title: mode === "audio" ? `Appel audio - ${conversation.title}` : `Visio - ${conversation.title}`,
          startedAt: new Date().toISOString(),
          durationMinutes: 0,
          participants: conversation.members,
          micEnabled: true,
          cameraEnabled: mode === "video",
        },
      }));
    });
  };

  const answerCall = () => {
    startTransition(() => {
      setWorkspace((current) =>
        current.activeCall
          ? {
              ...current,
              activeCall: {
                ...current.activeCall,
                status: "active",
                startedAt: new Date().toISOString(),
              },
            }
          : current
      );
    });
  };

  const toggleMic = () => {
    startTransition(() => {
      setWorkspace((current) =>
        current.activeCall
          ? {
              ...current,
              activeCall: {
                ...current.activeCall,
                micEnabled: !current.activeCall.micEnabled,
              },
            }
          : current
      );
    });
  };

  const toggleCamera = () => {
    startTransition(() => {
      setWorkspace((current) =>
        current.activeCall
          ? {
              ...current,
              activeCall: {
                ...current.activeCall,
                cameraEnabled: !current.activeCall.cameraEnabled,
              },
            }
          : current
      );
    });
  };

  const endCall = (status: "ended" | "missed" | "rejected" = "ended") => {
    startTransition(() => {
      setWorkspace((current) => {
        if (!current.activeCall) {
          return current;
        }

        return {
          ...current,
          callHistory: [
            {
              ...current.activeCall,
              status,
              durationMinutes: current.activeCall.status === "active" ? 5 : 0,
            },
            ...current.callHistory,
          ].slice(0, 10),
          activeCall: null,
        };
      });
    });
  };

  return {
    workspace,
    selectedProject,
    selectedConversation,
    scopedItems,
    scopedMovements,
    scopedRequests,
    scopedSignalements,
    sharedFiles,
    totalStockValue,
    criticalItems,
    metrics,
    movementTrend,
    categorySplit,
    projectConsumption,
    projectSummary: selectedProject
      ? {
          stockValue: formatMoney(scopedItems.reduce((total, item) => total + item.onHand * item.unitCost, 0)),
          latestMovementAt: scopedMovements[0]?.createdAt ? formatShortDate(scopedMovements[0].createdAt) : "Aucun mouvement",
          articleCount: scopedItems.length,
          pendingRequests: scopedRequests.length,
        }
      : null,
    actions: {
      setSelectedProjectId,
      setSelectedConversationId,
      createMovement,
      createSignalement,
      updateSignalementStatus,
      createGroupConversation,
      sendMessage,
      startCall,
      answerCall,
      toggleMic,
      toggleCamera,
      endCall,
    },
  };
}

export type MagasinierWorkspaceModel = ReturnType<typeof useMagasinierWorkspace>;
