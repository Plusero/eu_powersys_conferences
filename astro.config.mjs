import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.github.io",
  base: "/powersys_conferences",
  output: "static",
  build: {
    assets: "_assets",
  },
});
