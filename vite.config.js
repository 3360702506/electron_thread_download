import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 确保打包后的资源路径是相对路径
  build: {
    outDir: 'dist', // 输出目录
    emptyOutDir: true, // 构建前清空输出目录
    sourcemap: false, // 不生成 source map
    chunkSizeWarningLimit: 2000, // 调整代码块大小警告的限制
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // 设置@符号为src目录的别名
    },
  },
})
