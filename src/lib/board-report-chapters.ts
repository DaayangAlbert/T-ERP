// Constantes utilisées côté client ET serveur — pas d'import qui dépend de next/headers
// (cf board-report-generator.ts qui en a besoin pour ses agrégations Prisma).

export const REPORT_CHAPTER_LABELS = {
  synthesis: "Synthèse exécutive",
  financial: "Performance financière",
  operational: "Performance opérationnelle",
  commercial: "Performance commerciale",
  hr: "Ressources humaines",
  hse: "HSE et conformité",
  strategic: "Projets stratégiques",
  risks: "Risques et opportunités",
  outlook: "Perspectives et plan d'action",
} as const;

export type ReportChapterKey = keyof typeof REPORT_CHAPTER_LABELS;
