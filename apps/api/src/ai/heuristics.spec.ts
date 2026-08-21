import { CommercialPriority, ContactDecisionRole, PotentialLevel } from "@gecodis/shared";
import {
  classifyContact,
  computeCommercialPriority,
  computePotential,
  inferRealEstateSignals,
  scoreCompanyNeeds,
} from "./heuristics";

describe("scoreCompanyNeeds", () => {
  it("scores a warehousing company (NAF 5210B) highest on stockage/entrepot", () => {
    const scores = scoreCompanyNeeds({ nafCode: "5210B", employeeCount: 50 });
    expect(scores.stockage).toBeGreaterThanOrEqual(90);
    expect(scores.entrepot).toBeGreaterThanOrEqual(90);
    expect(scores.stockage).toBeGreaterThan(scores.fulfillment);
  });

  it("scores a road freight carrier (NAF 4941A) highest on transport", () => {
    const scores = scoreCompanyNeeds({ nafCode: "4941A", employeeCount: 30 });
    expect(scores.transport).toBeGreaterThanOrEqual(85);
    expect(scores.transport).toBeGreaterThan(scores.entrepot);
  });

  it("boosts fulfillment for e-commerce keywords regardless of NAF", () => {
    const withKeyword = scoreCompanyNeeds({ nafCode: "4778C", activity: "Vente en ligne de vêtements" });
    const without = scoreCompanyNeeds({ nafCode: "4778C" });
    expect(withKeyword.fulfillment).toBeGreaterThan(without.fulfillment);
  });

  it("amplifies scores for larger headcounts without ever exceeding 100", () => {
    const small = scoreCompanyNeeds({ nafCode: "5210B", employeeCount: 5 });
    const large = scoreCompanyNeeds({ nafCode: "5210B", employeeCount: 800 });
    expect(large.stockage).toBeGreaterThanOrEqual(small.stockage);
    for (const value of Object.values(large)) {
      expect(value).toBeLessThanOrEqual(100);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("falls back to low baseline scores with no signal at all", () => {
    const scores = scoreCompanyNeeds({});
    for (const value of Object.values(scores)) {
      expect(value).toBeLessThan(30);
    }
  });
});

describe("computePotential", () => {
  const strongNeeds = { transport: 80, logistique: 80, stockage: 80, affretement: 80, fulfillment: 80, entrepot: 80 };
  const weakNeeds = { transport: 10, logistique: 10, stockage: 10, affretement: 10, fulfillment: 10, entrepot: 10 };

  it("returns TRES_FORT for high revenue + high needs", () => {
    expect(computePotential({ revenue: 25_000_000, needsScores: strongNeeds })).toBe(PotentialLevel.TRES_FORT);
  });

  it("returns FAIBLE for a small company with weak needs", () => {
    expect(computePotential({ revenue: 200_000, needsScores: weakNeeds })).toBe(PotentialLevel.FAIBLE);
  });

  it("does not grant TRES_FORT on revenue alone if needs are weak", () => {
    expect(computePotential({ revenue: 50_000_000, needsScores: weakNeeds })).not.toBe(PotentialLevel.TRES_FORT);
  });

  it("treats a missing revenue as zero rather than throwing", () => {
    expect(computePotential({ needsScores: strongNeeds })).toBe(PotentialLevel.FAIBLE);
  });
});

describe("computeCommercialPriority", () => {
  it.each([
    [PotentialLevel.TRES_FORT, CommercialPriority.A_PLUS],
    [PotentialLevel.FORT, CommercialPriority.A],
    [PotentialLevel.MOYEN, CommercialPriority.B],
    [PotentialLevel.FAIBLE, CommercialPriority.D],
  ])("maps %s potential to %s priority", (potential, expected) => {
    expect(computeCommercialPriority(potential)).toBe(expected);
  });
});

describe("inferRealEstateSignals", () => {
  it("detects warehouse signals from the NAF code alone", () => {
    const result = inferRealEstateSignals({ nafCode: "5210A" });
    expect(result.hasWarehouse).toBe(true);
  });

  it("detects ownership from explicit keywords with higher confidence", () => {
    const result = inferRealEstateSignals({ description: "Entreprise propriétaire de son siège social" });
    expect(result.propertyStatus).toBe("PROPRIETAIRE");
    expect(result.propertyStatusConfidence).toBeGreaterThan(50);
  });

  it("detects tenancy from explicit keywords", () => {
    const result = inferRealEstateSignals({ description: "Locataire de ses locaux, bail commercial 3/6/9" });
    expect(result.propertyStatus).toBe("LOCATAIRE");
  });

  it("stays INCONNU with low confidence when there is no textual signal", () => {
    const result = inferRealEstateSignals({});
    expect(result.propertyStatus).toBe("INCONNU");
    expect(result.propertyStatusConfidence).toBeLessThan(50);
  });

  it("detects multiple warehouses from plural phrasing", () => {
    const result = inferRealEstateSignals({ description: "Exploite plusieurs sites logistiques en France" });
    expect(result.hasMultipleWarehouses).toBe(true);
  });
});

describe("classifyContact", () => {
  it("recognises a président as top decision power", () => {
    expect(classifyContact("Président")).toEqual({ role: ContactDecisionRole.PRESIDENT, power: 100 });
  });

  it("recognises a Directeur Logistique with high power", () => {
    const result = classifyContact("Directrice Logistique Europe");
    expect(result.role).toBe(ContactDecisionRole.DIRECTEUR_LOGISTIQUE);
    expect(result.power).toBeGreaterThanOrEqual(80);
  });

  it("recognises an English-language CEO title", () => {
    expect(classifyContact("CEO & Founder")).toEqual({ role: ContactDecisionRole.CEO, power: 100 });
  });

  it("gives a low score to an unrecognised title", () => {
    const result = classifyContact("Stagiaire marketing");
    expect(result.role).toBe(ContactDecisionRole.AUTRE);
    expect(result.power).toBeLessThan(40);
  });

  it("handles a missing job title gracefully", () => {
    expect(classifyContact(undefined)).toEqual({ role: ContactDecisionRole.AUTRE, power: 20 });
    expect(classifyContact(null)).toEqual({ role: ContactDecisionRole.AUTRE, power: 20 });
  });

  it("does not mistake a plain 'commercial' title for higher roles", () => {
    const result = classifyContact("Commercial terrain");
    expect(result.role).toBe(ContactDecisionRole.COMMERCIAL);
    expect(result.power).toBeLessThan(40);
  });
});
