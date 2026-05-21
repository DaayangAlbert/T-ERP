"use client";

import Link from "next/link";
import { useEmployee } from "@/contexts/EmployeeContext";

export default function EmpHomePage() {
  const { employee, isLoading } = useEmployee();

  return (
    <main className="emp-home mx-auto w-full max-w-screen-sm px-4 pb-24 pt-6">
      <header className="rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-5 py-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-wider opacity-80">Espace personnel</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {isLoading
            ? "Chargement…"
            : employee
              ? `👋 ${employee.firstName} ${employee.lastName}`
              : "👋 Bienvenue"}
        </h1>
        {employee?.position && (
          <p className="mt-1 text-sm opacity-90">{employee.position}</p>
        )}
        {employee?.assignedSite && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs">
            🏗 {employee.assignedSite.name}
          </p>
        )}
      </header>

      <nav className="mt-6 grid grid-cols-2 gap-3">
        {[
          { href: "/employe/dashboard", label: "Tableau de bord", icon: "📊" },
          { href: "/employe/paie", label: "Mes bulletins", icon: "💰" },
          { href: "/employe/conges", label: "Mes congés", icon: "🌴" },
          { href: "/employe/pointage", label: "Mon pointage", icon: "⏰" },
          { href: "/employe/profil", label: "Mon profil", icon: "👤" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-[68px] items-center gap-3 rounded-xl border border-purple-100 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:border-purple-300 hover:shadow"
          >
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
