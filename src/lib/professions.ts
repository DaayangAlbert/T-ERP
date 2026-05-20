/**
 * Suggestions de métiers / postes recherchés — TOUS secteurs.
 *
 * Utilisé comme `<datalist>` (suggestions + saisie libre) dans l'inscription
 * candidat et les préférences de recherche. L'objectif : permettre à TOUT LE
 * MONDE de s'inscrire (ménagère, agent de sécurité, chauffeur, coiffeuse…),
 * pas seulement les profils BTP. La saisie reste libre : un métier absent de
 * la liste peut être tapé directement.
 *
 * Contexte Cameroun / Afrique centrale — terminologie courante.
 */
export const PROFESSION_GROUPS: { sector: string; jobs: string[] }[] = [
  {
    sector: "BTP & Construction",
    jobs: [
      "Ingénieur BTP / Travaux",
      "Conducteur de travaux",
      "Chef de chantier",
      "Maçon",
      "Ferrailleur",
      "Coffreur",
      "Carreleur",
      "Peintre en bâtiment",
      "Plombier",
      "Électricien bâtiment",
      "Conducteur d'engins",
      "Manœuvre / Journalier",
      "Géomètre / Topographe",
      "Métreur",
      "Soudeur",
      "Menuisier",
    ],
  },
  {
    sector: "Sécurité & Gardiennage",
    jobs: ["Agent de sécurité", "Gardien / Vigile", "Maître-chien", "Agent de prévention incendie"],
  },
  {
    sector: "Services à domicile",
    jobs: [
      "Ménagère / Aide-ménagère",
      "Femme / Homme de ménage",
      "Nounou / Garde d'enfants",
      "Cuisinier / Cuisinière à domicile",
      "Jardinier",
      "Gouvernante",
      "Repasseur / Repasseuse",
      "Garde-malade / Aide à domicile",
      "Chauffeur particulier",
    ],
  },
  {
    sector: "Transport & Logistique",
    jobs: [
      "Chauffeur poids lourd",
      "Chauffeur VTC / Taxi",
      "Chauffeur-livreur",
      "Coursier / Moto-taxi",
      "Magasinier",
      "Logisticien",
      "Cariste",
      "Manutentionnaire",
    ],
  },
  {
    sector: "Commerce & Vente",
    jobs: [
      "Vendeur / Vendeuse",
      "Caissier / Caissière",
      "Commercial / Agent commercial",
      "Téléconseiller",
      "Gérant de boutique",
      "Hôtesse d'accueil",
    ],
  },
  {
    sector: "Restauration & Hôtellerie",
    jobs: [
      "Serveur / Serveuse",
      "Cuisinier / Chef de cuisine",
      "Aide-cuisinier / Plongeur",
      "Réceptionniste",
      "Femme / Valet de chambre",
      "Barman / Barmaid",
      "Pâtissier / Boulanger",
    ],
  },
  {
    sector: "Administration & Bureautique",
    jobs: [
      "Secrétaire",
      "Assistant(e) administratif(ve)",
      "Assistant(e) de direction",
      "Standardiste",
      "Gestionnaire RH",
      "Agent de saisie",
    ],
  },
  {
    sector: "Finance & Comptabilité",
    jobs: [
      "Comptable",
      "Aide-comptable",
      "Caissier(ère) / Guichetier",
      "Gestionnaire de paie",
      "Agent de microfinance",
      "Contrôleur de gestion",
    ],
  },
  {
    sector: "Santé & Social",
    jobs: [
      "Infirmier / Infirmière",
      "Aide-soignant(e)",
      "Sage-femme",
      "Pharmacien / Préparateur en pharmacie",
      "Laborantin",
      "Assistant social",
    ],
  },
  {
    sector: "Éducation & Formation",
    jobs: ["Enseignant", "Répétiteur", "Éducateur / Encadreur", "Formateur professionnel"],
  },
  {
    sector: "Informatique & Digital",
    jobs: [
      "Développeur / Programmeur",
      "Technicien informatique",
      "Community manager",
      "Infographiste / Designer",
      "Data analyst",
    ],
  },
  {
    sector: "Industrie & Maintenance",
    jobs: [
      "Mécanicien",
      "Électrotechnicien",
      "Technicien de maintenance",
      "Opérateur de production",
      "Tôlier / Carrossier",
    ],
  },
  {
    sector: "Artisanat & Beauté",
    jobs: [
      "Couturier / Couturière",
      "Coiffeur / Coiffeuse",
      "Esthéticienne",
      "Cordonnier",
      "Photographe / Cameraman",
    ],
  },
  {
    sector: "Agriculture & Élevage",
    jobs: ["Agriculteur / Ouvrier agricole", "Éleveur", "Pêcheur", "Technicien agronome"],
  },
  {
    sector: "Autres services",
    jobs: ["Agent d'entretien / Nettoyage", "Blanchisseur", "Traducteur / Interprète", "Journaliste", "Autre"],
  },
];

/** Liste à plat de tous les métiers, pour alimenter un `<datalist>`. */
export const PROFESSION_SUGGESTIONS: string[] = PROFESSION_GROUPS.flatMap((g) => g.jobs);
