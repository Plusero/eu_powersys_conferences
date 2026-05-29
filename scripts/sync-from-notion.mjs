#!/usr/bin/env node
/**
 * Sync conferences from the Notion database "List of Specific Conferences"
 * into data/conferences.json for the static site.
 *
 * Requires: NOTION_API_KEY, NOTION_DATABASE_ID (or uses default from .env.example)
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "conferences.json");

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const DEFAULT_DATABASE_ID = "2a7d565de07680eea8f0d3cf50740ede";

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    console.error(`Missing ${name}. Set it in .env or the environment.`);
    process.exit(1);
  }
  return value;
}

function parseMarkdownLink(text) {
  if (!text) return { title: "", website: null };
  const cleaned = text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D🆙⬆️]+\s*/u, "");
  const match = cleaned.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  if (match) {
    return { title: match[1].trim(), website: match[2] };
  }
  return { title: cleaned.trim(), website: null };
}

function shortTitle(title) {
  const yearMatch = title.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1];
  const beforeYear = year ? title.split(year)[0].trim() : title;
  const acronym = beforeYear.match(/^([A-Z][A-Za-z0-9&.-]{1,20})/)?.[1];
  if (acronym && year) return `${acronym} ${year}`;
  if (year && title.length > 40) {
    const words = beforeYear.split(/\s+/).slice(0, 3).join(" ");
    return `${words} ${year}`.trim();
  }
  return title.length > 48 ? `${title.slice(0, 45)}…` : title;
}

function getDate(prop) {
  if (!prop?.date) return null;
  return prop.date.start ?? null;
}

function getDateRange(prop) {
  if (!prop?.date) return null;
  const { start, end } = prop.date;
  if (!start) return null;
  return { start, end: end ?? start };
}

function getNumber(prop) {
  if (prop?.number == null) return null;
  return prop.number;
}

function getSelect(prop) {
  return prop?.select?.name ?? null;
}

function getTitle(prop) {
  const plain = prop?.title?.map((t) => t.plain_text).join("") ?? "";
  return plain;
}

function getText(prop) {
  if (!prop) return null;
  if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("") || null;
  return null;
}

function mapPage(page) {
  const p = page.properties;
  const nameRaw = getTitle(p.Name ?? p.name);
  const { title, website } = parseMarkdownLink(nameRaw);

  return {
    id: page.id,
    title,
    shortTitle: shortTitle(title),
    website,
    notionUrl: page.url,
    org: getSelect(p.Org),
    year: getSelect(p.Year) ? Number(getSelect(p.Year)) : null,
    location: getText(p.Location),
    acceptanceRate: getNumber(p["Acceptance Rate"]),
    dates: getDateRange(p.Date),
    deadlines: {
      abstract: getDate(p["abstract ddl"]),
      fullPaper: getDate(p["full paper submission ddl"]),
    },
  };
}

async function queryAll(databaseId, apiKey) {
  const conferences = [];
  let cursor;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    for (const page of data.results) {
      conferences.push(mapPage(page));
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  conferences.sort((a, b) => {
    if (a.year !== b.year) return (a.year ?? 0) - (b.year ?? 0);
    const aStart = a.dates?.start ?? "";
    const bStart = b.dates?.start ?? "";
    return aStart.localeCompare(bStart);
  });

  return conferences;
}

async function main() {
  const apiKey = requireEnv("NOTION_API_KEY");
  const databaseId = requireEnv("NOTION_DATABASE_ID", DEFAULT_DATABASE_ID).replace(/-/g, "");

  console.log("Fetching conferences from Notion…");
  const conferences = await queryAll(databaseId, apiKey);

  const output = {
    syncedAt: new Date().toISOString(),
    source: {
      database: "List of Specific Conferences",
      notionUrl: "https://www.notion.so/2a7d565de07680eea8f0d3cf50740ede",
    },
    conferences,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${conferences.length} conferences to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
