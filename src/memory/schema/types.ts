export type RecordType = "convention" | "failure" | "decision";

export type Classification = "foundational" | "tactical" | "observational";

export interface Evidence {
  commit?: string;
  file?: string;
}

export interface BaseRecord {
  id?: string;
  type: RecordType;
  recorded_at: string;
  recorded_by: string;
  classification: Classification;
  evidence?: Evidence;
  tags?: string[];
  relates_to?: string[];
  plan_refs?: string[];
}

export interface ConventionRecord extends BaseRecord {
  type: "convention";
  content: string;
}

export interface FailureRecord extends BaseRecord {
  type: "failure";
  description: string;
  resolution: string;
}

export interface DecisionRecord extends BaseRecord {
  type: "decision";
  title: string;
  rationale: string;
}

export type ExpertiseRecord = ConventionRecord | FailureRecord | DecisionRecord;
