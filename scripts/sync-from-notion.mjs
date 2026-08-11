#!/usr/bin/env node
/**
 * Sync conferences from the Notion database "List of Specific Conferences"
 * into data/conferences.json for the static site.
 *
 * Requires: NOTION_API_KEY
 * Optional: NOTION_DATABASE_ID, NOTION_DATA_SOURCE_ID
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "conferences.json");

/** Load `.env` from project root (does not override existing env vars). */
function loadEnvFile() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

const DEFAULT_DATABASE_ID = "";
const DEFAULT_DATA_SOURCE_ID = "";

function normalizeId(id) {
  return id.replace(/-/g, "");
}

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    console.error(`Missing ${name}. Set it in .env or the environment.`);
    process.exit(1);
  }
  return value;
}

function pageUrl(page) {
  if (page.url) return page.url;
  return `https://www.notion.so/${normalizeId(page.id)}`;
}

async function notionFetch(path, apiKey, options = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

function accessHelp(integrationName = "your integration") {
  return (
    `Your Notion integration cannot see this database yet.\n\n` +
    `1. Open https://www.notion.so/my-integrations\n` +
    `2. Open integration "${integrationName}" → **Content access** → **Edit access**\n` +
    `3. Add **List of Specific Conferences**\n` +
    `4. Copy the **Internal integration secret** from that integration into .env as NOTION_API_KEY\n` +
    `5. Run: npm run sync\n`
  );
}

async function assertIntegrationAccess(apiKey) {
  const { res, body } = await notionFetch("/search", apiKey, {
    method: "POST",
    body: JSON.stringify({ page_size: 1 }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("NOTION_API_KEY is invalid or revoked. Create a new secret in Notion integrations.");
    }
    throw new Error(`Notion search failed (${res.status}): ${JSON.stringify(body)}`);
  }

  if ((body.results ?? []).length === 0) {
    throw new Error(
      accessHelp("eu-conf") +
        "\n(Diagnostic: integration search returned 0 pages/databases — nothing is connected yet.)"
    );
  }
}

async function resolveDataSourceId(apiKey) {
  const fromEnv = process.env.NOTION_DATA_SOURCE_ID;
  if (fromEnv) return normalizeId(fromEnv);

  const databaseId = normalizeId(
    requireEnv("NOTION_DATABASE_ID", DEFAULT_DATABASE_ID)
  );

  const { res, body } = await notionFetch(`/databases/${databaseId}`, apiKey);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(accessHelp("eu-conf") + `\nAPI: ${JSON.stringify(body)}`);
    }
    throw new Error(`Could not load database (${res.status}): ${JSON.stringify(body)}`);
  }

  const dataSourceId = body.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error(
      "Database loaded but has no data sources. Set NOTION_DATA_SOURCE_ID in .env."
    );
  }

  return normalizeId(dataSourceId);
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

const SHORT_TITLE_SKIP = new Set([
  "ieee",
  "pes",
  "international",
  "conference",
  "conferences",
  "exhibition",
  "on",
  "the",
  "and",
  "of",
  "for",
]);

function shortTitle(title) {
  if (/^IEEE PES (?:GM|IM) 20\d{2}$/.test(title)) return title;

  const yearMatch = title.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1];
  const beforeYear = (year ? title.split(year)[0] : title)
    .replace(/[|–—-].*$/, "")
    .trim();

  const words = beforeYear
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter(Boolean);

  let start = 0;
  while (start < words.length && SHORT_TITLE_SKIP.has(words[start].toLowerCase())) {
    start++;
  }
  const significant = words.slice(start);

  if (significant.length === 0) {
    return title.length > 48 ? `${title.slice(0, 45)}…` : title;
  }

  const first = significant[0];
  const looksLikeAcronym = /^[A-Z]{2,}[A-Za-z0-9]*$/.test(first);

  if (looksLikeAcronym && year) {
    let label = first;
    const next = significant[1];
    if (next && /^[A-Z][a-z]+$/.test(next) && next.length <= 12) {
      label = `${first} ${next}`;
    }
    return `${label} ${year}`;
  }

  if (year && beforeYear.length > 40) {
    return `${significant.slice(0, 3).join(" ")} ${year}`.trim();
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
  return prop?.title?.map((t) => t.plain_text).join("") ?? "";
}

function getText(prop) {
  if (!prop) return null;
  if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("") || null;
  return null;
}

function getUrl(prop) {
  if (!prop?.url) return null;
  return prop.url.trim() || null;
}

function mapPage(page) {
  const p = page.properties;
  const nameRaw = getTitle(p.Name ?? p.name);
  const { title: titleFromLink, website: websiteFromName } = parseMarkdownLink(nameRaw);
  const title = nameRaw.includes("[") ? titleFromLink : nameRaw;
  const website = getUrl(p["Official website"]) ?? websiteFromName;

  return {
    id: page.id,
    title,
    shortTitle: shortTitle(title),
    website,
    notionUrl: pageUrl(page),
    org: getSelect(p.Org),
    year: getSelect(p.Year) ? Number(getSelect(p.Year)) : null,
    location: getText(p.Location),
    acceptanceRate: getNumber(p["Acceptance Rate"]),
    dates: getDateRange(p.Date),
    submissionOpens: getDate(p["submission opening"] ?? p["submission opens"]),
    deadlines: {
      abstract: getDate(p["abstract ddl"]),
      fullPaper: getDate(p["full paper submission ddl"]),
    },
  };
}

async function queryAll(dataSourceId, apiKey) {
  const conferences = [];
  let cursor;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const { res, body: data } = await notionFetch(
      `/data_sources/${dataSourceId}/query`,
      apiKey,
      { method: "POST", body: JSON.stringify(body) }
    );

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(accessHelp("eu-conf") + `\nAPI: ${JSON.stringify(data)}`);
      }
      throw new Error(`Notion API error ${res.status}: ${JSON.stringify(data)}`);
    }

    for (const page of data.results ?? []) {
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

  console.log("Checking Notion integration access…");
  await assertIntegrationAccess(apiKey);

  const dataSourceId = await resolveDataSourceId(apiKey);
  console.log("Fetching conferences from Notion…");
  const conferences = await queryAll(dataSourceId, apiKey);

  const output = {
    syncedAt: new Date().toISOString(),
    source: {
      database: "List of Specific Conferences",
      notionUrl: "https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    conferences,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Wrote ${conferences.length} conferences to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
