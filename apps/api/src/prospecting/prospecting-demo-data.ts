/**
 * Offline fallback used when neither PAPPERS_API_KEY nor INSEE_SIRENE_CONSUMER_KEY
 * is configured — same "always demo-able without API keys" principle as the rest
 * of the enrichment pipeline (see enrichment/providers/demo-fallback.provider.ts).
 * Entirely fictional companies, clearly flagged `source: "demo"` in every result
 * so nobody mistakes them for a real prospect list.
 */
export interface DemoProspect {
  name: string;
  city: string;
  postalCode: string;
  nafCode: string;
  employeeCount: number;
  revenue: number;
  activity: string;
}

export const DEMO_PROSPECTS: DemoProspect[] = [
  {
    name: "Conserverie du Ponant",
    city: "Lorient",
    postalCode: "56100",
    nafCode: "1020Z",
    employeeCount: 140,
    revenue: 28_000_000,
    activity: "Transformation et conditionnement de produits de la mer. Dispose de sa propre flotte de camions frigorifiques et d'entrepôts propres pour la distribution régionale.",
  },
  {
    name: "Terres de Beauce",
    city: "Orléans",
    postalCode: "45000",
    nafCode: "1039B",
    employeeCount: 65,
    revenue: 9_500_000,
    activity: "Transformation de légumes. La logistique de distribution est sous-traitée à un prestataire externe depuis 2021.",
  },
  {
    name: "Fret Atlantique Services",
    city: "Nantes",
    postalCode: "44000",
    nafCode: "4941A",
    employeeCount: 220,
    revenue: 34_000_000,
    activity: "Transport routier de marchandises longue distance, affrètement national et international.",
  },
  {
    name: "Rhône Logistique Distribution",
    city: "Lyon",
    postalCode: "69003",
    nafCode: "5210B",
    employeeCount: 95,
    revenue: 15_000_000,
    activity: "Entreposage et stockage frigorifique. Plateforme logistique de 12 000 m² sur plusieurs sites régionaux.",
  },
  {
    name: "NordShop Fulfillment",
    city: "Lille",
    postalCode: "59000",
    nafCode: "4791B",
    employeeCount: 40,
    revenue: 6_200_000,
    activity: "Vente en ligne d'articles de sport. Préparation de commandes confiée à un prestataire logistique (3PL) basé à Roubaix.",
  },
  {
    name: "Bâtir Sud-Ouest",
    city: "Bordeaux",
    postalCode: "33000",
    nafCode: "4120A",
    employeeCount: 180,
    revenue: 42_000_000,
    activity: "Construction de bâtiments industriels et commerciaux. Site industriel propre pour la préfabrication.",
  },
  {
    name: "Alpes Négoce Gros",
    city: "Grenoble",
    postalCode: "38000",
    nafCode: "4690Z",
    employeeCount: 55,
    revenue: 18_000_000,
    activity: "Commerce de gros interindustriel. Recherche active d'un partenaire logistique — logistique actuellement non structurée.",
  },
];
