const ROLE_GROUPS = {
  executive: ["directeur_general", "pca"],
  technicalDirection: ["directeur_technique"],
  financeLeadership: ["daf", "directeur_administratif", "controleur_gestion"],
  comptable: ["comptable"],
  logisticsLeadership: ["responsable_logistique"],
  magasinier: ["magasinier", "logisticien"],
  acheteur: ["acheteur"],
  hr: ["responsable_rh", "rh_recruteur"],
  assistantAdministratif: ["assistant_administratif"],
  juriste: ["juriste", "assistant_administratif"],
  externalController: ["controleur_externe"],
  candidate: ["candidat_job_seeker"],
  itSupport: ["informaticien"],
  chefProjet: ["chef_projet", "conducteur_travaux", "chef_chantier"],
  ouvrier: ["ouvrier", "collaborateur_terrain"],
};

const WORKSPACE_PROFILES = {
  super_admin: {
    titleKey: "workspaceProfiles.super_admin.title",
    descriptionKey: "workspaceProfiles.super_admin.description",
    focusKeys: [
      "workspaceProfiles.super_admin.focusPlatform",
      "workspaceProfiles.super_admin.focusCompanies",
      "workspaceProfiles.super_admin.focusSecurity",
    ],
    priorityNavIds: ["dashboard", "companies", "users"],
    secondaryNavIds: ["projects", "finance", "inventory", "payroll", "procurement", "recruitment"],
    collaborationNavIds: ["chat", "calls"],
  },
  company_admin: {
    titleKey: "workspaceProfiles.company_admin.title",
    descriptionKey: "workspaceProfiles.company_admin.description",
    focusKeys: [
      "workspaceProfiles.company_admin.focusUsers",
      "workspaceProfiles.company_admin.focusOperations",
      "workspaceProfiles.company_admin.focusControl",
    ],
    priorityNavIds: ["dashboard", "admin", "users", "projects", "finance"],
    secondaryNavIds: ["inventory", "payroll", "recruitment", "procurement"],
    collaborationNavIds: ["chat", "calls"],
  },
  directeur_general: {
    titleKey: "workspaceProfiles.directeur_general.title",
    descriptionKey: "workspaceProfiles.directeur_general.description",
    focusKeys: [
      "workspaceProfiles.directeur_general.focusGovernance",
      "workspaceProfiles.directeur_general.focusProjects",
      "workspaceProfiles.directeur_general.focusFinance",
    ],
    priorityNavIds: ["dashboard", "projects", "finance", "users"],
    secondaryNavIds: ["inventory", "payroll", "recruitment", "procurement"],
    collaborationNavIds: ["chat", "calls"],
  },
  directeur_technique: {
    titleKey: "workspaceProfiles.directeur_technique.title",
    descriptionKey: "workspaceProfiles.directeur_technique.description",
    focusKeys: [
      "workspaceProfiles.directeur_technique.focusProjects",
      "workspaceProfiles.directeur_technique.focusResources",
      "workspaceProfiles.directeur_technique.focusSite",
    ],
    priorityNavIds: ["dashboard", "projects", "inventory"],
    secondaryNavIds: ["users", "procurement", "finance"],
    collaborationNavIds: ["chat", "calls"],
  },
  daf: {
    titleKey: "workspaceProfiles.daf.title",
    descriptionKey: "workspaceProfiles.daf.description",
    focusKeys: [
      "workspaceProfiles.daf.focusBudget",
      "workspaceProfiles.daf.focusTreasury",
      "workspaceProfiles.daf.focusPerformance",
    ],
    priorityNavIds: ["dashboard", "finance", "payroll"],
    secondaryNavIds: ["projects", "users", "procurement"],
    collaborationNavIds: ["chat", "calls"],
  },
  comptable: {
    titleKey: "workspaceProfiles.comptable.title",
    descriptionKey: "workspaceProfiles.comptable.description",
    focusKeys: [
      "workspaceProfiles.comptable.focusCash",
      "workspaceProfiles.comptable.focusInvoices",
      "workspaceProfiles.comptable.focusEntries",
    ],
    priorityNavIds: ["dashboard", "finance", "payroll"],
    secondaryNavIds: ["inventory"],
    collaborationNavIds: ["chat"],
    allowedAppIds: ["dashboard", "finance", "payroll", "planning", "inventory", "chat"],
  },
  responsable_rh: {
    titleKey: "workspaceProfiles.responsable_rh.title",
    descriptionKey: "workspaceProfiles.responsable_rh.description",
    focusKeys: [
      "workspaceProfiles.responsable_rh.focusPeople",
      "workspaceProfiles.responsable_rh.focusRecruitment",
      "workspaceProfiles.responsable_rh.focusCompliance",
    ],
    priorityNavIds: ["dashboard", "users", "attendance", "recruitment", "payroll"],
    secondaryNavIds: ["projects"],
    collaborationNavIds: ["chat", "calls"],
  },
  assistant_administratif: {
    titleKey: "workspaceProfiles.assistant_administratif.title",
    descriptionKey: "workspaceProfiles.assistant_administratif.description",
    focusKeys: [
      "workspaceProfiles.assistant_administratif.focusCorrespondence",
      "workspaceProfiles.assistant_administratif.focusCompliance",
      "workspaceProfiles.assistant_administratif.focusProjects",
    ],
    priorityNavIds: ["dashboard", "correspondences", "companies", "projects"],
    secondaryNavIds: ["planning", "payroll"],
    collaborationNavIds: ["chat", "calls"],
    allowedAppIds: ["dashboard", "companies", "correspondences", "projects", "planning", "payroll", "chat", "calls"],
  },
  responsable_logistique: {
    titleKey: "workspaceProfiles.responsable_logistique.title",
    descriptionKey: "workspaceProfiles.responsable_logistique.description",
    focusKeys: [
      "workspaceProfiles.responsable_logistique.focusSupply",
      "workspaceProfiles.responsable_logistique.focusInventory",
      "workspaceProfiles.responsable_logistique.focusAllocations",
    ],
    priorityNavIds: ["dashboard", "inventory", "procurement", "projects"],
    secondaryNavIds: ["finance"],
    collaborationNavIds: ["chat", "calls"],
  },
  magasinier: {
    titleKey: "workspaceProfiles.magasinier.title",
    descriptionKey: "workspaceProfiles.magasinier.description",
    focusKeys: [
      "workspaceProfiles.magasinier.focusEntries",
      "workspaceProfiles.magasinier.focusInventory",
      "workspaceProfiles.magasinier.focusAlerts",
    ],
    priorityNavIds: ["dashboard", "inventory"],
    secondaryNavIds: ["payroll"],
    collaborationNavIds: ["chat", "calls"],
    allowedAppIds: ["dashboard", "inventory", "payroll", "planning", "chat", "calls"],
  },
  acheteur: {
    titleKey: "workspaceProfiles.acheteur.title",
    descriptionKey: "workspaceProfiles.acheteur.description",
    focusKeys: [
      "workspaceProfiles.acheteur.focusTenders",
      "workspaceProfiles.acheteur.focusSubmissions",
      "workspaceProfiles.acheteur.focusSuppliers",
    ],
    priorityNavIds: ["dashboard", "procurement", "inventory", "projects"],
    secondaryNavIds: ["finance"],
    collaborationNavIds: ["chat", "calls"],
  },
  juriste: {
    titleKey: "workspaceProfiles.juriste.title",
    descriptionKey: "workspaceProfiles.juriste.description",
    focusKeys: [
      "workspaceProfiles.juriste.focusCompliance",
      "workspaceProfiles.juriste.focusContracts",
      "workspaceProfiles.juriste.focusEvidence",
    ],
    priorityNavIds: ["dashboard", "companies", "procurement"],
    secondaryNavIds: ["projects", "finance"],
    collaborationNavIds: ["chat"],
  },
  controleur_externe: {
    titleKey: "workspaceProfiles.controleur_externe.title",
    descriptionKey: "workspaceProfiles.controleur_externe.description",
    focusKeys: [
      "workspaceProfiles.controleur_externe.focusAudit",
      "workspaceProfiles.controleur_externe.focusTraceability",
      "workspaceProfiles.controleur_externe.focusRisk",
    ],
    priorityNavIds: ["dashboard", "companies", "finance", "inventory"],
    secondaryNavIds: ["projects", "procurement", "recruitment"],
    collaborationNavIds: ["chat"],
  },
  informaticien: {
    titleKey: "workspaceProfiles.informaticien.title",
    descriptionKey: "workspaceProfiles.informaticien.description",
    focusKeys: [
      "workspaceProfiles.informaticien.focusSupport",
      "workspaceProfiles.informaticien.focusAccess",
      "workspaceProfiles.informaticien.focusIncidents",
    ],
    priorityNavIds: ["dashboard", "users"],
    secondaryNavIds: ["projects", "finance", "inventory"],
    collaborationNavIds: ["chat", "calls"],
  },
  chef_projet: {
    titleKey: "workspaceProfiles.chef_projet.title",
    descriptionKey: "workspaceProfiles.chef_projet.description",
    focusKeys: [
      "workspaceProfiles.chef_projet.focusPlanning",
      "workspaceProfiles.chef_projet.focusTeams",
      "workspaceProfiles.chef_projet.focusDelivery",
    ],
    priorityNavIds: ["dashboard", "projects", "attendance", "inventory"],
    secondaryNavIds: ["users"],
    collaborationNavIds: ["chat", "calls"],
  },
  ouvrier: {
    titleKey: "workspaceProfiles.ouvrier.title",
    descriptionKey: "workspaceProfiles.ouvrier.description",
    focusKeys: [
      "workspaceProfiles.ouvrier.focusTasks",
      "workspaceProfiles.ouvrier.focusSite",
      "workspaceProfiles.ouvrier.focusReporting",
    ],
    priorityNavIds: ["dashboard", "projects"],
    secondaryNavIds: [],
    collaborationNavIds: ["chat", "calls"],
    allowedAppIds: ["dashboard", "projects", "planning", "payroll", "chat", "calls"],
  },
  candidat_job_seeker: {
    titleKey: "workspaceProfiles.candidat_job_seeker.title",
    descriptionKey: "workspaceProfiles.candidat_job_seeker.description",
    focusKeys: [
      "workspaceProfiles.candidat_job_seeker.focusProfile",
      "workspaceProfiles.candidat_job_seeker.focusOffers",
      "workspaceProfiles.candidat_job_seeker.focusApplications",
    ],
    priorityNavIds: ["dashboard", "recruitment"],
    secondaryNavIds: [],
    collaborationNavIds: ["chat"],
  },
  default: {
    titleKey: "workspaceProfiles.default.title",
    descriptionKey: "workspaceProfiles.default.description",
    focusKeys: [
      "workspaceProfiles.default.focusActivity",
      "workspaceProfiles.default.focusDelivery",
      "workspaceProfiles.default.focusSafety",
    ],
    priorityNavIds: ["dashboard"],
    secondaryNavIds: ["users", "projects", "finance", "inventory", "payroll", "recruitment", "procurement"],
    collaborationNavIds: ["chat", "calls"],
  },
};

const WORKSPACE_PROFILE_ALIASES = {
  pca: "directeur_general",
  directeur_administratif: "daf",
  controleur_gestion: "daf",
  chef_chantier: "chef_projet",
  conducteur_travaux: "chef_projet",
  logisticien: "magasinier",
  rh_recruteur: "responsable_rh",
  collaborateur_terrain: "ouvrier",
};

const PROFILE_ROLE_MAPPING = [
  ["directeur_general", ROLE_GROUPS.executive],
  ["directeur_technique", ROLE_GROUPS.technicalDirection],
  ["daf", ROLE_GROUPS.financeLeadership],
  ["comptable", ROLE_GROUPS.comptable],
  ["acheteur", ROLE_GROUPS.acheteur],
  ["responsable_rh", ROLE_GROUPS.hr],
  ["assistant_administratif", ROLE_GROUPS.assistantAdministratif],
  ["juriste", ROLE_GROUPS.juriste],
  ["controleur_externe", ROLE_GROUPS.externalController],
  ["responsable_logistique", ROLE_GROUPS.logisticsLeadership],
  ["magasinier", ROLE_GROUPS.magasinier],
  ["informaticien", ROLE_GROUPS.itSupport],
  ["chef_projet", ROLE_GROUPS.chefProjet],
  ["ouvrier", ROLE_GROUPS.ouvrier],
  ["candidat_job_seeker", ROLE_GROUPS.candidate],
];

function normalizeRoleEntry(role) {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return role;
  }

  if (typeof role === "object" && role.code) {
    return role.code;
  }

  return null;
}

function uniqueIds(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function pickItemsById(itemsById, ids, consumedIds) {
  const pickedItems = [];

  uniqueIds(ids).forEach((id) => {
    const item = itemsById.get(id);

    if (!item || consumedIds.has(id)) {
      return;
    }

    consumedIds.add(id);
    pickedItems.push(item);
  });

  return pickedItems;
}

export function getUserRoleCodes(user) {
  if (!Array.isArray(user?.roles)) {
    return [];
  }

  return user.roles.map(normalizeRoleEntry).filter(Boolean);
}

export function hasAnyRole(user, codes) {
  const userRoles = new Set(getUserRoleCodes(user));
  return codes.some((code) => userRoles.has(code));
}

export function hasPermission(user, permission) {
  return user?.user_type === "super_admin" || user?.permissions?.includes(permission);
}

function resolveWorkspaceProfileCode(profileCode) {
  if (!profileCode) {
    return "default";
  }

  if (WORKSPACE_PROFILES[profileCode]) {
    return profileCode;
  }

  return WORKSPACE_PROFILE_ALIASES[profileCode] || "default";
}

export function getOperationalProfileCode(user) {
  if (user?.user_type === "super_admin") {
    return "super_admin";
  }

  if (user?.operational_profile_code) {
    return user.operational_profile_code;
  }

  for (const [profileCode, roleCodes] of PROFILE_ROLE_MAPPING) {
    if (hasAnyRole(user, roleCodes)) {
      return profileCode;
    }
  }

  if (user?.user_type === "company_admin") {
    return "company_admin";
  }

  return "default";
}

export function getOperationalWorkspaceProfile(user) {
  const sourceCode = getOperationalProfileCode(user);
  const code = resolveWorkspaceProfileCode(sourceCode);
  return {
    sourceCode,
    code,
    ...(WORKSPACE_PROFILES[code] || WORKSPACE_PROFILES.default),
  };
}

export function getWorkspaceNavigationSections(user, items) {
  const workspaceProfile = getOperationalWorkspaceProfile(user);
  const visibleItems = Array.isArray(items) ? items : [];
  const itemsById = new Map(visibleItems.map((item) => [item.id, item]));
  const consumedIds = new Set();

  const collaborationIds = uniqueIds(workspaceProfile.collaborationNavIds);
  const priorityIds = uniqueIds(workspaceProfile.priorityNavIds);
  const secondaryIds = uniqueIds([
    ...(workspaceProfile.secondaryNavIds || []),
    ...visibleItems
      .map((item) => item.id)
      .filter((id) => !priorityIds.includes(id) && !collaborationIds.includes(id)),
  ]);

  const sections = [
    {
      key: "priority",
      titleKey: "navigationSections.priority",
      items: pickItemsById(itemsById, priorityIds, consumedIds),
    },
    {
      key: "secondary",
      titleKey: "navigationSections.other",
      items: pickItemsById(itemsById, secondaryIds, consumedIds),
    },
    {
      key: "collaboration",
      titleKey: "navigationSections.collaboration",
      items: pickItemsById(itemsById, collaborationIds, consumedIds),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function getWorkspaceAllowedAppIds(user) {
  const workspaceProfile = getOperationalWorkspaceProfile(user);
  const allowedAppIds = workspaceProfile.allowedAppIds;

  return Array.isArray(allowedAppIds) && allowedAppIds.length ? [...new Set(allowedAppIds)] : null;
}

export function canAccessWorkspaceEntry(user, appEntryId) {
  if (!appEntryId) {
    return true;
  }

  const allowedAppIds = getWorkspaceAllowedAppIds(user);
  if (!allowedAppIds) {
    return true;
  }

  return allowedAppIds.includes(appEntryId);
}

export function getRoleWorkspaceFlags(user) {
  const workspaceProfile = getOperationalWorkspaceProfile(user);

  return {
    workspaceProfile,
    profileCode: workspaceProfile.code,
    isExecutive: hasAnyRole(user, ROLE_GROUPS.executive),
    isTechnicalDirector: hasAnyRole(user, ROLE_GROUPS.technicalDirection),
    isFinanceLead: hasAnyRole(user, ROLE_GROUPS.financeLeadership),
    isComptable: hasAnyRole(user, ROLE_GROUPS.comptable),
    isAcheteur: hasAnyRole(user, ROLE_GROUPS.acheteur),
    isLogisticsLead: hasAnyRole(user, ROLE_GROUPS.logisticsLeadership),
    isMagasinier: hasAnyRole(user, ROLE_GROUPS.magasinier),
    isRH: hasAnyRole(user, ROLE_GROUPS.hr),
    isAssistantAdministratif: hasAnyRole(user, ROLE_GROUPS.assistantAdministratif),
    isJuriste: hasAnyRole(user, ROLE_GROUPS.juriste),
    isExternalController: hasAnyRole(user, ROLE_GROUPS.externalController),
    isCandidate: hasAnyRole(user, ROLE_GROUPS.candidate) || user?.user_type === "job_seeker",
    isITSupport: hasAnyRole(user, ROLE_GROUPS.itSupport),
    isChefProjet: hasAnyRole(user, ROLE_GROUPS.chefProjet),
    isOuvrier: hasAnyRole(user, ROLE_GROUPS.ouvrier),
    isCompanyAdmin: user?.user_type === "company_admin",
    canManageCompanies: hasPermission(user, "companies.manage"),
    canManageFinance: hasPermission(user, "finance.manage"),
    canManageInventory: hasPermission(user, "inventory.manage"),
    canManageProjects: hasPermission(user, "projects.manage"),
    canManageProcurement: hasPermission(user, "procurement.manage"),
    canManageRecruitment: hasPermission(user, "recruitment.manage"),
    canReadCompanies: hasPermission(user, "companies.read"),
    canReadUsers: hasPermission(user, "users.read"),
  };
}
