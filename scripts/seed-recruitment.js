require("./_guard-prod");
/**
 * Seed du pipeline de recrutement réel BatimCAM SA.
 *
 * 1. Crée 50 candidats externes (rôle CANDIDATE, tenantId=null) avec
 *    profils variés représentatifs du marché BTP camerounais.
 *
 * 2. Crée ~55 candidatures (Application) réparties sur les JobOffer
 *    existantes selon une distribution réaliste de pipeline :
 *      - RECEIVED:      22 (entrant brut)
 *      - SHORTLISTED:   12 (pré-sélection RH)
 *      - INTERVIEW:      8 (entretien programmé)
 *      - TECHNICAL_TEST: 4 (test technique)
 *      - OFFER:          3 (proposition envoyée)
 *      - HIRED:          3 (embauché — finalisation)
 *      - REJECTED:       2 (refus motivé)
 *      - WITHDRAWN:      1 (désistement candidat)
 *
 * Toutes les candidatures sont datées de manière déterministe (J-2 à J-90),
 * avec scoring (0-100) et stage history. Idempotent par contrainte
 * unique (jobOfferId, userId).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const PWD = "Demo2026!";

// 50 profils candidats camerounais — mix de prénoms/noms locaux + profils BTP
const CANDIDATES = [
  // 12 cadres/ingénieurs
  { firstName: "Ghislain",  lastName: "BAYIHA",   desiredJob: "Ingénieur Travaux BTP",     desiredContractType: "CDI", desiredSalaryMin: 800_000, desiredSalaryMax: 1_200_000, location: "Yaoundé",  yrs: 5  },
  { firstName: "Mireille",  lastName: "MBALA",    desiredJob: "Ingénieur d'études",        desiredContractType: "CDI", desiredSalaryMin: 700_000, desiredSalaryMax: 1_000_000, location: "Douala",   yrs: 3  },
  { firstName: "Stéphane",  lastName: "ATANGANA", desiredJob: "Conducteur de Travaux",     desiredContractType: "CDI", desiredSalaryMin: 900_000, desiredSalaryMax: 1_300_000, location: "Yaoundé",  yrs: 7  },
  { firstName: "Audrey",    lastName: "NGUEMA",   desiredJob: "Ingénieur QHSE",            desiredContractType: "CDI", desiredSalaryMin: 750_000, desiredSalaryMax: 1_100_000, location: "Douala",   yrs: 4  },
  { firstName: "Guillaume", lastName: "EVOULA",   desiredJob: "Ingénieur Travaux BTP",     desiredContractType: "CDI", desiredSalaryMin: 850_000, desiredSalaryMax: 1_250_000, location: "Yaoundé",  yrs: 6  },
  { firstName: "Patricia",  lastName: "BIDIAS",   desiredJob: "Ingénieur structures",      desiredContractType: "CDI", desiredSalaryMin: 800_000, desiredSalaryMax: 1_200_000, location: "Douala",   yrs: 5  },
  { firstName: "Hervé",     lastName: "AMOUGOU",  desiredJob: "Responsable QHSE",          desiredContractType: "CDI", desiredSalaryMin: 1_000_000, desiredSalaryMax: 1_500_000, location: "Yaoundé", yrs: 8 },
  { firstName: "Béatrice",  lastName: "ESSAMA",   desiredJob: "Ingénieur méthodes",        desiredContractType: "CDI", desiredSalaryMin: 750_000, desiredSalaryMax: 1_050_000, location: "Douala",   yrs: 4  },
  { firstName: "Maxime",    lastName: "ANDOU",    desiredJob: "Ingénieur Travaux BTP",     desiredContractType: "CDI", desiredSalaryMin: 700_000, desiredSalaryMax: 1_000_000, location: "Yaoundé",  yrs: 2  },
  { firstName: "Jocelyne",  lastName: "OYONO",    desiredJob: "Chef de projet BTP",        desiredContractType: "CDI", desiredSalaryMin: 1_100_000, desiredSalaryMax: 1_600_000, location: "Yaoundé", yrs: 10 },
  { firstName: "Aurélien",  lastName: "BIWOLE",   desiredJob: "Conducteur de Travaux",     desiredContractType: "CDI", desiredSalaryMin: 850_000, desiredSalaryMax: 1_300_000, location: "Douala",   yrs: 6  },
  { firstName: "Clarisse",  lastName: "BAHANAG",  desiredJob: "Comptable chantier",        desiredContractType: "CDI", desiredSalaryMin: 450_000, desiredSalaryMax: 650_000,   location: "Douala",   yrs: 3  },

  // 6 ETAM / techniciens
  { firstName: "Brice",     lastName: "MENGUE",   desiredJob: "Technicien topographe",     desiredContractType: "CDI", desiredSalaryMin: 350_000, desiredSalaryMax: 500_000,   location: "Yaoundé",  yrs: 4 },
  { firstName: "Carole",    lastName: "EKAMI",    desiredJob: "Dessinatrice projeteuse",   desiredContractType: "CDI", desiredSalaryMin: 400_000, desiredSalaryMax: 550_000,   location: "Douala",   yrs: 5 },
  { firstName: "Fabrice",   lastName: "MEFOMO",   desiredJob: "Technicien méthodes",       desiredContractType: "CDD", desiredSalaryMin: 380_000, desiredSalaryMax: 520_000,   location: "Yaoundé",  yrs: 3 },
  { firstName: "Estelle",   lastName: "MEDJO",    desiredJob: "Assistante RH",             desiredContractType: "CDI", desiredSalaryMin: 350_000, desiredSalaryMax: 480_000,   location: "Yaoundé",  yrs: 4 },
  { firstName: "Cyrille",   lastName: "ASSEMBE",  desiredJob: "Magasinier chantier",       desiredContractType: "CDI", desiredSalaryMin: 300_000, desiredSalaryMax: 420_000,   location: "Douala",   yrs: 3 },
  { firstName: "Régine",    lastName: "AYISSI",   desiredJob: "Assistante administrative", desiredContractType: "CDD", desiredSalaryMin: 280_000, desiredSalaryMax: 380_000,   location: "Yaoundé",  yrs: 2 },

  // 22 ouvriers qualifiés
  { firstName: "Boris",     lastName: "KOUAM",    desiredJob: "Maçon-coffreur",            desiredContractType: "CDI", desiredSalaryMin: 180_000, desiredSalaryMax: 250_000,   location: "Yaoundé",  yrs: 6 },
  { firstName: "Donald",    lastName: "FOMENA",   desiredJob: "Ferrailleur",               desiredContractType: "CDI", desiredSalaryMin: 175_000, desiredSalaryMax: 240_000,   location: "Yaoundé",  yrs: 5 },
  { firstName: "Eustache",  lastName: "EBANGA",   desiredJob: "Conducteur d'engins",       desiredContractType: "CDI", desiredSalaryMin: 200_000, desiredSalaryMax: 290_000,   location: "Douala",   yrs: 8 },
  { firstName: "Ferdinand", lastName: "MEKA",     desiredJob: "Électricien Chantier",      desiredContractType: "CDI", desiredSalaryMin: 220_000, desiredSalaryMax: 310_000,   location: "Yaoundé",  yrs: 7 },
  { firstName: "Gaston",    lastName: "ABEGA",    desiredJob: "Plombier",                  desiredContractType: "CDI", desiredSalaryMin: 200_000, desiredSalaryMax: 280_000,   location: "Douala",   yrs: 5 },
  { firstName: "Hilarion",  lastName: "MFOULA",   desiredJob: "Charpentier",               desiredContractType: "CDI", desiredSalaryMin: 195_000, desiredSalaryMax: 270_000,   location: "Yaoundé",  yrs: 6 },
  { firstName: "Ignace",    lastName: "EVINA",    desiredJob: "Soudeur arc",               desiredContractType: "CDI", desiredSalaryMin: 210_000, desiredSalaryMax: 290_000,   location: "Douala",   yrs: 7 },
  { firstName: "Jules",     lastName: "AKAME",    desiredJob: "Mécanicien chantier",       desiredContractType: "CDI", desiredSalaryMin: 220_000, desiredSalaryMax: 310_000,   location: "Yaoundé",  yrs: 8 },
  { firstName: "Kévin",     lastName: "BEKONO",   desiredJob: "Maçon-coffreur",            desiredContractType: "CDD", desiredSalaryMin: 170_000, desiredSalaryMax: 230_000,   location: "Yaoundé",  yrs: 3 },
  { firstName: "Léopold",   lastName: "AKONO",    desiredJob: "Électricien Chantier",      desiredContractType: "CDI", desiredSalaryMin: 200_000, desiredSalaryMax: 280_000,   location: "Douala",   yrs: 4 },
  { firstName: "Modeste",   lastName: "MEDOU",    desiredJob: "Carreleur",                 desiredContractType: "CDI", desiredSalaryMin: 180_000, desiredSalaryMax: 250_000,   location: "Yaoundé",  yrs: 5 },
  { firstName: "Nicolas",   lastName: "AMOUGOU",  desiredJob: "Peintre en bâtiment",       desiredContractType: "CDD", desiredSalaryMin: 165_000, desiredSalaryMax: 220_000,   location: "Douala",   yrs: 4 },
  { firstName: "Olivier",   lastName: "OWONA",    desiredJob: "Ferrailleur",               desiredContractType: "CDI", desiredSalaryMin: 175_000, desiredSalaryMax: 240_000,   location: "Yaoundé",  yrs: 5 },
  { firstName: "Patrick",   lastName: "NDONGO",   desiredJob: "Conducteur d'engins",       desiredContractType: "CDI", desiredSalaryMin: 210_000, desiredSalaryMax: 295_000,   location: "Douala",   yrs: 6 },
  { firstName: "Quentin",   lastName: "AMVAME",   desiredJob: "Maçon",                     desiredContractType: "CDI", desiredSalaryMin: 165_000, desiredSalaryMax: 220_000,   location: "Yaoundé",  yrs: 4 },
  { firstName: "Romaric",   lastName: "OWONA",    desiredJob: "Coffreur",                  desiredContractType: "CDI", desiredSalaryMin: 175_000, desiredSalaryMax: 235_000,   location: "Douala",   yrs: 5 },
  { firstName: "Samuel",    lastName: "MBARGA",   desiredJob: "Soudeur arc",               desiredContractType: "CDI", desiredSalaryMin: 200_000, desiredSalaryMax: 280_000,   location: "Yaoundé",  yrs: 6 },
  { firstName: "Théophile", lastName: "BIDIAS",   desiredJob: "Plombier",                  desiredContractType: "CDI", desiredSalaryMin: 195_000, desiredSalaryMax: 275_000,   location: "Douala",   yrs: 5 },
  { firstName: "Urbain",    lastName: "ONDOA",    desiredJob: "Manutentionnaire stock",    desiredContractType: "CDD", desiredSalaryMin: 130_000, desiredSalaryMax: 180_000,   location: "Yaoundé",  yrs: 2 },
  { firstName: "Vincent",   lastName: "EVOULA",   desiredJob: "Chef d'équipe maçonnerie",  desiredContractType: "CDI", desiredSalaryMin: 280_000, desiredSalaryMax: 380_000,   location: "Douala",   yrs: 9 },
  { firstName: "Wilfried",  lastName: "ANDOU",    desiredJob: "Mécanicien chantier",       desiredContractType: "CDI", desiredSalaryMin: 225_000, desiredSalaryMax: 320_000,   location: "Yaoundé",  yrs: 7 },
  { firstName: "Xavier",    lastName: "MEKA",     desiredJob: "Électricien Chantier",      desiredContractType: "CDI", desiredSalaryMin: 215_000, desiredSalaryMax: 300_000,   location: "Douala",   yrs: 6 },

  // 6 stagiaires / juniors
  { firstName: "Yvan",      lastName: "FOUDA",    desiredJob: "Stagiaire Génie Civil",     desiredContractType: "STAGE", desiredSalaryMin: 80_000, desiredSalaryMax: 120_000,   location: "Yaoundé",  yrs: 0 },
  { firstName: "Zoé",       lastName: "MBARGA",   desiredJob: "Stagiaire Génie Civil",     desiredContractType: "STAGE", desiredSalaryMin: 80_000, desiredSalaryMax: 120_000,   location: "Douala",   yrs: 0 },
  { firstName: "Aimé",      lastName: "MENGUE",   desiredJob: "Ingénieur Travaux junior",  desiredContractType: "CDD", desiredSalaryMin: 500_000, desiredSalaryMax: 700_000,   location: "Yaoundé",  yrs: 1 },
  { firstName: "Charlotte", lastName: "BAYIHA",   desiredJob: "Stagiaire Génie Civil",     desiredContractType: "STAGE", desiredSalaryMin: 100_000, desiredSalaryMax: 150_000,  location: "Yaoundé",  yrs: 0 },
  { firstName: "Édouard",   lastName: "MVONDO",   desiredJob: "Comptable junior",          desiredContractType: "CDD", desiredSalaryMin: 280_000, desiredSalaryMax: 400_000,   location: "Douala",   yrs: 1 },
  { firstName: "Pauline",   lastName: "TSOATA",   desiredJob: "Assistante méthodes",       desiredContractType: "CDD", desiredSalaryMin: 250_000, desiredSalaryMax: 350_000,   location: "Yaoundé",  yrs: 2 },

  // 4 manoeuvres
  { firstName: "Albert",    lastName: "EBONGUE",  desiredJob: "Manœuvre maçon",            desiredContractType: "JOURNALIER", desiredSalaryMin: 70_000, desiredSalaryMax: 110_000, location: "Yaoundé", yrs: 1 },
  { firstName: "Constant",  lastName: "ABOMO",    desiredJob: "Manœuvre terrassement",     desiredContractType: "JOURNALIER", desiredSalaryMin: 70_000, desiredSalaryMax: 110_000, location: "Douala",   yrs: 2 },
  { firstName: "David",     lastName: "MENGUE",   desiredJob: "Aide-coffreur",             desiredContractType: "JOURNALIER", desiredSalaryMin: 75_000, desiredSalaryMax: 115_000, location: "Yaoundé", yrs: 1 },
  { firstName: "Émile",     lastName: "FOMENA",   desiredJob: "Manœuvre",                  desiredContractType: "JOURNALIER", desiredSalaryMin: 70_000, desiredSalaryMax: 110_000, location: "Douala",   yrs: 0 },
];

// Distribution stages → nombre d'applications
const STAGE_DISTRIBUTION = [
  { stage: "RECEIVED",       count: 22 },
  { stage: "SHORTLISTED",    count: 12 },
  { stage: "INTERVIEW",      count: 8 },
  { stage: "TECHNICAL_TEST", count: 4 },
  { stage: "OFFER",          count: 3 },
  { stage: "HIRED",          count: 3 },
  { stage: "REJECTED",       count: 2 },
  { stage: "WITHDRAWN",      count: 1 },
];

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  const offers = await prisma.jobOffer.findMany({
    where: { tenantId: tenant.id, status: "PUBLISHED" },
    select: { id: true, title: true, reference: true, contractType: true },
  });
  if (offers.length === 0) throw new Error("Aucune offre publiée trouvée");

  console.log(`🌱 Seed recrutement pour ${tenant.name}...`);
  const passwordHash = await bcrypt.hash(PWD, 12);

  // 1. Crée/upsert les candidats
  console.log(`\n👤 Création de ${CANDIDATES.length} candidats externes...`);
  const candidateRecords = [];
  for (const [i, c] of CANDIDATES.entries()) {
    const email = `${c.firstName.toLowerCase().replace(/[^a-z]/g, "")}.${c.lastName.toLowerCase().replace(/[^a-z]/g, "")}@email.cm`;
    const existing = await prisma.user.findUnique({ where: { email } });
    const data = {
      email,
      passwordHash,
      firstName: c.firstName,
      lastName: c.lastName,
      role: "CANDIDATE",
      status: "ACTIVE",
      tenantId: null,
      emailVerified: true,
      preferredLanguage: "fr-CM",
      notificationChannel: "EMAIL",
      desiredJob: c.desiredJob,
      desiredContractType: c.desiredContractType,
      desiredLocation: c.location,
      desiredSalaryMin: BigInt(c.desiredSalaryMin),
      desiredSalaryMax: BigInt(c.desiredSalaryMax),
      availability: c.yrs === 0 ? "Immédiate" : "Sous 1 mois",
      phone: `+237 6 ${String(70 + i).slice(0, 2)} ${String(30 + i * 7).slice(0, 2)} ${String(20 + i * 13).slice(0, 2)} ${String(50 + i * 11).slice(0, 2)}`,
    };
    const user = existing
      ? await prisma.user.update({ where: { email }, data })
      : await prisma.user.create({ data });
    candidateRecords.push({ user, profile: c });
  }
  console.log(`  ✓ ${candidateRecords.length} candidats prêts`);

  // 2. Distribuer les candidatures dans les offres + stages
  console.log("\n📋 Création des candidatures...");
  await prisma.application.deleteMany({
    where: { jobOffer: { tenantId: tenant.id } },
  });

  let appIndex = 0;
  let totalCreated = 0;
  for (const dist of STAGE_DISTRIBUTION) {
    for (let n = 0; n < dist.count && appIndex < candidateRecords.length; n++) {
      const cand = candidateRecords[appIndex];
      // Trouver l'offre la plus pertinente — match par mots-clés du titre
      let bestOffer = offers.find((o) =>
        o.title.toLowerCase().includes(cand.profile.desiredJob.toLowerCase().split(" ")[0]),
      );
      if (!bestOffer) bestOffer = offers[appIndex % offers.length];

      // Score déterministe selon stage
      const baseScore = {
        RECEIVED: 50 + (appIndex * 7) % 30,
        SHORTLISTED: 65 + (appIndex * 5) % 25,
        INTERVIEW: 70 + (appIndex * 11) % 25,
        TECHNICAL_TEST: 75 + (appIndex * 13) % 20,
        OFFER: 80 + (appIndex * 17) % 18,
        HIRED: 85 + (appIndex * 7) % 15,
        REJECTED: 30 + (appIndex * 13) % 30,
        WITHDRAWN: 60 + (appIndex * 3) % 25,
      }[dist.stage] ?? 50;

      const daysAgo = 3 + (appIndex * 4) % 87; // 3 à 90 jours
      const appliedAt = new Date(Date.now() - daysAgo * 86_400_000);

      try {
        await prisma.application.create({
          data: {
            jobOfferId: bestOffer.id,
            userId: cand.user.id,
            cvUrl: `/seed/cv-${cand.user.id.slice(-6)}.pdf`,
            coverLetter: `Bonjour,\n\nFort de ${cand.profile.yrs} années d'expérience en ${cand.profile.desiredJob.toLowerCase()}, je souhaite vivement rejoindre vos équipes pour le poste de ${bestOffer.title}.\n\nDisponible ${cand.profile.yrs === 0 ? "immédiatement" : "sous 1 mois"}.\n\nCordialement,\n${cand.profile.firstName} ${cand.profile.lastName}`,
            score: Math.min(100, Math.max(0, baseScore)),
            stage: dist.stage,
            notes: dist.stage === "REJECTED" ? "Profil non aligné sur le poste — score technique en deçà du seuil." :
                   dist.stage === "HIRED" ? "Excellent profil — onboarding planifié." :
                   dist.stage === "OFFER" ? "Offre envoyée le " + new Date(Date.now() - 5 * 86_400_000).toLocaleDateString("fr-FR") :
                   dist.stage === "INTERVIEW" ? "Entretien programmé avec le manager." : null,
            lastStageChangeAt: dist.stage !== "RECEIVED" ? new Date(Date.now() - Math.floor(daysAgo / 2) * 86_400_000) : null,
            appliedAt,
            withdrawnAt: dist.stage === "WITHDRAWN" ? new Date(Date.now() - 5 * 86_400_000) : null,
            withdrawnReason: dist.stage === "WITHDRAWN" ? "Autre opportunité acceptée." : null,
          },
        });
        totalCreated++;
      } catch (err) {
        // Doublon (jobOfferId, userId) — passe à l'offre suivante
        const altOffer = offers[(offers.indexOf(bestOffer) + 1) % offers.length];
        await prisma.application.create({
          data: {
            jobOfferId: altOffer.id,
            userId: cand.user.id,
            score: baseScore,
            stage: dist.stage,
            appliedAt,
          },
        });
        totalCreated++;
      }
      appIndex++;
    }
  }

  console.log(`\n✓ ${totalCreated} candidatures réparties :`);
  for (const dist of STAGE_DISTRIBUTION) {
    const count = await prisma.application.count({
      where: { jobOffer: { tenantId: tenant.id }, stage: dist.stage },
    });
    console.log(`    ${dist.stage.padEnd(16)} : ${count}`);
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
