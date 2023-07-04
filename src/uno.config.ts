import fsp from 'node:fs/promises'
import presetWind from '@unocss/preset-wind'
import presetAttributify from '@unocss/preset-attributify'
import presetMini from '@unocss/preset-mini'
import presetUno from '@unocss/preset-uno'
import presetWebFonts from '@unocss/preset-web-fonts'

export const defaultConfig = {
  details: true,
  presets: [
    presetUno(),
    presetAttributify(),
    presetWind(),
    presetMini(),
  ],
}

export default async (unoUri: string) => {
  const shortcuts = await getShortcuts(unoUri)
  return {
    ...defaultConfig,
    presets: [
      ...defaultConfig.presets!,
      presetWebFonts({
        fonts: {
          sans: 'Inter:100,200,400,700,800',
          mono: 'IBM Plex Mono',
        },
      }),
    ],
    shortcuts,
    transformers: [
    ],
  }
}

const SHORTCUTS_REG = /shortcuts:\s*(\[([\n\s]*[{[][^\}]*[\n\s]*[}\]],?)*[\n\s]*\])/
async function getShortcuts(unoUri: string) {
  const content = await fsp.readFile(unoUri, 'utf-8')
  const matcher = content.match(SHORTCUTS_REG)
  if (!matcher)
    return []
  return eval(matcher[1])
}
