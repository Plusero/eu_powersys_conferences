# European Power Systems Conferences

A static site that showcases conferences from the Notion database [**List of Specific Conferences**](https://www.notion.so/2a7d565de07680eea8f0d3cf50740ede). Browse dates, locations, submission deadlines, and links to official sites — filtered by year and organization.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Sync from Notion

1. Create a [Notion integration](https://www.notion.so/my-integrations) and copy the API key.
2. **Connect the integration to the database** (required — without this, sync fails with `object_not_found`):
   - https://www.notion.so/my-integrations → your integration (e.g. **eu-conf**) → **Content access** → **Edit access** → add [List of Specific Conferences](https://www.notion.so/2a7d565de07680eea8f0d3cf50740ede)
3. Use the **Internal integration secret** from that same integration as `NOTION_API_KEY` in `.env` (not a key from a different integration).
4. Copy `.env.example` to `.env` and set `NOTION_API_KEY`.
5. Run (the sync script loads `.env` automatically):

```bash
npm run sync
npm run dev
```

This refreshes `data/conferences.json`, which the site reads at build time.

## Build & deploy

```bash
npm run build
npm run preview
```

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`. Enable **Pages** in the repo settings (source: GitHub Actions).

If your repo name is not `eu_powersys_conferences`, update `base` in `astro.config.mjs` to match `/your-repo-name/`.

## Data model

Each conference includes:

| Field                           | Source (Notion)                             |
| ------------------------------- | ------------------------------------------- |
| Title                           | `Name`                                      |
| Official website                | `Official website` (falls back to link in `Name` if empty) |
| Organization                    | `Org`                                       |
| Year                            | `Year`                                      |
| Location                        | `Location`                                  |
| Conference dates                | `Date`                                      |
| Abstract / full-paper deadlines | `abstract ddl`, `full paper submission ddl` |
| Submission portal opens         | `submission opening` (optional; before this date, status is “Opening soon”) |
| Acceptance rate                 | `Acceptance Rate`                           |

## Tech stack

- [Astro](https://astro.build) — static site generator
- Notion API — optional sync script (`scripts/sync-from-notion.mjs`)
