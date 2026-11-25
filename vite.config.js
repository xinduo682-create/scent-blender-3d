import { defineConfig } from 'vite'

// GitHub Pages 部署在 /<repo>/ 子路径下，构建产物必须用相对路径引用资源
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
}))
