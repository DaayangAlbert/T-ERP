# Espace Comptable

## Arborescence

```text
features/comptable/
  ARCHITECTURE.md
  types.ts
  permissions.ts
  data/
    mockComptableData.ts
  hooks/
    useComptableWorkspace.ts
  components/
    AttendanceComposer.tsx
    ComptableChartCard.tsx
    ComptableDataTable.tsx
    ComptableHero.tsx
    ComptableKpiCard.tsx
    ComptableMiniTrend.tsx
    ComptableMobileNav.tsx
    ComptableQuickActions.tsx
    ComptableSection.tsx
    FinanceComposer.tsx
    JustificatifDropzone.tsx
    MessageInboxPreview.tsx
    NotificationFeed.tsx
    PayslipLibrary.tsx
  pages/
    ComptableAttendancePage.tsx
    ComptableDashboardPage.tsx
    ComptableFinancePage.tsx
    ComptablePayrollPage.tsx
    ComptableStockPage.tsx
```

## Principes

- Navigation stricte : le comptable ne voit que `dashboard`, `finance`, `payroll`, `planning`, `inventory`, `chat`.
- Scope projet : finance, presences, bulletins, stock et messagerie sont filtres par projets affectes.
- Stock en lecture seule : consultation des articles et mouvements sans action destructive.
- Finance restructuree : separation nette entre depenses, recettes, paiements, bulletins et justificatifs.
- UX mobile-first : cartes, tableaux responsives, navigation secondaire horizontale et graphiques lisibles en clair comme en sombre.
- Integration progressive : le cockpit comptable reste concentre sur le `dashboard`, tandis que les modules applicatifs reels `finance`, `payroll` et `inventory` sont a nouveau les points d'entree officiels.

## Points d'integration

- `shared/utils/operationalRoles.js` : restreint les modules visibles et les modules autorises.
- `shared/navigation/appNavigation.js` : personnalise les libelles du comptable et masque les modules interdits.
- `features/auth/RouteGuards.jsx` : bloque l'acces URL aux modules hors scope.
- `app/router.jsx` : garde les routes applicatives backend reelles ; seul le dashboard comptable reste branche sur un cockpit dedie.
