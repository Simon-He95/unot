import { getConfiguration } from '@vscode-use/utils'
import type { Attr, ChangeList } from './type'

const { variantGroup, strictVaribale, strictHyphen } = getConfiguration('unot')
const fontMap: any = {
  100: 'thin',
  200: 'extralight',
  300: 'light',
  400: 'normal',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
  800: 'extrabold',
  900: 'black',
}

const customMap: any = {
  'b': 'border',
  'bb': 'border-b',
  'border-rd': 'rounded',
  'lh': 'leading',
}

const textMap: any = {
  12: 'xs',
  14: 'sm',
  16: 'base',
  18: 'lg',
  20: 'xl',
  24: '2xl',
  30: '3xl',
  36: '4xl',
  48: '5xl',
  60: '6xl',
  72: '7xl',
  96: '8xl',
  128: '9xl',
}
let classData: string[] = []
const COMMON_REG = strictHyphen
  ? /(!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)(w|h|gap|m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|b|bt|br|bb|bl|lh|text|top|right|bottom|left|border-rd|border|max-w|max-h|translate-x|translate-y|duration|delay|scale-x|scale-y|scale|rotate|skew-x|skew-y|fill|stroke|invert|saturate|grayscale|contrast|brightness|blur|outline)-(-?[0-9]+)(px|rem|em|\%|vw|vh||$)!?/g
  : /(!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)(w|h|gap|m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|b|bt|br|bb|bl|lh|text|top|right|bottom|left|border-rd|border|max-w|max-h|translate-x|translate-y|duration|delay|scale-x|scale-y|scale|rotate|skew-x|skew-y|fill|stroke|invert|saturate|grayscale|contrast|brightness|blur|outline)-?(-?[0-9]+)(px|rem|em|\%|vw|vh||$)!?/g
const PSEUDO_CLASS = /(hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)\(([^\)]+)\)(\s|'|$)/g
export const rules: any = [
  [/([\s!]?)([wh])full(\s|'|!|$)/g, (_: string, v0: string, v1: string, v2: string) => `${v0}${v1}-full${v2}`],
  [/('|!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)flex1(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}flex-1${v2}`],
  [/('|!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)maxh([^\s']+)/, (_: string, v1: string, v2: string) => `${v1}max-h${v2}`],
  [/('|!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)minh([^\s']+)/, (_: string, v1: string, v2: string) => `${v1}min-h${v2}`],
  [/('|!|\s|hover:|focus:|active:|disabled:|invalid:|checked:|required:|first:|last:|odd:|even:|after:|before:|placeholder:|file:|marker:|selection:|first-line:|first-letter:|backdrop:|md:|sm:|xl:|2xl:|lg:|dark:|ltr:|rtl:|group-hover:|group-focus:|group-active:)maxw([^\s']+)/, (_: string, v1: string, v2: string) => `${v1}max-w${v2}`],
  [/([\s'])minw([^\s']+)/, (_: string, v1: string, v2: string) => `${v1}min-w${v2}`],
  [/([\s!-])translatex([^\s']+)/, (_: string, v1 = '', v2: string) => `${v1}translate-x${v2}`],
  [/([\s!-])translatey([^\s']+)/, (_: string, v1: string, v2: string) => `${v1}translate-y${v2}`],
  [COMMON_REG, (_: string, prefix: string, v: string, v1 = '', v2 = '') => {
    if (v in customMap)
      v = customMap[v]
    if ((v === 'border-b' || v === 'border') && v1 === '1')
      return `${prefix}${v}`
    if (v === 'text') {
      if (v2)
        return strictVaribale ? `${prefix}${v}-[${v1}${v2}]` : `${prefix}${v}-${v1}${v2}`

      if (v1 in textMap)
        return `${prefix}${v}-${textMap[v1]}`
      return `${prefix}${v}-${v1}`
    }
    return v2.trim() === ''
      ? `${prefix}${v}${v1}${v2}`
      : strictVaribale
        ? `${prefix}${v}-[${v1}${v2}]`
        : `${prefix}${v}-${v1}${v2}`
  }],
  variantGroup
    ? [PSEUDO_CLASS, (_: string, prefix: string, v: string, v1 = '') => v
        .replace('flex-center', 'flex justify-center items-center')
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(item => `${prefix}${item}`)
        .join(' ') + v1]
    : undefined,
  strictHyphen
    ? [/([\s'])(bg|text|border)-(\#[^\s']+)(\s|'|!|$)/g, (_: string, v: string, v1: string, v2: string, v3: string) => `${v}${v1}-${strictVaribale ? '[' : ''}${v2}${strictVaribale ? ']' : ''}${v3}`]
    : [/([\s'])(bg|text|border)-?(\#[^\s']+)(\s|'|!|$)/g, (_: string, v: string, v1: string, v2: string, v3: string) => `${v}${v1}-${strictVaribale ? '[' : ''}${v2}${strictVaribale ? ']' : ''}${v3}`],
  [/([\s'])border-box(\s|'|!|$)/, (_: string, v1 = '', v2: string) => `${v1}box-border${v2}`],
  [/([\s'])content-box(\s|'|!|$)/, (_: string, v1 = '', v2: string) => `${v1}box-content${v2}`],
  [/-\[?\s*(rgba?\([^\)]*\))\]?(\s|'|!|$)/g, (_: string, v: string, v1: string) => `-${strictVaribale ? '[' : ''}${v.replace(/\s*\/\s*/g, ',').replace(/\s+/g, ',').replace(/,+/g, ',')}${strictVaribale ? ']' : ''}${v1}`],
  [/-\[?\s*(hsla?\([^\)]*\))\]?(\s|'|!|$)/g, (_: string, v: string, v1: string) => `-${strictVaribale ? '[' : ''}${v.replace(/\s*\/\s*/g, ',').replace(/\s+/g, ',').replace(/,+/g, ',')}${strictVaribale ? ']' : ''}${v1}`],
  [/-\[?\s*(calc\([^\)]*\))\]?(\s|'|!|$)/g, (_: string, v: string, v1 = '') => `-${strictVaribale ? '[' : ''}${v.replace(/\s*/g, '')}${strictVaribale ? ']' : ''}${v1}`],
  [/-(\#[^\s']+)(\s|'|!|$)/g, (_: string, v1: string, v2: string) => `-${strictVaribale ? '[' : ''}${v1}${strictVaribale ? ']' : ''}${v2}`],
  strictHyphen
    ? [/-([0-9]+)((?:px)|(?:vw)|(?:vh)|(?:rem)|(?:em)|(?:%))(\s|'|!|$)/g, (_: string, v1: string, v2 = '', v3 = '') => strictVaribale ? `-[${v1}${v2}]${v3}` : `-${v1}${v2}${v3}`]
    : [/-?([0-9]+)((?:px)|(?:vw)|(?:vh)|(?:rem)|(?:em)|(?:%))(\s|'|!|$)/g, (_: string, v1: string, v2 = '', v3 = '') => strictVaribale ? `-[${v1}${v2}]${v3}` : `-${v1}${v2}${v3}`],
  [/([\s!])x-hidden(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}overflow-x-hidden${v2}`],
  [/([\s!])y-hidden(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}overflow-y-hidden${v2}`],
  [/([\s!])justify-center(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}justify-center${v2}`],
  [/([\s!])align-center(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}items-center${v2}`],
  [/([\s'])eclipse(\s|'|$)/, (_: string, v1: string, v2: string) => `${v1}whitespace-nowrap overflow-hidden text-ellipsis${v2}`],
  [/([\s'])font-?(100|200|300|400|500|600|700|800|900)(\s|'|!|$)/, (_: string, prefix: string, v1: string, v2: string) => `${prefix}font-${fontMap[v1]}${v2}`],
  [/([\s'])pointer-none(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}pointer-events-none${v2}`],
  [/([\s'])pointer(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}cursor-pointer${v2}`],
  [/([\s'])flex-center(\s|'|$)/, (_: string, v1: string, v2: string) => `${v1}${classData.includes('flex') ? '' : 'flex '}justify-center items-center${v2}`],
  [/([\s'])col(\s|'|$)/, (_: string, v1: string, v2: string) => `${v1}${classData.includes('flex') ? '' : 'flex '}flex-col${v2}`],
  [/([\s'])position-center(\s|'|$)/, (_: string, v1: string, v2: string) => `${v1}left-0 right-0 top-0 bottom-0${v2}`],
  [/([\s'])dashed(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}border-dashed${v2}`],
  [/([\s'])dotted(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}border-dotted${v2}`],
  [/([\s'])double(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}border-double${v2}`],
  [/([\s'])contain(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}bg-contain${v2}`],
  [/([\s'])cover(\s|'|!|$)/, (_: string, v1: string, v2: string) => `${v1}bg-cover${v2}`],
  [/([\s'])line([0-9]+)(\s|'|!|$)/, (_: string, v1: string, v2: string, v3: string) => `${v1}line-clamp-${v2}${v3}`],
  [/([\s!])\(([^\)]+)\)(\s|'|!|$)/, (_: string, v1: string, v2: string, v3: string) => v2.replace(/\s+/g, ' ').split(' ').map(item => `!${item}`).join(' ') + v3],
]

export function transform(content: string) {
  return rules.filter(Boolean).reduce((result: string, cur: [string | RegExp, string]) => {
    const [reg, callback] = cur
    return result.replace(/class(Name)?="([^"]*)"/g, (_: string, name = '', value: string) => {
      let v = ` ${value}`
      // 替换掉rgba内容排除掉
      let count = 0
      let temp = `__unot_split__${count}`
      const map: any = {}
      v = v.replace(/rgba?\([^)]+\)/g, (v) => {
        temp = `__unot_split__${count++}`
        map[temp] = v
        return temp
      })

      const matcher = v.match(/([\s'])(\w+)-\[(([\(\),\w0-9%\s\*\/\+\-\:]+,[\(\),\w0-9%\s\*\/\+\-\:]+)+)\](\s|'|$)/)
      if (matcher && matcher[3].includes(',')) {
        try {
          v = `${matcher[1]}${matcher[3].split(',').map((item) => {
            if (item.includes('rgb') && !/rgba?\([^)]+\)/.test(item))
              throw new Error('match error')
            if (item.includes('calc') && !/calc\([^)]+\)/.test(item))
              throw new Error('match error')

            if (item.includes(':')) {
              const items = item.split(':')
              return `${items.slice(0, -1).join(':')}:${matcher[2]}-${items.slice(-1)[0]}`
            }
            return `${matcher[2]}-${item}`
          }).join(' ')}`
        }
        catch (error) {
          return _
        }
      }
      Object.keys(map).forEach((key) => {
        v = v.replace(key, map[key])
      })
      classData = value.split(' ').map(item => item.replace(/['\[\]]/g, ''))
      const newClass = v.replace(reg, callback).slice(1)
      return `class${name}="${newClass}"`
    },
    )
  }, content)
}

export function transformClass(attr: string) {
  return rules.reduce((result: string, cur: [string | RegExp, string]) => {
    const [reg, callback] = cur
    let v = ` ${result}`
    // 替换掉rgba内容排除掉
    let count = 0
    let temp = `__unocss_magic_split__${count}`
    const map: any = {}
    v = v.replace(/rgba?\([^)]+\)/g, (v) => {
      temp = `__unocss_magic_split__${count++}`
      map[temp] = v
      return temp
    })

    const matcher = v.match(/([\s'])(\w+)-\[(([\(\),\w0-9%\s\*\/\+\-\:]+,[\(\),\w0-9%\s\*\/\+\-\:]+)+)\](\s|'|$)/)
    if (matcher && matcher[3].includes(',')) {
      try {
        v = `${matcher[1]}${matcher[3].split(',').map((item) => {
          if (item.includes('rgb') && !/rgba?\([^)]+\)/.test(item))
            throw new Error('match error')
          if (item.includes('calc') && !/calc\([^)]+\)/.test(item))
            throw new Error('match error')

          if (item.includes(':')) {
            const items = item.split(':')
            return `${items.slice(0, -1).join(':')}:${matcher[2]}-${items.slice(-1)[0]}`
          }
          return `${matcher[2]}-${item}`
        }).join(' ')}`
      }
      catch (error) {
        return result
      }
    }
    Object.keys(map).forEach((key) => {
      v = v.replace(key, map[key])
    })
    classData = result.split(' ')
    const newClass = v.replace(reg, callback).slice(1)

    return newClass
  }, attr)
}
export function transformClassAttr(attrs: Attr[]) {
  const changeList: ChangeList[] = []
  attrs.forEach((attr) => {
    const { content, start, end } = attr
    const newAttr = transformClass(content)
    if (content !== newAttr) {
      changeList.push({
        content: newAttr,
        start,
        end,
      })
    }
  })
  return changeList
}

const attrRules = /(\[?\s*(rgba?\([^\)]*\))\]|\[?\s*(hsla?\([^\)]*\))\]|\[?\s*(calc\([^\)]*\))\])/g
const attrsMap = ['w', 'h', 'gap', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'b', 'bt', 'br', 'bb', 'bl', 'lh', 'text', 'top', 'right', 'bottom', 'left', 'border-rd', 'border', 'max-w', 'max-h', 'translate-x', 'translate-y', 'duration', 'delay', 'scale-x', 'scale-y', 'scale', 'rotate', 'skew-x', 'skew-y', 'fill', 'stroke', 'invert', 'saturate', 'grayscale', 'contrast', 'brightness', 'blur', 'outline']

export function transformAttrs(attrs: any[]) {
  const changeList: ChangeList[] = []
  attrs.forEach((attr) => {
    const { content, start, end, attrName } = attr
    if (!attrsMap.includes(attrName))
      return
    let newAttr = content
    for (const match of content.matchAll(attrRules)) {
      const index = match.index
      newAttr = `${newAttr.slice(0, index)}[${match[4].replace(/\s+/g, '')}]${newAttr.slice(index + match[0].length)}`
    }

    if (content !== newAttr) {
      changeList.push({
        content: newAttr,
        start,
        end,
      })
    }
  })
  return changeList
}
