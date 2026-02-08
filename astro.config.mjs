// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://bitsymphony.net",
  integrations: [mdx(), sitemap(), react()],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // This is related to a bug in the cloudflare worker due to React 19.
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
  env: {
    schema: {},
  },
});
