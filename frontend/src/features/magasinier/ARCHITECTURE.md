# Espace Magasinier

## Arborescence

```text
features/magasinier/
  ARCHITECTURE.md
  types.ts
  permissions.ts
  data/
    mockMagasinierData.ts
  hooks/
    useMagasinierWorkspace.ts
  components/
    ChartsSection.tsx
    KpiCard.tsx
    MagasinierHero.tsx
    MagasinierSection.tsx
    MobileMagasinierNav.tsx
    NotificationsPanel.tsx
    ProjectSelector.tsx
    QuickActionBar.tsx
    ResponsiveDataTable.tsx
    SignalementComposer.tsx
    chat/
      CallUI.tsx
      ChatWindow.tsx
      ConversationList.tsx
      GroupInfoPanel.tsx
      MessageBubble.tsx
  pages/
    MagasinierCallsPage.tsx
    MagasinierChatPage.tsx
    MagasinierDashboardPage.tsx
    MagasinierWorkspacePage.tsx
    ProjectStocksPage.tsx
    ReportsPage.tsx
    StockMovementsPage.tsx
  utils/
    format.ts
```

## Principes

- Navigation stricte : le magasinier ne voit que `dashboard`, `inventory`, `chat`, `calls`.
- Scope projet : les projets, articles, mouvements, demandes, signalements et conversations sont filtres par affectation.
- UX mobile-first : cartes, navigation horizontale, tableaux adaptatifs et zone chat confortable sur ecran tactile.
- Messagerie prete pour le temps reel : structure de conversations, messages, fichiers et appels deja separee du rendu.
- Integration progressive : seul `DashboardEntryPage` conserve encore un cockpit magasinier dedie. Les entrees `inventory`, `chat` et `calls` utilisent maintenant les modules applicatifs reels.

## Points d'integration

- `shared/utils/operationalRoles.js` : limite les entrees applicatives autorisees.
- `shared/navigation/appNavigation.js` : masque les modules hors scope.
- `features/auth/RouteGuards.jsx` : bloque l'acces direct URL aux modules interdits.
- `app/router.jsx` : utilise encore un dashboard role-aware pour le magasinier, mais laisse `inventory`, `chat` et `calls` ouvrir les modules historiques reels.
