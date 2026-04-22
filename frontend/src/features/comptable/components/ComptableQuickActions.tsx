import { ArrowDownCircle, ArrowUpCircle, Clock3, FileText, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/utils/cn";

const actions = [
  { id: "expense", label: "Nouvelle depense", icon: ArrowDownCircle, to: "/app/finance?section=expenses" },
  { id: "revenue", label: "Nouvelle recette", icon: ArrowUpCircle, to: "/app/finance?section=revenues" },
  { id: "payroll", label: "Temps & paie", icon: Clock3, to: "/app/payroll" },
  { id: "payslips", label: "Bulletins salaries", icon: FileText, to: "/app/finance?section=payslips" },
  { id: "payments", label: "Paiements", icon: WalletCards, to: "/app/finance?section=payments" },
];

export function ComptableQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            to={action.to}
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition",
              "border-black/10 bg-white/80 text-black hover:border-primary/30 hover:bg-white dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/14"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
