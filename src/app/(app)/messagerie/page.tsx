"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useConversations } from "@/hooks/useMessaging";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ConversationView } from "@/components/messaging/ConversationView";

export default function MessageriePage() {
  const { data, isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Auto-select first conversation on desktop once loaded
  useEffect(() => {
    if (!activeId && data?.items.length) {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) setActiveId(data.items[0].id);
    }
  }, [data?.items, activeId]);

  const active = data?.items.find((c) => c.id === activeId) ?? null;

  return (
    <div className="-m-5 h-[calc(100vh-3.5rem-2.5rem)] overflow-hidden border border-line bg-white">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside
          className={clsx(
            "h-full border-r border-line",
            // Mobile: show list only when no conversation is active
            active ? "hidden md:block" : "block"
          )}
        >
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
