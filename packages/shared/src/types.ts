import { NeedsScoreKey } from "./enums";

/** AI-computed need scores, 0-100 each, produced by the scoring engine. */
export type NeedsScores = Record<NeedsScoreKey, number>;

/** A confidence-annotated boolean fact inferred by the AI (e.g. "is owner?"). */
export interface AiInference<T = boolean> {
  value: T;
  confidence: number; // 0-100
  source?: string; // e.g. "pappers", "google_maps", "linkedin"
  updatedAt?: string;
}

export interface DashboardStats {
  prospectsCount: number;
  clientsCount: number;
  totalRevenue: number;
  totalMargin: number;
  conversionRate: number;
  forecastRevenue: number;
  pipelineByStage: { stage: string; count: number; value: number }[];
  topSalesReps: { userId: string; name: string; won: number; revenue: number }[];
  dailyActivity: { date: string; calls: number; emails: number; meetings: number }[];
}

export interface AiAssistantMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}
