require("./_guard-prod");
/**
 * Seed de personnel réel BatimCAM SA — ~40 collaborateurs représentatifs
 * du secteur BTP camerounais, répartis par rôle et catégorie.
 *
 * Lance après seed.ts principal. Idempotent : upsert par email.
 *
 * Hiérarchie créée :
 *   - 2 chefs chantier (SITE_MANAGER) — Pont Mfoundi, Olembé
 *   - 3 conducteurs travaux (WORKS_MANAGER)
 *   - 6 ingénieurs travaux principaux (EMPLOYEE Cadre M)
 *   - 5 chefs d'équipe (EMPLOYEE Maîtrise)
 *   - 12 ouvriers qualifiés (WORKER OQ N4-N5)
 *   - 8 ouvriers spécialisés (WORKER OS N1-N3)
 *   - 4 administratifs (EMPLOYEE Cadre/ETAM : assistante, comptable junior, etc.)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const PWD = "Demo2026!";

// Cohérent avec l'identité camerounaise — mix de noms communs Centre/Sud/Littoral
const PERSONNEL = [
  // === SITE_MANAGER ===
  { firstName: "Jean-Marie",  lastName: "BIWOLE",     role: "SITE_MANAGER",  position: "Chef de chantier Pont Mfoundi", category: "Maîtrise N3", contract: "CDI", hireDate: "2017-09-12", siteCode: "CHT-2025-031" },
  { firstName: "Vincent",     lastName: "ESSAMA",     role: "SITE_MANAGER",  position: "Chef de chantier Olembé",       category: "Maîtrise N3", contract: "CDI", hireDate: "2019-03-04", siteCode: "CHT-2026-022" },

  // === WORKS_MANAGER (conducteurs travaux) ===
  { firstName: "Paul",        lastName: "KAMGA",      role: "WORKS_MANAGER", position: "Conducteur de travaux principal",  category: "Cadre Moyen",   contract: "CDI", hireDate: "2014-06-01" },
  { firstName: "Roger",       lastName: "MEKA",       role: "WORKS_MANAGER", position: "Conducteur de travaux génie civil",category: "Cadre Moyen",   contract: "CDI", hireDate: "2016-02-15" },
  { firstName: "Florence",    lastName: "ATEBA",      role: "WORKS_MANAGER", position: "Conductrice travaux VRD",          category: "Cadre Moyen",   contract: "CDI", hireDate: "2018-08-20" },

  // === EMPLOYEE Cadre M (ingénieurs travaux) ===
  { firstName: "Christian",   lastName: "DJOMO",      role: "EMPLOYEE", position: "Ingénieur Travaux Principal",   category: "Cadre Moyen", contract: "CDI", hireDate: "2018-01-02", department: "Études & Méthodes" },
  { firstName: "Eric",        lastName: "FOUDA",      role: "EMPLOYEE", position: "Ingénieur méthodes",            category: "Cadre Moyen", contract: "CDI", hireDate: "2019-11-10", department: "Études & Méthodes" },
  { firstName: "Patrick",     lastName: "MBARGA",     role: "EMPLOYEE", position: "Ingénieur QHSE",                category: "Cadre Moyen", contract: "CDI", hireDate: "2020-04-15", department: "QHSE" },
  { firstName: "Carine",      lastName: "ESSOMBA",    role: "EMPLOYEE", position: "Ingénieur d'études",            category: "Cadre Moyen", contract: "CDI", hireDate: "2021-09-01", department: "Études & Méthodes" },
  { firstName: "Bernard",     lastName: "KAMTO",      role: "EMPLOYEE", position: "Ingénieur structures",          category: "Cadre Moyen", contract: "CDI", hireDate: "2017-05-22", department: "Bureau d'études" },
  { firstName: "Sylvie",      lastName: "OYONO",      role: "EMPLOYEE", position: "Ingénieur génie civil junior",  category: "Cadre Moyen", contract: "CDD", hireDate: "2025-01-15", department: "Études & Méthodes" },

  // === EMPLOYEE Maîtrise (chefs d'équipe) ===
  { firstName: "Joseph",      lastName: "ABOMO",      role: "EMPLOYEE", position: "Chef d'équipe maçonnerie",       category: "Maîtrise N2", contract: "CDI", hireDate: "2015-07-08" },
  { firstName: "Pascal",      lastName: "NGUEMA",     role: "EMPLOYEE", position: "Chef d'équipe coffrage",         category: "Maîtrise N2", contract: "CDI", hireDate: "2016-10-12" },
  { firstName: "Daniel",      lastName: "ENGOULOU",   role: "EMPLOYEE", position: "Chef d'équipe ferraillage",      category: "Maîtrise N2", contract: "CDI", hireDate: "2017-04-03" },
  { firstName: "Christophe",  lastName: "MENGUE",     role: "EMPLOYEE", position: "Chef d'équipe finitions",        category: "Maîtrise N2", contract: "CDI", hireDate: "2018-12-01" },
  { firstName: "Antoine",     lastName: "BAYIHA",     role: "EMPLOYEE", position: "Chef d'équipe terrassement",     category: "Maîtrise N2", contract: "CDI", hireDate: "2019-06-15" },

  // === WORKER OQ (ouvriers qualifiés N4-N5) ===
  { firstName: "Henri",       lastName: "TSOATA",     role: "WORKER",   position: "Maçon-coffreur",                 category: "OQ N5", contract: "CDI",  hireDate: "2018-02-20" },
  { firstName: "Yves",        lastName: "EBANGA",     role: "WORKER",   position: "Ferrailleur",                    category: "OQ N5", contract: "CDI",  hireDate: "2019-08-10" },
  { firstName: "Stéphane",    lastName: "OWONA",      role: "WORKER",   position: "Conducteur d'engins (CACES R482)",category: "OQ N5", contract: "CDI",  hireDate: "2017-11-05" },
  { firstName: "Claude",      lastName: "NDONGO",     role: "WORKER",   position: "Électricien chantier",           category: "OQ N5", contract: "CDI",  hireDate: "2020-03-14" },
  { firstName: "Jean-Pierre", lastName: "BIDIAS",     role: "WORKER",   position: "Charpentier",                    category: "OQ N5", contract: "CDI",  hireDate: "2018-09-22" },
  { firstName: "François",    lastName: "AKONO",      role: "WORKER",   position: "Plombier",                       category: "OQ N5", contract: "CDI",  hireDate: "2019-12-01" },
  { firstName: "Marcel",      lastName: "ONDOA",      role: "WORKER",   position: "Maçon",                          category: "OQ N4", contract: "CDI",  hireDate: "2020-07-15" },
  { firstName: "André",       lastName: "AYISSI",     role: "WORKER",   position: "Coffreur",                       category: "OQ N4", contract: "CDI",  hireDate: "2021-02-08" },
  { firstName: "Olivier",     lastName: "ASSEMBE",    role: "WORKER",   position: "Soudeur arc",                    category: "OQ N4", contract: "CDI",  hireDate: "2021-11-19" },
  { firstName: "Bertrand",    lastName: "ASSOUMOU",   role: "WORKER",   position: "Mécanicien chantier",            category: "OQ N4", contract: "CDI",  hireDate: "2022-04-25" },
  { firstName: "Serge",       lastName: "MEFO",       role: "WORKER",   position: "Carreleur",                      category: "OQ N4", contract: "CDI",  hireDate: "2023-01-10" },
  { firstName: "Théodore",    lastName: "MEDJO",      role: "WORKER",   position: "Peintre en bâtiment",            category: "OQ N4", contract: "CDD", hireDate: "2025-06-01" },

  // === WORKER OS (ouvriers spécialisés N1-N3) ===
  { firstName: "Alphonse",    lastName: "EBONGUE",    role: "WORKER",   position: "Manœuvre maçon",                 category: "OS N3", contract: "JOURNALIER", hireDate: "2024-08-12" },
  { firstName: "Robert",      lastName: "ABEGA",      role: "WORKER",   position: "Manœuvre terrassement",          category: "OS N3", contract: "JOURNALIER", hireDate: "2024-10-05" },
  { firstName: "Émile",       lastName: "MFOULA",     role: "WORKER",   position: "Manœuvre coffrage",              category: "OS N2", contract: "JOURNALIER", hireDate: "2025-02-18" },
  { firstName: "Léonard",     lastName: "AKAME",      role: "WORKER",   position: "Manutentionnaire stock",         category: "OS N2", contract: "CDD",  hireDate: "2024-11-22" },
  { firstName: "Jean",        lastName: "MEDOU",      role: "WORKER",   position: "Aide-coffreur",                  category: "OS N2", contract: "JOURNALIER", hireDate: "2025-04-10" },
  { firstName: "Boris",       lastName: "AMOUGOU",    role: "WORKER",   position: "Aide-maçon",                     category: "OS N1", contract: "JOURNALIER", hireDate: "2025-09-01" },
  { firstName: "Pierre",      lastName: "EVINA",      role: "WORKER",   position: "Aide-ferrailleur",               category: "OS N1", contract: "JOURNALIER", hireDate: "2025-08-15" },
  { firstName: "Romain",      lastName: "BEKONO",     role: "WORKER",   position: "Gardien chantier",               category: "OS N1", contract: "CDI",  hireDate: "2022-12-10", isGuard: true },

  // === ETAM / Administratifs ===
  { firstName: "Linda",       lastName: "ONDOA",      role: "EMPLOYEE", position: "Assistante de direction",        category: "ETAM N3", contract: "CDI", hireDate: "2019-04-15", department: "Direction Générale" },
  { firstName: "Sandrine",    lastName: "MEFOMO",     role: "EMPLOYEE", position: "Assistante RH",                  category: "ETAM N2", contract: "CDI", hireDate: "2020-09-08", department: "Ressources Humaines" },
  { firstName: "Hortense",    lastName: "MVONDO",     role: "ACCOUNTANT", position: "Comptable principal",         category: "Cadre Moyen", contract: "CDI", hireDate: "2018-05-20", department: "Comptabilité" },
  { firstName: "Estelle",     lastName: "EKAMI",      role: "EMPLOYEE", position: "Comptable junior",               category: "ETAM N3", contract: "CDI", hireDate: "2022-10-03", department: "Comptabilité" },
];

function emailFor(p) {
  return `${p.firstName.toLowerCase().replace(/[^a-z]/g, "")}.${p.lastName.toLowerCase().replace(/[^a-z]/g, "")}@batimcam.cm`;
}

function phoneFor(i) {
  const base = 600000000 + i * 137429;
  return `+237 6 ${String(base).slice(0, 2)} ${String(base).slice(2, 4)} ${String(base).slice(4, 6)} ${String(base).slice(6, 8)}`;
}

function matriculeFor(p, i) {
  const yr = new Date(p.hireDate).getFullYear();
  return `EMP-${yr}-${String(100 + i).padStart(5, "0")}`;
}

function employeeIdFor(p, i) {
  return `BC-${String(p.role).slice(0, 3)}-${String(2018 + (i % 8))}-${String(100 + i).padStart(4, "0")}`;
}

/**
 * Barème salarial indicatif BTP Cameroun (FCFA / mois).
 * Dérivé déterministe depuis la catégorie + rôle + ancienneté
 * (les anciens touchent un peu plus que les nouveaux pour réalisme).
 */
function deriveBaseSalary(p) {
  const cat = (p.category || "").toLowerCase();
  const yrs = Math.max(0, Math.floor((Date.now() - new Date(p.hireDate).getTime()) / (365.25 * 86_400_000)));
  let base;

  // Rôles management spécifiques
  if (p.role === "WORKS_MANAGER") base = 950_000;
  else if (p.role === "SITE_MANAGER") base = 500_000;
  else if (p.role === "ACCOUNTANT") base = 750_000;
  // Cadres
  else if (cat.includes("cadre moyen") || cat.includes("cadre m")) base = 850_000;
  else if (cat.includes("cadre hc") || cat.includes("hors classe")) base = 1_400_000;
  else if (cat.includes("cadre")) base = 900_000;
  // ETAM (techniciens / agents de maîtrise admin)
  else if (cat.includes("etam n3")) base = 400_000;
  else if (cat.includes("etam n2")) base = 320_000;
  else if (cat.includes("etam")) base = 360_000;
  // Maîtrise (chefs d'équipe terrain)
  else if (cat.includes("maîtrise n3") || cat.includes("maitrise n3")) base = 480_000;
  else if (cat.includes("maîtrise n2") || cat.includes("maitrise n2")) base = 340_000;
  else if (cat.includes("maîtrise") || cat.includes("maitrise")) base = 380_000;
  // Ouvriers qualifiés
  else if (cat.includes("oq n5")) base = 220_000;
  else if (cat.includes("oq n4")) base = 180_000;
  else if (cat.includes("oq")) base = 195_000;
  // Ouvriers spécialisés
  else if (cat.includes("os n3")) base = 130_000;
  else if (cat.includes("os n2")) base = 110_000;
  else if (cat.includes("os n1")) base = 95_000;
  else if (cat.includes("os")) base = 105_000;
  // Stagiaires / journaliers
  else if (p.contract === "STAGE") base = 120_000;
  else if (p.contract === "JOURNALIER") base = 100_000;
  else base = 150_000; // catch-all

  // Bonus ancienneté : +2 % par année (plafonné à +30 %)
  const seniorityBonus = Math.min(0.30, yrs * 0.02);
  return Math.round(base * (1 + seniorityBonus));
}

function deriveSalaryGrade(p) {
  if (!p.category) return null;
  return `${p.category} · ${p.role === "WORKER" ? "Position terrain" : "Position siège"}`;
}

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  const sites = await prisma.site.findMany({ where: { tenantId: tenant.id }, select: { id: true, code: true } });
  const siteByCode = new Map(sites.map((s) => [s.code, s.id]));

  console.log(`🌱 Seed personnel réel pour ${tenant.name}...`);
  const passwordHash = await bcrypt.hash(PWD, 12);

  let created = 0;
  let updated = 0;

  for (const [i, p] of PERSONNEL.entries()) {
    const email = emailFor(p);
    const matricule = matriculeFor(p, i);
    const employeeId = employeeIdFor(p, i);
    const assignedSiteIds = p.siteCode && siteByCode.has(p.siteCode) ? [siteByCode.get(p.siteCode)] : [];

    const baseSalary = BigInt(deriveBaseSalary(p));
    const salaryGrade = deriveSalaryGrade(p);

    const data = {
      tenantId: tenant.id,
      email,
      passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      role: p.role,
      employeeId,
      matricule,
      hireDate: new Date(p.hireDate),
      position: p.position,
      category: p.category,
      professionalCategory: p.category,
      contractType: p.contract,
      department: p.department ?? null,
      baseSalary,
      salaryGrade,
      phone: phoneFor(i),
      assignedSiteIds,
      emailVerified: true,
      isGuard: p.isGuard ?? false,
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    let user;
    if (existing) {
      user = await prisma.user.update({ where: { email }, data });
      updated++;
    } else {
      user = await prisma.user.create({ data });
      created++;
    }

    // Crée une row SalaryHistory HIRING (idempotent : ignore si déjà présent
    // à la date d'embauche).
    const hireDate = new Date(p.hireDate);
    const existingHist = await prisma.salaryHistory.findFirst({
      where: { userId: user.id, reason: "HIRING" },
    });
    if (!existingHist) {
      await prisma.salaryHistory.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          effectiveAt: hireDate,
          baseSalary,
          previousBase: null,
          reason: "HIRING",
          notes: `Salaire initial à l'embauche (${p.category}).`,
        },
      });
    }
  }

  console.log(`\n✓ Personnel : ${created} créés, ${updated} mis à jour (${PERSONNEL.length} au total)`);

  // Récap par rôle
  const byRole = {};
  for (const p of PERSONNEL) byRole[p.role] = (byRole[p.role] ?? 0) + 1;
  console.log("Répartition :");
  for (const [r, n] of Object.entries(byRole)) console.log(`  - ${r} : ${n}`);

  console.log(`\nTous les comptes ont pour mot de passe : ${PWD}`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
