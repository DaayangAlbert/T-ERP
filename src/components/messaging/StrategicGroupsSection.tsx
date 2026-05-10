"use client";

import Link from "next/link";
import { Pin, Crown, Wallet } from "lucide-react";
import { useStrategicGroups } from "@/hooks/useDgMessaging";
import { formatRelativeDate } from "@/lib/format";
import { clsx } from "clsx";

interface Props {
  variant?: "dg" | "daf";
}

export function StrategicGroupsSection({ variant = "dg" }: Props) {
  const { data, isLoading } = useStrategicGroups();
  if (isLoading || !data || data.items.length === 0) return null;

  const Icon = variant === "daf" ? Wallet : Crown;
  const title = variant === "daf" ? "Groupes financiers DAF" : "Groupes stratégiques DG";

  return (
    <section className="mb-3 rounded-lg border border-primary-200 bg-primary-50/40 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-primary-700">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <ul className="space-y-1">
        {data.items.map((g) => (
          <li key={g.id}>
            <Link
              href={`/messagerie?conversation=${g.id}`}
              className={clsx(
                "flex items-center gap-2 rounded-md p-2 hover:bg-white",
                g.pinnedAt && "bg-white"
              )}
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold text-white">
                {(g.name ?? "G").split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[12.5px] font-semibold text-ink">{g.name}</span>
                  {g.pinnedAt && <Pin className="h-2.5 w-2.5 text-primary-500" />}
                </div>
                {g.lastMessage && (
                  <div className="truncate text-[11px] text-ink-3">{g.lastMessage.content}</div>
                )}
              </div>
              {g.lastMessageAt && (
                <span className="flex-shrink-0 text-[10px] text-ink-3">{formatRelativeDate(g.lastMessageAt)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
