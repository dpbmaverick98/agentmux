import type { ExpertiseRecord } from "../memory/schema/types.ts";
import { getRecordText, formatRecord } from "../lib/format.ts";

export function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const stopWords = new Set([
    "the", "and", "for", "with", "this", "that", "from", "have", "has",
    "will", "would", "could", "should", "what", "when", "where", "which",
    "there", "were", "been", "being", "some", "them", "they", "these",
    "those", "about", "into", "more", "such", "into", "after", "before",
  ]);

  return [...new Set(tokens.filter((t) => !stopWords.has(t)))];
}

export function calculateRelevance(
  record: ExpertiseRecord,
  keywords: string[],
): number {
  let score = 0;
  const recordText = getRecordText(record).toLowerCase();
  const recordKeywords = extractKeywords(recordText);

  for (const kw of keywords) {
    if (recordKeywords.includes(kw)) {
      score += 1;
    }
  }

  if (record.classification === "foundational") {
    score *= 1.5;
  }

  return score;
}

export function matchMemories(
  records: ExpertiseRecord[],
  message: string,
  maxResults: number = 2,
  minScore: number = 1.0,
): ExpertiseRecord[] {
  const keywords = extractKeywords(message);

  if (keywords.length === 0) {
    return [];
  }

  const scored = records
    .map((record) => ({
      record,
      score: calculateRelevance(record, keywords),
    }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((s) => s.record);
}

export function formatMemoryForInjection(record: ExpertiseRecord): string {
  return formatRecord(record, "injection");
}
