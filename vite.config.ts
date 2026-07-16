import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  // GitHub Pages project sites are served under /<repo-name>/.
  // Change this value if you publish the code under a different repository name.
  base:
    mode === "production"
      ? "/agentic-money-movement-command-center/"
      : "/",
  plugins: [react(), tailwindcss()],
}));
