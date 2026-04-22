import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { comptableTheme } from "@/features/comptable/theme";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface ComptableDataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  emptyText: string;
}

export function ComptableDataTable<T>({ rows, columns, emptyText }: ComptableDataTableProps<T>) {
  if (!rows.length) {
    return <Card className="border-dashed text-sm text-black/72 dark:text-white/72">{emptyText}</Card>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[780px] text-sm">
        <thead className="bg-slate-100/90 dark:bg-slate-900/80">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap ${comptableTheme.subtleText}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
          {rows.map((row, index) => (
            <tr key={index} className="transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-4 align-top text-sm ${comptableTheme.secondaryText}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
