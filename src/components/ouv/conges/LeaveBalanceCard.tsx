"use client";

import type { LeaveBalance } from "@/hooks/useOuvLeaves";

interface Props {
  balance: LeaveBalance;
}

// Card HÉROS verte gradient avec le chiffre 56px + progress bar + libellé
// "jours restants · cumul X j/an". Mirror du bloc "Solde congés visuel".
export function LeaveBalanceCard({ balance }: Props) {
  const remaining = Math.max(0, Math.round(balance.paidLeaveRemaining));
  const acquired = Math.round(balance.paidLeaveAcquired);
  const taken = Math.round(balance.paidLeaveTaken);
  const percentRemaining =
    acquired > 0 ? Math.round((remaining / acquired) * 100) : 0;

  return (
    <section className="mb-3.5 rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#15803D] px-5 py-6 text-center text-white shadow-[0_4px_16px_rgba(22,163,74,0.25)]">
      <p className="text-[12px] font-semibold uppercase tracking-wide opacity-85">
        Solde congés {balance.year}
      </p>
      <p className="my-2 text-[56px] font-extrabold leading-none">{remaining}</p>
      <p className="text-[14px] opacity-90">
        jours restants · cumul {acquired} j/an
      </p>
      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${percentRemaining}%` }}
          aria-label={`${percentRemaining}% du solde annuel restant`}
        />
      </div>
      <p className="mt-1.5 text-[11px] opacity-85">
        {taken} jour{taken > 1 ? "s" : ""} pris depuis janvier · {remaining} restant
        {remaining > 1 ? "s" : ""}
      </p>
    </section>
  );
}
