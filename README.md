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
2. Open the database in Notion → **⋯** → **Connections** → add your integration.
3. Copy `.env.example` to `.env` and set `NOTION_API_KEY`.
4. Run:

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

| Field | Source (Notion) |
|-------|-----------------|
| Title & website | `Name` (markdown link) |
| Organization | `Org` |
| Year | `Year` |
| Location | `Location` |
| Conference dates | `Date` |
| Abstract / full-paper deadlines | `abstract ddl`, `full paper submission ddl` |
| Acceptance rate | `Acceptance Rate` |

## Tech stack

- [Astro](https://astro.build) — static site generator
- Notion API — optional sync script (`scripts/sync-from-notion.mjs`)
