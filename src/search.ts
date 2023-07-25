import { createAutocomplete } from '@unocss/autocomplete'
import { createGenerator } from '@unocss/core'
import getConfig from './uno.config'

const prettier = require('prettier')

const eightWay = ['scroll-p', 'scroll-m']
  .reduce((result, v) => result.concat(['t', 'l', 'r', 'b', 's', 'e', 'x', 'y'].map(item => `${v}${item}`)), [] as string[])

const common = ['top', 'bottom', 'left', 'right', 'pt', 'pb', 'pl', 'pr', 'mt', 'mb', 'ml', 'mr', 'translate', 'translate-x', 'translate-y', 'aspect', 'columns', 'basis', 'order', 'grid-cols', 'col-span', 'grid-rows', 'row-span', 'gap', 'gap-x', 'gap-y', 'line-clamp', 'lh', 'leading', 'transition', 'rotate', 'indent', 'border', ...['t', 'l', 'r', 'b', 's', 'e', 'x', 'y'].map(v => `border-${v}`), 'outline', 'ring', 'ring-offset', 'opacity', 'border-spacing', 'scale', 'skew', 'skew-x', 'skew-y', ...eightWay]

const hundredCommon = ['font', 'brightness', 'contrast', 'hue-rotate', 'saturate', 'backdrop-brightness', 'backdrop-contrast', 'backdrop-hue-rotate', 'backdrop-opacity', 'backdrop-saturate', 'delay', 'duration']
const colors = ['current', 'amber', 'black', 'blue', 'blue-gray', 'cool-gray', 'cyan', 'dark', 'emerald', 'fuchsia', 'gray', 'green', 'indigo', 'light', 'light-blue', 'lime', 'neutral', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'slate', 'stone', 'teal', 'true-gray', 'violet', 'warm-gray', 'white', 'yellow', 'zinc']
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
const fit = ['w', 'h', 'object'].map(item => `${item}-fit`)
const suppleMore = [
  'container',
  ...fit,
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
        if (!['black', 'white', 'current'].includes(color)) {
          result.push({
            value: `${item}-${color}-${i + 1}00`,
            color: `${color}-${i + 1}00`,
          })
          for (let j = 0; j < 100; j += 10) {
            result.push({
              value: `${item}-${color}-${i + 1}00:${j}`,
              color: `${color}-${i + 1}00`,
              opacity: j,
            })
          }
        }

        if (i === 0 && ['black', 'white', 'current'].includes(color)) {
          result.push({
            value: `${item}-${color}`,
            color,
          })
        }
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

const customMap = [
  ['flex-center', 'flex justify-center items-center'],
  ['pointer', 'cursor-pointer'],
  ['maxw', 'max-w'],
  ['minw', 'min-w'],
  ['maxh', 'max-h'],
  ['minh', 'min-h'],
  ['position-center', 'left-0 right-0 top-0 bottom-0'],
  ['col', 'flex-col'],
  ['pointer-none', 'pointer-events-none'],
  ['eclipse', 'whitespace-nowrap overflow-hidden text-ellipsis'],
  ['x-hidden', 'overflow-x-hidden'],
  ['y-hidden', 'overflow-y-hidden'],
  ['translatex', 'translate-x'],
  ['translatey', 'translate-y'],
  ['dashed', 'border-dashed'],
  ['dotted', 'border-dotted'],
  ['double', 'border-double'],
  ['contain', 'bg-contain'],
  ['cover', 'bg-cover'],
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
  return Promise.all([...completions, ...suppleMore, ...customMap].map(async (item) => {
    const isArray = Array.isArray(item)
    let color
    if (!isArray && (typeof item === 'object')) {
      color = item
      item = item.value
    }
    let css
    if (isArray) {
      css = (await Promise.all(item[1].split(' ').map(async (item: string) => {
        const result = await uno.generate(new Set([item]), { preflights: false, minify: true })
        return result.css
      }))).join('\n')
    }
    else {
      css = (await uno.generate(new Set([isArray ? item[1] : item]), { preflights: false, minify: true })).css
    }
    return [
      isArray ? item[0] : item,
      await formatCSS(css),
      color,
    ]
  }))
}

export async function formatCSS(input: string) {
  return prettier.format(input, { printWidth: Infinity, parser: 'css' })
}
