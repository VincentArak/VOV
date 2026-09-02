import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { localBackupPlugin } from './vite/local-backup-plugin.js'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    localBackupPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VOV Task Manager',
        short_name: 'VOV',
        description: 'Quest-style task manager',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
