/* eslint-disable no-console */
import { Company, PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import {
  classifyContact,
  computeCommercialPriority,
  computePotential,
  inferRealEstateSignals,
  scoreCompanyNeeds,
} from "../src/ai/heuristics";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface SeedCompany {
  name: string;
  siren: string;
  nafCode: string;
  nafLabel: string;
  activity: string;
  description: string;
  city: string;
  postalCode: string;
  department: string;
  address: string;
  employeeCount: number;
  revenue: number;
  netIncome: number;
  capital: number;
  foundedAt: Date;
  phone: string;
  email: string;
  website: string;
  realEstateOverride?: Partial<{
    hasWarehouse: boolean;
    hasMultipleWarehouses: boolean;
    hasIndustrialBuilding: boolean;
    hasLogisticsPlatform: boolean;
    propertyStatus: "PROPRIETAIRE" | "LOCATAIRE" | "INCONNU";
  }>;
  contacts: { firstName: string; lastName: string; jobTitle: string; email: string; phone: string; birthday?: Date }[];
}

const COMPANIES: SeedCompany[] = [
  {
    name: "Fresh Logistique SAS",
    siren: "812345671",
    nafCode: "5210B",
    nafLabel: "Entreposage et stockage frigorifique",
    activity: "Entreposage frigorifique et logistique agroalimentaire, plateforme logistique multi-température",
    description: "Opérateur logistique spécialisé dans l'entreposage frigorifique pour l'agroalimentaire, plusieurs entrepôts régionaux.",
    city: "Lyon",
    postalCode: "69007",
    department: "69",
    address: "12 rue de la Logistique",
    employeeCount: 180,
    revenue: 42_000_000,
    netIncome: 1_850_000,
    capital: 500_000,
    foundedAt: new Date(2005, 3, 12),
    phone: "+33 4 72 00 00 01",
    email: "contact@freshlogistique.fr",
    website: "https://freshlogistique.fr",
    realEstateOverride: { hasWarehouse: true, hasMultipleWarehouses: true, propertyStatus: "PROPRIETAIRE" },
    contacts: [
      { firstName: "Claire", lastName: "Dubreuil", jobTitle: "Directrice Supply Chain", email: "c.dubreuil@freshlogistique.fr", phone: "+33 6 12 34 56 01", birthday: new Date(1979, 7, 22) },
      { firstName: "Yanis", lastName: "Belkacem", jobTitle: "Responsable Entrepôt", email: "y.belkacem@freshlogistique.fr", phone: "+33 6 12 34 56 02" },
      { firstName: "Sophie", lastName: "Martel", jobTitle: "Présidente", email: "s.martel@freshlogistique.fr", phone: "+33 6 12 34 56 03" },
    ],
  },
  {
    name: "TransExpress Rhône-Alpes",
    siren: "823456782",
    nafCode: "4941A",
    nafLabel: "Transports routiers de fret interurbains",
    activity: "Transport routier de fret national et international, flotte de 120 véhicules",
    description: "Transporteur routier régional desservant la France et l'Europe du Sud.",
    city: "Villeurbanne",
    postalCode: "69100",
    department: "69",
    address: "45 avenue du Transport",
    employeeCount: 95,
    revenue: 18_200_000,
    netIncome: 620_000,
    capital: 250_000,
    foundedAt: new Date(1998, 1, 3),
    phone: "+33 4 72 00 00 02",
    email: "contact@transexpress-ra.fr",
    website: "https://transexpress-ra.fr",
    contacts: [
      { firstName: "Marc", lastName: "Guyot", jobTitle: "Directeur Général", email: "m.guyot@transexpress-ra.fr", phone: "+33 6 12 34 56 04" },
      { firstName: "Nadia", lastName: "Ferreira", jobTitle: "Responsable Transport", email: "n.ferreira@transexpress-ra.fr", phone: "+33 6 12 34 56 05" },
    ],
  },
  {
    name: "MegaStock Immobilier Logistique",
    siren: "834567893",
    nafCode: "5210A",
    nafLabel: "Entreposage et stockage non frigorifique",
    activity: "Propriétaire exploitant de plateformes logistiques, plusieurs entrepôts et bâtiments industriels en France",
    description: "Foncière logistique propriétaire de plusieurs entrepôts et plateformes multi-clients.",
    city: "Orléans",
    postalCode: "45100",
    department: "45",
    address: "8 zone logistique du Val de Loire",
    employeeCount: 40,
    revenue: 9_400_000,
    netIncome: 1_100_000,
    capital: 1_000_000,
    foundedAt: new Date(2011, 9, 1),
    phone: "+33 2 38 00 00 03",
    email: "contact@megastock-immo.fr",
    website: "https://megastock-immo.fr",
    realEstateOverride: {
      hasWarehouse: true,
      hasMultipleWarehouses: true,
      hasIndustrialBuilding: true,
      hasLogisticsPlatform: true,
      propertyStatus: "PROPRIETAIRE",
    },
    contacts: [
      { firstName: "Julien", lastName: "Roussel", jobTitle: "Responsable Immobilier", email: "j.roussel@megastock-immo.fr", phone: "+33 6 12 34 56 06" },
      { firstName: "Isabelle", lastName: "Faure", jobTitle: "CEO", email: "i.faure@megastock-immo.fr", phone: "+33 6 12 34 56 07", birthday: new Date(1972, 2, 5) },
    ],
  },
  {
    name: "ShopExpress France",
    siren: "845678904",
    nafCode: "4791A",
    nafLabel: "Vente à distance sur catalogue général",
    activity: "E-commerce généraliste, forte croissance, besoin de fulfillment et de préparation de commandes",
    description: "Pure player e-commerce en forte croissance, cherche à externaliser son fulfillment.",
    city: "Paris",
    postalCode: "75015",
    department: "75",
    address: "20 rue du Commerce",
    employeeCount: 260,
    revenue: 55_000_000,
    netIncome: 2_400_000,
    capital: 2_000_000,
    foundedAt: new Date(2015, 5, 18),
    phone: "+33 1 40 00 00 04",
    email: "contact@shopexpress.fr",
    website: "https://shopexpress.fr",
    realEstateOverride: { propertyStatus: "LOCATAIRE" },
    contacts: [
      { firstName: "Antoine", lastName: "Lemoine", jobTitle: "Directeur Logistique", email: "a.lemoine@shopexpress.fr", phone: "+33 6 12 34 56 08" },
      { firstName: "Léa", lastName: "Girard", jobTitle: "Responsable E-commerce", email: "l.girard@shopexpress.fr", phone: "+33 6 12 34 56 09" },
      { firstName: "Karim", lastName: "Haddad", jobTitle: "Acheteur", email: "k.haddad@shopexpress.fr", phone: "+33 6 12 34 56 10" },
    ],
  },
  {
    name: "Bricomat Industries",
    siren: "856789015",
    nafCode: "2562B",
    nafLabel: "Mécanique industrielle",
    activity: "Fabrication de pièces mécaniques industrielles, import de matières premières",
    description: "Industriel manufacturier avec un site de production et des besoins réguliers de transport et stockage.",
    city: "Saint-Étienne",
    postalCode: "42000",
    department: "42",
    address: "3 rue de l'Industrie",
    employeeCount: 320,
    revenue: 61_000_000,
    netIncome: 3_100_000,
    capital: 3_500_000,
    foundedAt: new Date(1988, 10, 9),
    phone: "+33 4 77 00 00 05",
    email: "contact@bricomat-industries.fr",
    website: "https://bricomat-industries.fr",
    realEstateOverride: { hasIndustrialBuilding: true, propertyStatus: "PROPRIETAIRE" },
    contacts: [
      { firstName: "Frédéric", lastName: "Noel", jobTitle: "Président", email: "f.noel@bricomat-industries.fr", phone: "+33 6 12 34 56 11" },
      { firstName: "Manon", lastName: "Petit", jobTitle: "Responsable Achats", email: "m.petit@bricomat-industries.fr", phone: "+33 6 12 34 56 12" },
    ],
  },
  {
    name: "AgroDistrib Sud-Ouest",
    siren: "867890126",
    nafCode: "4638A",
    nafLabel: "Commerce de gros de produits alimentaires",
    activity: "Distribution de produits alimentaires en gros, réseau régional de points de vente",
    description: "Grossiste alimentaire régional cherchant à optimiser sa chaîne logistique.",
    city: "Toulouse",
    postalCode: "31000",
    department: "31",
    address: "60 route de Bordeaux",
    employeeCount: 75,
    revenue: 24_000_000,
    netIncome: 780_000,
    capital: 400_000,
    foundedAt: new Date(2001, 4, 22),
    phone: "+33 5 61 00 00 06",
    email: "contact@agrodistrib-so.fr",
    website: "https://agrodistrib-so.fr",
    contacts: [
      { firstName: "Sylvie", lastName: "Cazenave", jobTitle: "Directrice Générale", email: "s.cazenave@agrodistrib-so.fr", phone: "+33 6 12 34 56 13" },
      { firstName: "Hugo", lastName: "Fontaine", jobTitle: "Responsable Exploitation", email: "h.fontaine@agrodistrib-so.fr", phone: "+33 6 12 34 56 14" },
    ],
  },
  {
    name: "Petite Boutique Locale",
    siren: "878901237",
    nafCode: "4778C",
    nafLabel: "Autres commerces de détail spécialisés divers",
    activity: "Commerce de détail local, un seul point de vente",
    description: "Petit commerce de proximité, faible volume logistique.",
    city: "Vienne",
    postalCode: "38200",
    department: "38",
    address: "5 place du Marché",
    employeeCount: 5,
    revenue: 400_000,
    netIncome: 25_000,
    capital: 10_000,
    foundedAt: new Date(2019, 2, 1),
    phone: "+33 4 74 00 00 07",
    email: "contact@petiteboutique.fr",
    website: "https://petiteboutique.fr",
    realEstateOverride: { propertyStatus: "LOCATAIRE" },
    contacts: [{ firstName: "Camille", lastName: "Roy", jobTitle: "Gérante", email: "c.roy@petiteboutique.fr", phone: "+33 6 12 34 56 15" }],
  },
  {
    name: "Affret Solutions Europe",
    siren: "889012348",
    nafCode: "5229A",
    nafLabel: "Messagerie, fret express",
    activity: "Affrètement et organisation de transports internationaux, commissionnaire de transport",
    description: "Commissionnaire de transport spécialisé dans l'affrètement international.",
    city: "Marseille",
    postalCode: "13002",
    department: "13",
    address: "100 quai du Port",
    employeeCount: 60,
    revenue: 15_500_000,
    netIncome: 540_000,
    capital: 200_000,
    foundedAt: new Date(2009, 8, 14),
    phone: "+33 4 91 00 00 08",
    email: "contact@affret-solutions.eu",
    website: "https://affret-solutions.eu",
    contacts: [
      { firstName: "Pauline", lastName: "Aubert", jobTitle: "Directrice Supply Chain", email: "p.aubert@affret-solutions.eu", phone: "+33 6 12 34 56 16" },
      { firstName: "Thomas", lastName: "Reynaud", jobTitle: "Commercial", email: "t.reynaud@affret-solutions.eu", phone: "+33 6 12 34 56 17" },
    ],
  },
];

async function main() {
  console.log("🌱 Seed — Gecodis CRM");

  // ── Users ──────────────────────────────────────────────────────────
  const adminPassword = await argon2.hash("Demo1234!");
  const admin = await prisma.user.upsert({
    where: { email: "demo@gecodis.fr" },
    update: {},
    create: {
      email: "demo@gecodis.fr",
      passwordHash: adminPassword,
      firstName: "Alex",
      lastName: "Moreau",
      role: "ADMIN",
    },
  });

  const rep1 = await prisma.user.upsert({
    where: { email: "julie.commercial@gecodis.fr" },
    update: {},
    create: {
      email: "julie.commercial@gecodis.fr",
      passwordHash: adminPassword,
      firstName: "Julie",
      lastName: "Lambert",
      role: "COMMERCIAL",
    },
  });

  const rep2 = await prisma.user.upsert({
    where: { email: "nicolas.commercial@gecodis.fr" },
    update: {},
    create: {
      email: "nicolas.commercial@gecodis.fr",
      passwordHash: adminPassword,
      firstName: "Nicolas",
      lastName: "Perrin",
      role: "COMMERCIAL",
    },
  });

  const reps = [rep1, rep2];

  // ── Companies + Contacts (scored with the same heuristics as the API) ──
  const createdCompanies: Company[] = [];
  for (const seedCompany of COMPANIES) {
    const needsScores = scoreCompanyNeeds(seedCompany);
    const potential = computePotential({ revenue: seedCompany.revenue, needsScores });
    const commercialPriority = computeCommercialPriority(potential);
    const realEstate = inferRealEstateSignals(seedCompany);

    const company = await prisma.company.upsert({
      where: { siren: seedCompany.siren },
      update: {},
      create: {
        name: seedCompany.name,
        siren: seedCompany.siren,
        siret: `${seedCompany.siren}00012`,
        vatNumber: `FR${(Number(seedCompany.siren) % 89) + 10}${seedCompany.siren}`,
        address: seedCompany.address,
        city: seedCompany.city,
        postalCode: seedCompany.postalCode,
        department: seedCompany.department,
        phone: seedCompany.phone,
        email: seedCompany.email,
        website: seedCompany.website,
        employeeCount: seedCompany.employeeCount,
        revenue: seedCompany.revenue,
        netIncome: seedCompany.netIncome,
        capital: seedCompany.capital,
        foundedAt: seedCompany.foundedAt,
        activity: seedCompany.activity,
        nafCode: seedCompany.nafCode,
        nafLabel: seedCompany.nafLabel,
        description: seedCompany.description,
        sector: seedCompany.nafLabel,
        logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(seedCompany.name)}&background=1E293B&color=fff&bold=true`,
        enrichmentStatus: "COMPLETED",
        lastEnrichedAt: new Date(),
        needScoreTransport: needsScores.transport,
        needScoreLogistique: needsScores.logistique,
        needScoreStockage: needsScores.stockage,
        needScoreAffretement: needsScores.affretement,
        needScoreFulfillment: needsScores.fulfillment,
        needScoreEntrepot: needsScores.entrepot,
        potential,
        commercialPriority,
        aiScoredAt: new Date(),
        aiScoreSummary: `Analyse automatique : ${seedCompany.name} présente un potentiel ${potential.toLowerCase().replace("_", " ")} avec une priorité commerciale ${commercialPriority.replace("_", "")}.`,
        propertyStatus: seedCompany.realEstateOverride?.propertyStatus ?? (realEstate.propertyStatus as any),
        propertyStatusConfidence: realEstate.propertyStatusConfidence,
        hasWarehouse: seedCompany.realEstateOverride?.hasWarehouse ?? realEstate.hasWarehouse,
        hasMultipleWarehouses: seedCompany.realEstateOverride?.hasMultipleWarehouses ?? realEstate.hasMultipleWarehouses,
        hasIndustrialBuilding: seedCompany.realEstateOverride?.hasIndustrialBuilding ?? realEstate.hasIndustrialBuilding,
        hasLogisticsPlatform: seedCompany.realEstateOverride?.hasLogisticsPlatform ?? realEstate.hasLogisticsPlatform,
        realEstateConfidence: realEstate.realEstateConfidence,
        ownerUserId: reps[createdCompanies.length % reps.length].id,
        notes: `Fiche créée automatiquement par le script de démonstration Gecodis CRM.`,
      },
    });

    for (const c of seedCompany.contacts) {
      // Contact has no natural unique key in the schema — find-or-create by email within the company keeps re-seeding idempotent.
      const existing = await prisma.contact.findFirst({ where: { companyId: company.id, email: c.email } });
      if (existing) continue;

      const classification = classifyContact(c.jobTitle);
      await prisma.contact.create({
        data: {
          companyId: company.id,
          firstName: c.firstName,
          lastName: c.lastName,
          jobTitle: c.jobTitle,
          email: c.email,
          phone: c.phone,
          mobilePhone: c.phone,
          birthday: c.birthday,
          aiDecisionRole: classification.role,
          aiDecisionPower: classification.power,
          aiClassifiedAt: new Date(),
          influence: classification.power >= 70 ? "DECISIONNAIRE" : classification.power >= 40 ? "INFLUENCEUR" : "UTILISATEUR",
          isDecisionMaker: classification.power >= 70,
        },
      });
    }

    createdCompanies.push(company);
  }

  const [fresh, trans, megastock, shop, bricomat, agro, boutique, affret] = createdCompanies;

  // ── Deals across the pipeline ─────────────────────────────────────
  const dealsSpec = [
    { company: trans, title: "Contrat cadre transport national", stage: "PROSPECT_FROID", value: 120_000 },
    { company: agro, title: "Externalisation stockage Toulouse", stage: "PREMIER_APPEL", value: 260_000, nextIn: 0 },
    { company: affret, title: "Affrètement international Q3", stage: "RELANCE_1", value: 90_000, nextIn: 1 },
    { company: shop, title: "Fulfillment e-commerce national", stage: "RELANCE_2", value: 480_000, nextIn: 2 },
    { company: bricomat, title: "Transport de pièces industrielles", stage: "RDV", value: 150_000, nextIn: 3 },
    { company: boutique, title: "Livraison locale hebdomadaire", stage: "DEVIS", value: 18_000 },
    { company: fresh, title: "Renouvellement entreposage frigorifique", stage: "NEGOCIATION", value: 900_000 },
    { company: megastock, title: "Bail plateforme logistique Orléans", stage: "GAGNE", value: 1_200_000 },
    { company: shop, title: "Pilote entrepôt Lyon", stage: "GAGNE", value: 310_000 },
    { company: boutique, title: "Offre stockage saisonnier", stage: "PERDU", value: 12_000 },
  ] as const;

  for (const [i, spec] of dealsSpec.entries()) {
    const owner = reps[i % reps.length];
    const deal = await prisma.deal.create({
      data: {
        companyId: spec.company.id,
        title: spec.title,
        stage: spec.stage,
        estimatedValue: spec.value,
        probability: spec.stage === "GAGNE" ? 100 : spec.stage === "PERDU" ? 0 : 40 + i * 5,
        ownerUserId: owner.id,
        nextActionLabel: "nextIn" in spec ? "Relance téléphonique" : undefined,
        nextActionDate: "nextIn" in spec ? daysFromNow((spec as any).nextIn) : undefined,
        wonAt: spec.stage === "GAGNE" ? daysAgo(10) : undefined,
        lostAt: spec.stage === "PERDU" ? daysAgo(5) : undefined,
        lostReason: spec.stage === "PERDU" ? "Budget insuffisant" : undefined,
      },
    });
    await prisma.dealStageEvent.create({
      data: { dealId: deal.id, stage: deal.stage, comment: "Opportunité créée (données de démonstration)" },
    });

    if ("nextIn" in spec) {
      await prisma.taskItem.create({
        data: {
          companyId: spec.company.id,
          assigneeId: owner.id,
          title: `Relance — ${spec.title}`,
          dueAt: daysFromNow((spec as any).nextIn),
          isAutomatic: true,
        },
      });
    }
  }

  // ── Activities ────────────────────────────────────────────────────
  const activitySpecs = [
    { company: fresh, type: "APPEL", subject: "Point mensuel", occurredAt: daysAgo(3), durationSec: 900 },
    { company: fresh, type: "EMAIL", subject: "Envoi de la proposition", occurredAt: daysAgo(10) },
    { company: trans, type: "APPEL", subject: "Premier contact", occurredAt: daysAgo(45), durationSec: 480 },
    { company: megastock, type: "RDV", subject: "Visite plateforme Orléans", occurredAt: daysAgo(15) },
    { company: shop, type: "APPEL", subject: "Suivi fulfillment", occurredAt: daysAgo(2), durationSec: 620 },
    { company: bricomat, type: "EMAIL", subject: "Devis transport pièces", occurredAt: daysAgo(60) },
    { company: agro, type: "VISITE", subject: "Audit entrepôt", occurredAt: daysAgo(20) },
    { company: affret, type: "APPEL", subject: "Négociation tarifs", occurredAt: daysAgo(1), durationSec: 540 },
  ] as const;

  for (const a of activitySpecs) {
    await prisma.activity.create({
      data: {
        companyId: a.company.id,
        type: a.type,
        subject: a.subject,
        summary: `Compte rendu : ${a.subject}.`,
        occurredAt: a.occurredAt,
        durationSec: "durationSec" in a ? (a as any).durationSec : undefined,
        ownerUserId: reps[0].id,
      },
    });
  }

  // ── Quotes ────────────────────────────────────────────────────────
  const q1 = await prisma.quote.create({
    data: {
      companyId: megastock.id,
      reference: "DEV-2026-00001",
      amountHt: 1_000_000,
      vatRate: 20,
      amountTtc: 1_200_000,
      status: "SIGNE",
      signedAt: daysAgo(10),
      signedByName: "Isabelle Faure",
      signatureProvider: "mock",
      authorId: rep1.id,
    },
  });
  await prisma.quote.create({
    data: {
      companyId: fresh.id,
      reference: "DEV-2026-00002",
      amountHt: 750_000,
      vatRate: 20,
      amountTtc: 900_000,
      status: "ENVOYE",
      validUntil: daysFromNow(30),
      authorId: rep1.id,
    },
  });
  await prisma.quote.create({
    data: {
      companyId: boutique.id,
      reference: "DEV-2026-00003",
      amountHt: 15_000,
      vatRate: 20,
      amountTtc: 18_000,
      status: "BROUILLON",
      authorId: rep2.id,
    },
  });
  void q1;

  // ── Invoices + costs + profitability (last 3 months) ────────────────
  const invoicedCompanies = [fresh, megastock, shop, trans];
  for (const company of invoicedCompanies) {
    for (let m = 0; m < 3; m++) {
      const period = monthStart(daysAgo(m * 30));
      const revenue = (company.revenue ?? 1_000_000) * 0.02 * (1 + Math.random() * 0.3);
      const amountHt = Math.round(revenue);
      const vatAmount = Math.round(amountHt * 0.2);

      await prisma.invoice.create({
        data: {
          companyId: company.id,
          reference: `FAC-2026-${company.id.slice(-4)}-${m}`,
          amountHt,
          vatAmount,
          amountTtc: amountHt + vatAmount,
          issuedAt: period,
          dueAt: new Date(period.getFullYear(), period.getMonth() + 1, 15),
          paidAt: m > 0 ? period : undefined,
          status: m > 0 ? "PAYEE" : "EN_ATTENTE",
        },
      });

      const isRisky = company.id === trans.id;
      const costRatio = isRisky ? 1.15 : 0.7;
      const totalCost = amountHt * costRatio;
      const costs: [string, number][] = [
        ["TRANSPORT", totalCost * 0.4],
        ["STOCKAGE", totalCost * 0.25],
        ["PREPARATION", totalCost * 0.15],
        ["MANUTENTION", totalCost * 0.1],
        ["PALETTES", totalCost * 0.05],
        ["SAV", totalCost * 0.05],
      ];
      for (const [category, amount] of costs) {
        await prisma.costEntry.create({
          data: { companyId: company.id, category: category as any, amount: Math.round(amount), period },
        });
      }

      const marginAmount = amountHt - totalCost;
      const marginPercent = (marginAmount / amountHt) * 100;
      const rating = marginPercent >= 25 ? "EXCELLENT" : marginPercent >= 12 ? "BON" : marginPercent >= 0 ? "FAIBLE" : "A_RISQUE";

      await prisma.profitabilityRecord.upsert({
        where: { companyId_period: { companyId: company.id, period } },
        update: {},
        create: {
          companyId: company.id,
          period,
          revenue: amountHt,
          transportCost: Math.round(totalCost * 0.4),
          storageCost: Math.round(totalCost * 0.25),
          prepCost: Math.round(totalCost * 0.15),
          handlingCost: Math.round(totalCost * 0.1),
          palletCost: Math.round(totalCost * 0.05),
          savCost: Math.round(totalCost * 0.05),
          marginAmount: Math.round(marginAmount),
          marginPercent,
          rating: rating as any,
        },
      });
    }
  }

  // ── Campaign ──────────────────────────────────────────────────────
  const template = await prisma.campaignTemplate.create({
    data: {
      name: "Relance prospects logistique",
      subject: "Optimisez votre chaîne logistique avec Gecodis",
      bodyHtml: "<p>Bonjour {{firstName}},</p><p>Chez Gecodis, nous accompagnons {{companyName}} sur ses enjeux transport, stockage et fulfillment.</p>",
    },
  });
  await prisma.campaign.create({
    data: {
      name: "Campagne rentrée 2026",
      templateId: template.id,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      segmentFilter: { minRevenue: 1_000_000 },
      status: "BROUILLON",
      authorId: admin.id,
    },
  });

  // ── Real estate assets (detailed entrepôts owned by companies) ─────
  await prisma.companyRealEstateAsset.create({
    data: { companyId: megastock.id, type: "ENTREPOT", city: "Orléans", surfaceSqm: 8500, isOwned: true, confidence: 95, source: "manuel" },
  });
  await prisma.companyRealEstateAsset.create({
    data: { companyId: megastock.id, type: "PLATEFORME_LOGISTIQUE", city: "Tours", surfaceSqm: 15000, isOwned: true, confidence: 90, source: "manuel" },
  });
  await prisma.companyRealEstateAsset.create({
    data: { companyId: fresh.id, type: "ENTREPOT", city: "Lyon", surfaceSqm: 5400, isOwned: true, confidence: 85, source: "manuel" },
  });

  // ── Real estate opportunities (with automatic prospect matching) ───
  async function matchOpportunity(city: string) {
    const candidates = await prisma.company.findMany({
      where: {
        OR: [{ needScoreEntrepot: { gte: 40 } }, { city: { equals: city, mode: "insensitive" } }, { propertyStatus: "LOCATAIRE" }],
      },
      orderBy: { needScoreEntrepot: "desc" },
      take: 25,
      select: { id: true },
    });
    return candidates.map((c) => c.id);
  }

  await prisma.realEstateOpportunity.create({
    data: {
      reference: "IMMO-2026-0001",
      type: "LOCATION",
      title: "Entrepôt classe A — Lyon Est",
      city: "Lyon",
      postalCode: "69800",
      surfaceSqm: 6000,
      dockDoors: 8,
      ceilingHeightM: 10.5,
      price: 480_000,
      pricePerSqm: 80,
      availableFrom: daysFromNow(45),
      description: "Entrepôt logistique classe A, 8 quais, hauteur libre 10,5m, disponible immédiatement.",
      matchedCompanyIds: (await matchOpportunity("Lyon")) as any,
    },
  });
  await prisma.realEstateOpportunity.create({
    data: {
      reference: "IMMO-2026-0002",
      type: "VENTE",
      title: "Plateforme logistique multi-clients — Marseille",
      city: "Marseille",
      postalCode: "13320",
      surfaceSqm: 12000,
      dockDoors: 14,
      price: 9_600_000,
      pricePerSqm: 800,
      description: "Plateforme logistique multi-clients à vendre, proche du port de Marseille-Fos.",
      matchedCompanyIds: (await matchOpportunity("Marseille")) as any,
    },
  });

  // ── Contracts ─────────────────────────────────────────────────────
  await prisma.contract.create({
    data: {
      companyId: fresh.id,
      reference: "CTR-2026-0001",
      title: "Contrat cadre entreposage frigorifique",
      status: "ACTIF",
      startDate: daysAgo(365),
      endDate: daysFromNow(400),
      autoRenew: true,
      noticePeriodDays: 90,
      annualValue: 900_000,
    },
  });
  await prisma.contract.create({
    data: {
      companyId: megastock.id,
      reference: "CTR-2026-0002",
      title: "Bail commercial plateforme Orléans",
      status: "ACTIF",
      startDate: daysAgo(700),
      endDate: daysFromNow(45),
      autoRenew: false,
      noticePeriodDays: 60,
      annualValue: 1_200_000,
    },
  });

  // ── Client portal demo account ──────────────────────────────────────
  const freshContact = await prisma.contact.findFirst({ where: { companyId: fresh.id, jobTitle: "Présidente" } });
  const portalPasswordHash = await argon2.hash("Client1234!");
  await prisma.portalUser.upsert({
    where: { email: "client@freshlogistique.fr" },
    update: {},
    create: {
      companyId: fresh.id,
      contactId: freshContact?.id,
      email: "client@freshlogistique.fr",
      passwordHash: portalPasswordHash,
    },
  });

  console.log("✅ Seed terminé.");
  console.log("   Connexion démo (staff) : demo@gecodis.fr / Demo1234!");
  console.log("   Connexion démo (portail client) : client@freshlogistique.fr / Client1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
