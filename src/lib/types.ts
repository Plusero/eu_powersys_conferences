export interface ConferenceDates {
  start: string;
  end: string;
}

export interface ConferenceDeadlines {
  abstract: string | null;
  fullPaper: string | null;
}

export interface Conference {
  id: string;
  title: string;
  shortTitle: string;
  website: string | null;
  notionUrl: string;
  org: string | null;
  year: number | null;
  location: string | null;
  acceptanceRate: number | null;
  dates: ConferenceDates | null;
  submissionOpens: string | null;
  deadlines: ConferenceDeadlines;
}

export interface ConferencesData {
  syncedAt: string;
  source: {
    database: string;
    notionUrl: string;
  };
  conferences: Conference[];
}
