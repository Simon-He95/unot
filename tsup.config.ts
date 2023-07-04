import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: ['cjs', 'esm'],
  shims: false,
  dts: false,
  external: [
    'vscode',
    '@unocss/webpack',
  ],
  platform: 'node',
})
