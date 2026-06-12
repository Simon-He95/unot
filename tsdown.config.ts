import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'node14',
  format: ['cjs'],
  external: [
    'vscode',
  ],
  noExternal: [
    '@typescript-eslint/typescript-estree',
    '@vscode-use/createwebview',
    'fast-glob',
    'svelte',
    'svelte/compiler',
    'transform-to-unocss',
    'transform-to-unocss-core',
  ],
  // minify: true,
  clean: true,
  platform: 'node', // 明确指定为 Node.js 平台
})
