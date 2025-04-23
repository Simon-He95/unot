import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'node14',
  format: ['cjs'],
  external: [
    'vscode',
  ],
  // minify: true,
  clean: true,
  platform: 'node', // 明确指定为 Node.js 平台
})
