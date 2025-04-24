import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'node14',
  format: ['cjs'],
  external: ['vscode'],
  // minify: true,
  clean: true,
  platform: 'node', // 明确指定为 Node.js 平台
  plugins: [
    {
      name: 'external-vue-sfc-compiler',
      async resolveId(id, importer, options) {
        if (importer?.includes('@vue/compiler-sfc')) {
          const result = await this.resolve(id, importer, options)
          if (!result) {
            return { id, external: true }
          }
        }
      },
    },
  ],
})
