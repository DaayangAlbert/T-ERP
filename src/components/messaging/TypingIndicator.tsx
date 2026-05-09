"use client";

interface Props {
  who?: string;
}

export function TypingIndicator({ who }: Props) {
  return (
    <div className="ml-9 flex items-center gap-2 px-1 py-1 text-[11px] text-ink-3">
      <span className="flex items-center gap-1">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </span>
      {who ? <span>{who} écrit…</span> : <span>écrit…</span>}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="block h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500"
      style={{ animationDelay: delay }}
    />
  );
}
