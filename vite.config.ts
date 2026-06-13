import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { homeAnalysisMiddleware } from './src/analyzePlugin'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/my-website/' : '/',
  plugins: [
    react(),
    {
      name: 'home-analysis-api',
      configureServer(server) {
        server.middlewares.use(homeAnalysisMiddleware())
      },
      configurePreviewServer(server) {
        server.middlewares.use(homeAnalysisMiddleware())
      },
    },
  ],
})
