import fsp from 'node:fs/promises'
import { toUnocss } from 'transform-to-unocss'
import { createGenerator } from '@unocss/core'
import presetUno from '@unocss/preset-uno'
import presetAttributify from '@unocss/preset-attributify'
import fg from 'fast-glob'
import { findUp } from 'find-up'
import * as vscode from 'vscode'

export type CssType = 'less' | 'scss' | 'css' | 'stylus'
export function getCssType(filename: string) {
  const data = filename.split('.')
  const ext = data.pop()!
  const result = ext === 'styl' ? 'stylus' : ext
  return result as CssType
}

export function getMultipedUnocssText(text: string) {
  const match = text.match(/style="([^"]+)"/)
  if (match)
    text = match[1]

  const selectedTexts = text.split(';').filter(i => i !== '"')
  let isChanged = false
  const selectedNewTexts = []
  for (let i = 0; i < selectedTexts.length; i++) {
    const text = selectedTexts[i]
    const newText = toUnocss(text) ?? text
    if (!newText)
      continue
    if (!isChanged)
      isChanged = newText !== text
    selectedNewTexts.push(newText)
  }
  // 没有存在能够转换的元素
  if (!isChanged)
    return

  const selectedUnocssText = selectedNewTexts.join(' ')
  return selectedUnocssText
}

export class LRUCache1 {
  private cache
  private maxSize
  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: any) {
    // 获取缓存值，并将其从Map中删除再重新插入，保证其成为最新的元素
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: any, value: any) {
    // 如果缓存已满，先删除最旧的元素
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    // 插入新值
    this.cache.set(key, value)
  }

  has(key: any) {
    return this.cache.has(key)
  }

  clear() {
    return this.cache.clear()
  }
}

export async function hasFile(source: string | string[]) {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders)
    return []
  const cwd = workspaceFolders[0].uri.fsPath
  const entries = await fg(source, {
    cwd,
    ignore: ['**/dist/**', '**/node_modules/**'],
  })

  return await Promise.all(entries.map((relativepath) => {
    const absolutepath = `${cwd}/${relativepath}`
    return fsp.readFile(absolutepath, 'utf-8')
  }))
}

const style = {
  dark: Object.assign({
    textDecoration: 'underline dashed #fff',
  }),
  light: Object.assign({
    textDecoration: 'underline dashed #333',
  }),
}
export const unoToCssDecorationType = vscode.window.createTextEditorDecorationType(style)

export const disposes: any = []

export async function transformUnocssBack(code: string): Promise<string> {
  // 加载shortcuts
  const shortcuts = await getShortcuts()

  return new Promise((resolve) => {
    createGenerator(
      {},
      {
        presets: [
          presetUno(),
          presetAttributify() as any,
        ],
        shortcuts,
      },
    )
      .generate(code || '')
      .then((res: any) => {
        const css = res.getLayers()
        const reg = new RegExp(`${escapeRegExp(code)}([:\\>][\\w\\-\\(\\)]+)?{(.*)}`)
        const match = css.match(reg)
        if (!match)
          return resolve('')
        const result = match[0].replace(match[2], (match[2] as string).replace(/[:,]/g, v => `${v} `)).replace('{', ' {\n  ').replace(/;/g, ';\n  ').replace('  }', '}')
        resolve(result)
      })
  })
}

let configCacheMap: any = null
const SHORTCUTS_REG = /shortcuts:\s*(\[([\n\s]*[{[][^\}]*[\n\s]*[}\]],?)*[\n\s]*\])/

export async function getShortcuts() {
  if (configCacheMap)
    return configCacheMap
  const cwd = vscode.window.activeTextEditor?.document.uri.fsPath
  return findUp(['uno.config.js', 'uno.config.ts', 'unocss.config.js', 'unocss.config.ts'], { cwd }).then(async (filepath?: string) => {
    if (!filepath)
      return []

    configCacheMap = await findShortcuts(filepath)
    return configCacheMap
  })
}

// 监听unoConfig变化

async function findShortcuts(unoUri: string) {
  const content = await fsp.readFile(unoUri, 'utf-8')
  const matcher = content.match(SHORTCUTS_REG)
  if (!matcher)
    return []
  return eval(matcher[1])
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\%:\!\&\>]/g, '\\\\\\$&')
}

export class LRUCache2 {
  private cache
  private maxSize
  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: any) {
    // 获取缓存值，并将其从Map中删除再重新插入，保证其成为最新的元素
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: any, value: any) {
    // 如果缓存已满，先删除最旧的元素
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    // 插入新值
    this.cache.set(key, value)
  }

  has(key: any) {
    return this.cache.has(key)
  }

  clear() {
    this.cache.clear()
  }
}

export const cacheMap = new LRUCache2(5000)

export async function addCacheVue(content: string) {
  const match = content.match(/[\n\s]<template[^>]*>(.*)<\/template>/s)
  if (!match)
    return
  const template = match[1]
  const { line } = getPosition(content, match.index!)!
  const realRangeMap = []
  let _attrs: any[] = []
  for (const match of template.matchAll(/<[^\s]+\s([^>\/]+)[\/>]/g)) {
    if (!match)
      continue
    // 只考虑单独的属性
    let attributeStr = match[1].trim().replace(/\s+/g, ' ').replace(/\s(['"])/g, '$1').replace(/="\s/g, '="')
    // class
    const { line: outLine } = getPosition(template, match.index!)!
    const offset = match[0].indexOf(match[1]) + match.index! - 1
    attributeStr = attributeStr.replace(/class="([^"]*)"/, (_, attr, i) => {
      let pos = i + 6
      _attrs.push(...attr.split(' ').map((content: string, index: number) => {
        // pos+=character
        if (index !== 0)
          pos += 1
        return {
          content,
          position: [
            {
              start: offset + pos,
              end: pos + content.length + offset,
              line: line + outLine,
            },
          ],
        }
      }))
      return ''
    })

    attributeStr = attributeStr.replace(/(\w+)="([^"]*)"/g, (_, name, values, i) => {
      if (name === 'style')
        return '_'.repeat(_.length)
      let pos = i + name.length + 2
      _attrs.push(...values.split(' ').map((v: string, index: any) => {
        if (index !== 0)
          pos += 1
        let content = ''
        if (v === '~') {
          content = name
        }
        else if (v.includes(':')) {
          const temp = v.split(':')
          content = `${temp.slice(0, -1).join('-')}-${name}-${temp.slice(-1)[0]}`
        }
        else {
          content = `${name}-${v}`
        }

        return {
          content,
          position: i === 0
            ? [
                {
                  start: offset + i,
                  end: offset + i + name.length,
                  line: line + outLine,
                },
                {
                  start: offset + pos,
                  end: offset + pos + v.length,
                  line: line + outLine,
                },
              ]
            : [],
        }
      }))
      return '_'.repeat(_.length)
    })

    attributeStr.split(' ').forEach(async (attr) => {
      if (/_+/.test(attr) || !/\w+/.test(attr) || /(\w+)="([^"]*)/.test(attr))
        return
      const start = attributeStr.indexOf(attr)
      _attrs.push({
        content: attr,
        position: [
          {
            start: offset + start,
            end: offset + start + attr.length,
            line: line + outLine,
          },
        ],
      })
    })

    // todo: 修复初始化的高亮坐标
    // highlight(realRangeMap.map(({ start, end, line }) =>
    //   new vscode.Range(new vscode.Position(line, start), new vscode.Position(line, end))
    // ))
  }
  const _map = new Set()
  // 过滤重复的attr
  _attrs = _attrs.filter(attr => !cacheMap.has(attr.content)).map((attr) => {
    if (_map.has(attr.content))
      return undefined
    _map.add(attr.content)
    return attr
  }).filter(Boolean)

  for (const item of _attrs) {
    const { content, position } = item
    if (cacheMap.has(content)) {
      realRangeMap.push(...position)
      continue
    }
    transformUnocssBack(content).then((transferredCss) => {
      if (transferredCss) {
        cacheMap.set(content, transferredCss)
        realRangeMap.push(...position)
      }
    })
  }
}

export function addCacheReact(content: string) {
  for (const match of content.matchAll(/className="([^"]+)"/gs)) {
    if (!match)
      continue
    const attributes = match[1].replace(/[\w\-@:]+="[^"]+"/g, '').trim().replace(/\s+/g, ' ')
    if (!attributes)
      continue
    // 过滤缓存已有的属性
    const attrs = attributes.split(' ').filter(attr =>
      !cacheMap.has(attr),
    )

    for (const attr of attrs) {
      if (cacheMap.has(attr))
        continue
      transformUnocssBack(attr).then(r =>
        r && cacheMap.set(attr, r),
      )
    }
  }
}

export function highlight(realRangeMap: vscode.Range[]) {
  const editor = vscode.window.activeTextEditor
  if (!editor)
    return
  editor.edit(() => editor.setDecorations(unoToCssDecorationType, realRangeMap))
}

export function getPosition(content: string, pos: number) {
  const contents = content.split('\n')
  let num = 0
  for (let i = 0; i < contents.length; i++) {
    const len = contents[i].length
    if ((num <= pos) && (pos <= (num + len))) {
      return {
        line: i,
        character: pos - num,
      }
    }
    num += contents[i].length + (i === 0 ? 0 : 1)
  }
}
