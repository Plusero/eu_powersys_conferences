import type { Conference, ConferenceDeadlines } from "./types";
import { daysUntil, formatDate } from "./format";

export type SubmissionThresholdKind = "abstract" | "fullPaper";

export interface SubmissionThreshold {
  date: string;
  kind: SubmissionThresholdKind;
}

/** Abstract deadline if set; otherwise full-paper deadline. */
export function getSubmissionThreshold(
  deadlines: ConferenceDeadlines
): SubmissionThreshold | null {
  if (deadlines.abstract) {
    return { date: deadlines.abstract, kind: "abstract" };
  }
  if (deadlines.fullPaper) {
    return { date: deadlines.fullPaper, kind: "fullPaper" };
  }
  return null;
}

export function acceptsSubmissions(conference: Conference, now = new Date()): boolean {
  const threshold = getSubmissionThreshold(conference.deadlines);
  if (!threshold) return false;
  return daysUntil(threshold.date, now) >= 0;
}

export function submissionDeadlineLabel(kind: SubmissionThresholdKind): string {
  return kind === "abstract" ? "Abstract" : "Full paper";
}

export function formatSubmissionCloses(threshold: SubmissionThreshold): string {
  const label = submissionDeadlineLabel(threshold.kind);
  return `${label} due ${formatDate(threshold.date)}`;
}

export function sortConferencesForDisplay(conferences: Conference[]): Conference[] {
  return [...conferences].sort((a, b) => {
    const aOpen = acceptsSubmissions(a);
    const bOpen = acceptsSubmissions(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;

    const aThreshold = getSubmissionThreshold(a.deadlines);
    const bThreshold = getSubmissionThreshold(b.deadlines);
    if (aOpen && bOpen && aThreshold && bThreshold) {
      return aThreshold.date.localeCompare(bThreshold.date);
    }

    if (a.year !== b.year) return (a.year ?? 0) - (b.year ?? 0);
    const aStart = a.dates?.start ?? "";
    const bStart = b.dates?.start ?? "";
    return aStart.localeCompare(bStart);
  });
}
