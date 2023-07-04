import { createAutocomplete } from '@unocss/autocomplete'
import { createGenerator } from '@unocss/core'
import getConfig from './uno.config'

const prettier = require('prettier')

const eightWay = ['scroll-p', 'scroll-m']
  .reduce((result, v) => result.concat(['t', 'l', 'r', 'b', 's', 'e', 'x', 'y'].map(item => `${v}${item}`)), [] as string[])

const common = ['top', 'bottom', 'left', 'right', 'pt', 'pb', 'pl', 'pr', 'mt', 'mb', 'ml', 'mr', 'translate', 'translate-x', 'translate-y', 'aspect', 'columns', 'basis', 'order', 'grid-cols', 'col-span', 'grid-rows', 'row-span', 'gap', 'gap-x', 'gap-y', 'line-clamp', 'lh', 'leading', 'transition', 'rotate', 'indent', 'border', ...['t', 'l', 'r', 'b', 's', 'e', 'x', 'y'].map(v => `border-${v}`), 'outline', 'ring', 'ring-offset', 'opacity', 'border-spacing', 'scale', 'skew', 'skew-x', 'skew-y', ...eightWay]

const hundredCommon = ['font', 'brightness', 'contrast', 'hue-rotate', 'saturate', 'backdrop-brightness', 'backdrop-contrast', 'backdrop-hue-rotate', 'backdrop-opacity', 'backdrop-saturate', 'delay', 'duration']
const colors = ['amber', 'black', 'blue', 'bluegray', 'coolgray', 'cyan', 'dark', 'emerald', 'fuchsia', 'gray', 'green', 'indigo', 'light', 'lightblue', 'lime', 'neutral', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'slate', 'stone', 'teal', 'truegray', 'violet', 'warmgray', 'white', 'yellow', 'zinc']
const colorCommon = ['bg', 'text', 'border', 'outline', 'ring', 'ring-offset', 'accent', 'caret', 'fill', 'stroke']
const aspect = ['aspect-square', 'aspect-video', 'aspect-a']
const grid = [
  'grid-flow-row',
  'grid-flow-col',
  'grid-flow-row-dense',
  'grid-flow-col-dense',
  'auto-cols-auto',
  'auto-cols-min',
  'auto-cols-max',
  'auto-cols-fr',
  'auto-rows-auto',
  'auto-rows-min',
  'auto-rows-max',
  'auto-rows-fr',
]
const line_height = ['lh-loose',
  'lh-none',
  'lh-normal',
  'lh-relaxed',
  'lh-snug',
  'lh-tight']
const font_family = ['font-mono',
  'font-serif',
  'font-sans']
const letter_spacing = ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest']
const align = ['align-baseline', 'align-top', 'align-middle', 'align-bottom', 'align-text-top', 'align-text-bottom', 'align-sub', 'align-super']
const whitespace = ['whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap', 'whitespace-break-spaces']
const rounded = ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full']
  .concat(['s', 'e', 't', 'b', 'l', 'ss', 'se', 'ee', 'es', 'tl', 'tr', 'br', 'bl']
    .reduce((result, prefix) => result.concat([`rounded-${prefix}-none`, `rounded-${prefix}-sm`, `rounded-${prefix}`, `rounded-${prefix}-md`, `rounded-${prefix}-lg`, `rounded-${prefix}-xl`, `rounded-${prefix}-2xl`, `rounded-${prefix}-3xl`, `rounded-${prefix}-full`]), [] as string[]))
const blur = ['blur-none', 'blur-sm', 'blur', 'blur-md', 'blur-lg', 'blur-xl', 'blur-2xl', 'blur-3xl']
const origin = ['origin-center', 'origin-top', 'origin-top-right', 'origin-right', 'origin-bottom-right', 'origin-bottom', 'origin-bottom-left', 'origin-left', 'origin-top-left']
const stroke_width = ['stroke-0', 'stroke-1', 'stroke-2']
const will_change = ['will-change-auto', 'will-change-scroll', 'will-change-contents', 'will-change-transform']
const timing_function = ['ease-linear', 'ease-in', 'ease-out', 'ease-in-out']
const shadow = ['shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-non']

const suppleMore = [
  'container',
  ...line_height,
  ...common.reduce((result, item) => {
    result.push(...Array(10).fill(0).map((_, i) => `${item}-${i}`))
    return result
  }, [] as any),
  ...font_family,
  ...hundredCommon.reduce((result, item) => {
    result.push(...Array(9).fill(0).map((_, i) => `${item}-${i + 1}00`))
    return result
  }, [] as any),
  ...colorCommon.reduce((result, item) => {
    Array(9).fill(0).forEach((_, i) => {
      colors.forEach((color) => {
        result.push(`${item}-${color}-${i + 1}00`)
        for (let j = 0; j < 100; j += 10)
          result.push(`${item}-${color}-${i + 1}00:${j}`)
        if (i === 0)
          result.push(`${item}-${color}`)
      })
    })
    return result
  }, [] as any),
  ...aspect,
  'shrink',
  'shrink-0',
  ...grid,
  ...letter_spacing,
  ...align,
  ...whitespace,
  ...rounded,
  ...blur,
  ...origin,
  ...stroke_width,
  ...will_change,
  ...timing_function,
  ...shadow,
]

export async function getUnoCompletions(unoUri: string) {
  const uno = createGenerator({}, await getConfig(unoUri))
  const ac = createAutocomplete(uno)

  async function enumerateAutocomplete() {
    const matched = new Set<string>()
    const a2z = Array.from('abcdefghijklmnopqrstuvwxyz')
    const a2zd = [...a2z, '-']

    const keys = a2z.flatMap(i => [
      i,
      ...a2zd.map(j => `${i}${j}`),
    ])
    await Promise.all(keys.map(key =>
      ac
        .suggest(key)
        .then((i) => {
          return i.forEach(j => matched.add(j))
        }),
    ))

    return matched
  }
  const completions = await enumerateAutocomplete()
  return Promise.all([...completions, ...suppleMore].map(async (item) => {
    const generate = await uno.generate(new Set([item]), { preflights: false, minify: true })
    const css = await formatCSS(generate.css)
    return [item, css]
  }))
}

export async function formatCSS(input: string) {
  return prettier.format(input, { printWidth: Infinity, parser: 'css' })
}
