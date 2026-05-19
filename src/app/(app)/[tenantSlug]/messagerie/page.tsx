"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { clsx } from "clsx";
import { MessageSquare } from "lucide-react";
import { useConversations, useCreateConversation } from "@/hooks/useMessaging";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ConversationView } from "@/components/messaging/ConversationView";
import { NewChatModal } from "@/components/messaging/NewChatModal";
import { useProfile } from "@/hooks/useProfile";

// Cadres qui peuvent créer des groupes (aligné avec src/lib/rbac/messaging-access.ts)
const CADRE_ROLES = new Set([
  "DG",
  "DAF",
  "HR",
  "SECRETARY_GENERAL",
  "TECH_DIRECTOR",
  "WORKS_DIRECTOR",
  "WORKS_MANAGER",
  "SITE_MANAGER",
  "ACCOUNTANT",
  "TENANT_ADMIN",
]);

export default function MessageriePage() {
  const { data, isLoading } = useConversations();
  const { data: profile } = useProfile();
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const dmTargetUserId = searchParams.get("dm");
  const callTargetUserId = searchParams.get("call");
  const create = useCreateConversation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [pendingCallStartFor, setPendingCallStartFor] = useState<string | null>(null);
  const processedDmRef = useRef<string | null>(null);

  // Auto-select first conversation on desktop once loaded
  useEffect(() => {
    if (!activeId && data?.items.length && !dmTargetUserId && !callTargetUserId) {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) setActiveId(data.items[0].id);
    }
  }, [data?.items, activeId, dmTargetUserId, callTargetUserId]);

  // Si ?dm=<userId> ou ?call=<userId> dans l'URL → ouvre/crée la
  // conversation 1-1 avec ce user puis nettoie l'URL.
  useEffect(() => {
    const target = dmTargetUserId || callTargetUserId;
    if (!target || !data?.items || processedDmRef.current === target) return;
    processedDmRef.current = target;

    const existing = data.items.find(
      (c) => !c.isGroup && c.otherUsers.length === 1 && c.otherUsers[0].id === target,
    );

    const finalize = (conversationId: string) => {
      setActiveId(conversationId);
      if (callTargetUserId) setPendingCallStartFor(conversationId);
      // Nettoie l'URL (retire les query params)
      const tenantSlug = params?.tenantSlug ?? "";
      router.replace(`/${tenantSlug}/messagerie`);
    };

    if (existing) {
      finalize(existing.id);
    } else {
      // Crée la conversation 1-1
      create
        .mutateAsync({ isGroup: false, participantIds: [target] })
        .then((res) => finalize(res.id))
        .catch(() => {
          processedDmRef.current = null;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmTargetUserId, callTargetUserId, data?.items]);

  const active = data?.items.find((c) => c.id === activeId) ?? null;
  const canCreateGroup = profile?.role ? CADRE_ROLES.has(profile.role) : false;

  const currentUserLabel = useMemo(() => {
    if (!profile) return undefined;
    return `${profile.firstName} ${profile.lastName.charAt(0)}.`;
  }, [profile]);
  const currentUserInitials = useMemo(() => {
    if (!profile) return undefined;
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  }, [profile]);

  return (
    <>
      <div className="-m-5 h-[calc(100vh-3.5rem-2.5rem)] overflow-hidden border border-line bg-white">
        <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
          <aside
            className={clsx(
              "h-full overflow-y-auto border-r border-line",
              active ? "hidden md:block" : "block"
            )}
          >
            <ConversationList
              items={data?.items ?? []}
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
              loading={isLoading}
              currentUserLabel={currentUserLabel}
              currentUserAvatarUrl={profile?.avatarUrl ?? null}
              currentUserInitials={currentUserInitials}
              onNewChat={() => setNewChatOpen(true)}
            />
          </aside>

          <section
            className={clsx(
              "h-full",
              active ? "block" : "hidden md:flex md:items-center md:justify-center chat-bg"
            )}
          >
            {active ? (
              <ConversationView
                conversation={active}
                onBack={() => setActiveId(null)}
                autoStartCall={pendingCallStartFor === active.id}
                onCallStartConsumed={() => setPendingCallStartFor(null)}
              />
            ) : (
              <div className="mx-auto max-w-sm rounded-lg bg-white/80 p-6 text-center shadow-sm ring-1 ring-line backdrop-blur">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary-50">
                  <MessageSquare className="h-7 w-7 text-primary-600" />
                </div>
                <h2 className="text-[15px] font-semibold text-ink">Messagerie T-ERP</h2>
                <p className="mt-2 text-[12.5px] text-ink-3">
                  Sélectionnez une conversation pour démarrer, ou créez-en une nouvelle.
                </p>
                <button
                  onClick={() => setNewChatOpen(true)}
                  className="mt-4 rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-600"
                >
                  Nouvelle discussion
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(id) => setActiveId(id)}
        canCreateGroup={canCreateGroup}
      />
    </>
  );
}
