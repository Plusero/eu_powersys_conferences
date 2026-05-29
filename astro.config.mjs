import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.github.io",
  base: "/eu_powersys_conferences",
  output: "static",
  build: {
    assets: "_assets",
  },
});
