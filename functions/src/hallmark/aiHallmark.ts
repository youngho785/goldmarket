export type AiHallmarkMaterial =
  | "gold"
  | "silver"
  | "platinum"
  | "plated"
  | "other"
  | "unreadable";

export type AiHallmarkFamily =
  | "gold_14k"
  | "gold_18k"
  | "gold_995"
  | "gold_999"
  | "gold_9999"
  | "gold_24k"
  | "silver_925"
  | "platinum_950"
  | "plated"
  | "other"
  | "unknown";

export type AiHallmarkConfidence =
  | "high"
  | "medium"
  | "low";

export type AiHallmarkReason =
  | "clear_hallmark"
  | "partial_hallmark"
  | "material_marker"
  | "conflict"
  | "unreadable";

export type AiHallmarkResult = {
  material: AiHallmarkMaterial;
  family: AiHallmarkFamily;
  confidence: AiHallmarkConfidence;
  partial: boolean;
  reasonCode: AiHallmarkReason;
};
