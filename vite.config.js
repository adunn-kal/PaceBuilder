import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Repo-name base so asset URLs resolve when hosted at
  // https://<user>.github.io/PaceBuilder/. Change this if the repo is renamed.
  base: '/PaceBuilder/',
  build: {
    // Build straight into ./docs so GitHub Pages can serve from the docs folder
    // on the default branch. Run `npm run build`, then commit & push docs/.
    outDir: 'docs',
    emptyOutDir: true,
  },
})
