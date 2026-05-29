import type { Conference, ConferenceDeadlines } from "./types";
import { daysUntil, formatDate } from "./format";

export type SubmissionThresholdKind = "abstract" | "fullPaper";

export type SubmissionStatusKind =
  | "accepting"
  | "opens_soon"
  | "closed"
  | "none";

export interface SubmissionThreshold {
  date: string;
  kind: SubmissionThresholdKind;
}

export interface SubmissionStatus {
  kind: SubmissionStatusKind;
  /** Short label for the badge, e.g. "Accepting submissions" */
  label: string;
  /** Secondary detail line, e.g. "Abstract due 2 Nov 2026" */
  detail: string | null;
  threshold: SubmissionThreshold | null;
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

function thresholdDetail(threshold: SubmissionThreshold): string {
  const label = threshold.kind === "abstract" ? "Abstract" : "Full paper";
  return `${label} due ${formatDate(threshold.date)}`;
}

export function getSubmissionStatus(
  conference: Conference,
  now = new Date()
): SubmissionStatus {
  const threshold = getSubmissionThreshold(conference.deadlines);
  if (!threshold) {
    return { kind: "none", label: "", detail: null, threshold: null };
  }

  if (daysUntil(threshold.date, now) < 0) {
    return {
      kind: "closed",
      label: "Submissions closed",
      detail: thresholdDetail(threshold),
      threshold,
    };
  }

  const opens = conference.submissionOpens;
  if (opens && daysUntil(opens, now) > 0) {
    return {
      kind: "opens_soon",
      label: "Submissions not open yet",
      detail: `Opens ${formatDate(opens)}`,
      threshold,
    };
  }

  return {
    kind: "accepting",
    label: "Accepting submissions",
    detail: thresholdDetail(threshold),
    threshold,
  };
}

/** Portal is open and the submission cutoff has not passed. */
export function acceptsSubmissions(conference: Conference, now = new Date()): boolean {
  return getSubmissionStatus(conference, now).kind === "accepting";
}

/** Cutoff not passed, but portal may not be open yet. */
export function hasUpcomingSubmission(conference: Conference, now = new Date()): boolean {
  const status = getSubmissionStatus(conference, now);
  return status.kind === "accepting" || status.kind === "opens_soon";
}

export function sortConferencesForDisplay(conferences: Conference[]): Conference[] {
  const rank = (c: Conference) => {
    const kind = getSubmissionStatus(c).kind;
    if (kind === "accepting") return 0;
    if (kind === "opens_soon") return 1;
    return 2;
  };

  return [...conferences].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;

    const aThreshold = getSubmissionThreshold(a.deadlines);
    const bThreshold = getSubmissionThreshold(b.deadlines);
    if (aThreshold && bThreshold) {
      return aThreshold.date.localeCompare(bThreshold.date);
    }

    if (a.year !== b.year) return (a.year ?? 0) - (b.year ?? 0);
    const aStart = a.dates?.start ?? "";
    const bStart = b.dates?.start ?? "";
    return aStart.localeCompare(bStart);
  });
}
