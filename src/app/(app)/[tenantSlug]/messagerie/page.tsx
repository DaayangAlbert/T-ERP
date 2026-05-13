"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { AlertOctagon } from "lucide-react";
import { useConversations } from "@/hooks/useMessaging";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ConversationView } from "@/components/messaging/ConversationView";
import { StrategicGroupsSection } from "@/components/messaging/StrategicGroupsSection";
import { DafExternalContactsCompact } from "@/components/daf/messaging/DafExternalContacts";
import { RhExternalContactsCompact } from "@/components/rh/messaging/RhExternalContacts";
import { useProfile } from "@/hooks/useProfile";
import { usePriorityInbox } from "@/hooks/useDgMessaging";

export default function MessageriePage() {
  const { data, isLoading } = useConversations();
  const { data: profile } = useProfile();
  const { data: priority } = usePriorityInbox();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Auto-select first conversation on desktop once loaded
  useEffect(() => {
    if (!activeId && data?.items.length) {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) setActiveId(data.items[0].id);
    }
  }, [data?.items, activeId]);

  const active = data?.items.find((c) => c.id === activeId) ?? null;
  const isDg = profile?.role === "DG";
  const isDaf = profile?.role === "DAF";
  const isHr = profile?.role === "HR";

  return (
    <div className="-m-5 h-[calc(100vh-3.5rem-2.5rem)] overflow-hidden border border-line bg-white">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside
          className={clsx(
            "h-full overflow-y-auto border-r border-line",
            active ? "hidden md:block" : "block"
          )}
        >
          {(isDg || isDaf || isHr) && (
            <>
              <div className="p-2">
                <StrategicGroupsSection variant={isDaf ? "daf" : isHr ? "rh" : "dg"} />
                {isDaf && <DafExternalContactsCompact />}
                {isHr && <RhExternalContactsCompact />}
                {priority && priority.summary.total > 0 && (
                  <Link
                    href="/messagerie/prioritaires"
                    className="mb-2 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[12.5px] font-medium text-danger hover:border-danger/50"
                  >
                    <AlertOctagon className="h-4 w-4" />
                    {priority.summary.total} message{priority.summary.total > 1 ? "s" : ""} prioritaire{priority.summary.total > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            </>
          )}
          <ConversationList
            items={data?.items ?? []}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
            loading={isLoading}
          />
        </aside>

        <section
          className={clsx(
            "h-full",
            // Mobile: show conversation only when one is active
            active ? "block" : "hidden md:flex md:items-center md:justify-center"
          )}
        >
          {active ? (
            <ConversationView conversation={active} onBack={() => setActiveId(null)} />
          ) : (
            <div className="text-center text-sm text-ink-3">
              <div className="mb-3 inline-block rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
                T-ERP Messagerie
              </div>
              <p>Sélectionnez une conversation pour démarrer.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
