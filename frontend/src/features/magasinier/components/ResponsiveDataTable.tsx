import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

export interface ResponsiveColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
}

interface ResponsiveDataTableProps<Row extends { id: string | number }> {
  rows: Row[];
  columns: ResponsiveColumn<Row>[];
  emptyText: string;
  className?: string;
}

export function ResponsiveDataTable<Row extends { id: string | number }>({
  rows,
  columns,
  emptyText,
  className,
}: ResponsiveDataTableProps<Row>) {
  if (!rows.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-[22px] border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-100/90 dark:bg-slate-900/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 whitespace-nowrap"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/70">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                {columns.map((column) => (
                  <td key={`${row.id}-${column.key}`} className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
