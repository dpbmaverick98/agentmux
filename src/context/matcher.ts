import type { ExpertiseRecord } from "../memory/schema/types.ts";

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

function getRecordText(record: ExpertiseRecord): string {
  switch (record.type) {
    case "convention":
      return record.content;
    case "failure":
      return `${record.description} ${record.resolution}`;
    case "decision":
      return `${record.title} ${record.rationale}`;
  }
}

export function matchMemories(
  records: ExpertiseRecord[],
  message: string,
  maxResults: number = 2,
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
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxResults).map((s) => s.record);
}

export function formatMemoryForInjection(record: ExpertiseRecord): string {
  switch (record.type) {
    case "convention":
      return `[context] ${record.content}`;
    case "failure":
      return `[context] ${record.description} → ${record.resolution}`;
    case "decision":
      return `[context] ${record.title}: ${record.rationale}`;
  }
}
