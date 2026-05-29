import type { Conference, ConferencesData } from "./types";
import rawData from "../../data/conferences.json";

const data = rawData as ConferencesData;

export function getConferencesData(): ConferencesData {
  return data;
}

export function getConferences(): Conference[] {
  return data.conferences;
}

export function getOrgs(conferences: Conference[]): string[] {
  return [...new Set(conferences.map((c) => c.org).filter(Boolean))].sort() as string[];
}

export function getYears(conferences: Conference[]): number[] {
  return [...new Set(conferences.map((c) => c.year).filter(Boolean))].sort() as number[];
}
