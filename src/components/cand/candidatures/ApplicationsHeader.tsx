interface Props {
  active: number;
  archived: number;
}

export function ApplicationsHeader({ active, archived }: Props) {
  return (
    <header className="flex flex-wrap items-baseline gap-3">
      <h1 className="text-xl font-semibold text-ink">Mes candidatures</h1>
      <span className="text-sm text-ink-3">
        {active} active{active > 1 ? "s" : ""} · {archived} archivée
        {archived > 1 ? "s" : ""}
      </span>
    </header>
  );
}
