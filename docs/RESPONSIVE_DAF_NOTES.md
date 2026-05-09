# Notes responsive — Espace DAF

Référence des règles spécifiques à appliquer sur les 6 écrans DAF.
Le DAF consulte beaucoup en mobilité (375-414px), chaque écran doit donner
l'essentiel en 3 secondes sur smartphone.

## Breakpoints standards (Tailwind)

| Breakpoint | Largeur | Comportement sidebar |
|---|---|---|
| `> xl` (1280) | Desktop large | Sidebar 220px ou compact selon toggle |
| `lg` (1024-1279) | Desktop | Sidebar compact 64px (icônes + tooltips) |
| `md` (768-1023) | Tablet | Sidebar compact, KPIs 2×2, tableaux scroll-x |
| `< md` (< 768) | Mobile | Sidebar drawer, listviews → cards, header simplifié |

## Règles transverses DAF

- **Tap targets ≥ 44×44px** sur mobile (boutons, items cliquables)
- **Texte minimum 14px** sur mobile pour le contenu, **13px** pour les libellés
- **Aucun débordement horizontal** sur mobile sauf scroll-x explicite sur tableaux
- **Modales : plein écran < 768px**, centrées ≥ 768px
- **Graphes** : `ResponsiveContainer` Recharts ou `preserveAspectRatio` SVG
- **Format mono FCFA** : 36px desktop → 28px tablet → 24px mobile

## Composants critiques par écran

### 1.1 Tableau de bord DAF (/daf)
- Bandeau gradient : padding 20px → 16px mobile, mono 36px → 24px mobile
- KPIs : grille 4 col → 2×2 → 1 col
- "Mes priorités" : pleine largeur sur mobile, items tap-friendly
- Graphes : empilés verticalement < lg, ResponsiveContainer obligatoire

### 1.2 Trésorerie temps réel (/daf/tresorerie) — CRITIQUE
- **Tableau banques** :
  - `> 1024px` : tableau 8 colonnes complet
  - `768-1024px` : scroll-x avec sticky col "Banque"
  - `< 768px` : transformation totale en cards empilées par banque
- Bandeau mono : 36px → 28px mobile
- Graphe 7 jours : 220px desktop / 180px tablet / 160px mobile

### 1.3 Validations N2 (/daf/validations) — CRITIQUE
- Onglets : `overflow-x-auto` sur mobile
- Listview :
  - `> 1024px` : 9 colonnes
  - `768-1024px` : scroll-x sticky col "Référence"
  - `< 768px` : cards par validation avec workflow inline vertical
- Workflow inline : horizontal desktop → vertical stack mobile
- Bouton "Valider en lot" : barre flottante desktop → bottom sheet sticky mobile

### 1.4 Cycle de paie (/daf/paie) — CRITIQUE
- **Statusbar workflow 7 étapes** :
  - `> 1280px` : horizontal full
  - `1024-1280px` : horizontal texte raccourci
  - `768-1024px` : scroll-x
  - `< 768px` : **VERTICAL STACK** avec connecteurs verticaux (CRITIQUE)
- Bouton "Valider la paie N2" : sticky bottom sur mobile

### 1.5 Recouvrement (/daf/recouvrement)
- Balance âgée : tableau 4 col desktop → cards par tranche mobile avec barres
- Listview dossiers : 8 colonnes desktop → cards mobile
- Modale "Nouvelle relance" : plein écran mobile, étapes paginées

### 1.6 Fiscalité (/daf/fiscal)
- Tableau échéancier : 7 col desktop → cards mobile (date proéminente en haut)
- Cards dépôts/audits : format inchangé (déjà optimisé liste verticale)

## Check liste avant chaque commit

```
Testé responsive : 1920 ✓ · 1440 ✓ · 1280 ✓ · 1024 ✓ · 768 ✓ · 414 ✓ · 375 ✓
```
