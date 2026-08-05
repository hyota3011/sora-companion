import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'

const manifest = {
  manifest_version: 3,
  name: 'LLM Chat UI',
  version: '0.0.0',
  action: { default_popup: 'index.html' },
  permissions: ['tabs', 'scripting'],
  host_permissions: ['<all_urls>'],
}

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  base: "./",
  envPrefix: ["VITE_", "PROVIDER_"]
})
