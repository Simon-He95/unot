import fsp from 'node:fs/promises'
import { toUnocss } from 'transform-to-unocss'
import { createGenerator } from '@unocss/core'
import presetUno from '@unocss/preset-uno'
import presetAttributify from '@unocss/preset-attributify'
import fg from 'fast-glob'
import { getPosition } from '@vscode-use/utils'
import { findUp } from 'find-up'
import * as vscode from 'vscode'
import { parse } from '@vue/compiler-sfc'
import { parse as tsParser } from '@typescript-eslint/typescript-estree'
import type { DictStr, colorObject } from 'windicss/types/interfaces'

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

export const style = {
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
  const pos = getPosition(content, match.index!)!
  if (!pos)
    return
  const { line } = pos
  const realRangeMap = []
  let _attrs: any[] = []
  for (const match of template.matchAll(/<[^\s]+\s([^>\/]+)[\/>]/g)) {
    if (!match)
      continue
    // 只考虑单独的属性
    let attributeStr = match[1].trim().replace(/\s+/g, ' ').replace(/\s(['"])/g, '$1').replace(/="\s/g, '="')
    // class
    const pos = getPosition(template, match.index!)!
    if (!pos)
      return

    const { line: outLine } = pos
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

export function resetDecorationType() {
  return vscode.window.activeTextEditor?.setDecorations(unoToCssDecorationType, [])
}

let isInTemplate = false
// 引入vue-parser只在template中才处理一些逻辑
export function parser(code: string, position: vscode.Position) {
  const entry = vscode.window.activeTextEditor?.document.uri.fsPath
  if (!entry)
    return
  const suffix = entry.slice(entry.lastIndexOf('.') + 1)
  if (!suffix)
    return
  isInTemplate = false

  if (suffix === 'vue')
    return transformVue(code, position)
  if (/jsx|tsx/.test(suffix))
    return parserJSX(code, position)
  return true
}

export function transformVue(code: string, position: vscode.Position) {
  const {
    descriptor: { template },
    errors,
  } = parse(code)
  if (errors.length || !template)
    return
  if (!isInPosition(template.loc, position))
    return
  // 在template中
  const { ast } = template
  return dfs(ast.children, position)
}

function dfs(children: any, position: vscode.Position) {
  for (const child of children) {
    const { loc, tag, props, children } = child
    if (!isInPosition(loc, position))
      continue
    if (props && props.length) {
      for (const prop of props) {
        if (isInPosition(prop.loc, position)) {
          return {
            tag,
            prop,
            props,
            type: 'props',
          }
        }
      }
    }
    if (children && children.length) {
      const result = dfs(children, position) as any
      if (result)
        return result
    }
    if (child.tag) {
      return {
        type: 'props',
        tag: child.tag,
      }
    }
    return {
      type: 'text',
      isInTemplate: true,
    }
  }
}

function isInPosition(loc: any, position: vscode.Position) {
  const { start, end } = loc
  const { line: startLine, column: startcharacter } = start
  const { line: endLine, column: endcharacter } = end
  const { line, character } = position
  if (line + 1 === startLine && character < startcharacter)
    return
  if (line + 1 === endLine && character > endcharacter - 1)
    return
  if (line + 1 < startLine)
    return
  if (line + 1 > endLine)
    return
  return true
}

export function flatColors(colors: colorObject, head?: string): DictStr {
  let flatten: { [key: string]: string } = {}
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string')
      flatten[(head && key === 'DEFAULT') ? head : head ? `${head}-${key}` : key] = value
    else if (typeof value === 'function')
      flatten[(head && key === 'DEFAULT') ? head : head ? `${head}-${key}` : key] = 'currentColor'
    else
      flatten = { ...flatten, ...flatColors(value, head ? `${head}-${key}` : key) }
  }
  return flatten
}

export function hex2RGB(hex: string): number[] | undefined {
  const RGB_HEX = /^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i
  const [, short, long] = String(hex).match(RGB_HEX) || []

  if (long) {
    const value = Number.parseInt(long, 16)
    return [value >> 16, (value >> 8) & 0xFF, value & 0xFF]
  }
  else if (short) {
    return Array.from(short, s => Number.parseInt(s, 16)).map(
      n => (n << 4) | n,
    )
  }
}

export function parserJSX(code: string, position: vscode.Position) {
  const ast = tsParser(code, { jsx: true, loc: true })
  return jsxDfs(ast.body, position)
}

function jsxDfs(children: any, position: vscode.Position) {
  for (const child of children) {
    let { loc, type, openingElement, body: children, argument, declarations, init } = child
    if (!isInPosition(loc, position))
      continue
    if (openingElement && openingElement.attributes.length) {
      for (const prop of openingElement.attributes) {
        if (isInPosition(prop.loc, position)) {
          return {
            tag: openingElement.name.name,
            propName: prop.name.name,
            props: openingElement.attributes,
            type: 'props',
          }
        }
      }
    }
    if (type === 'JSXElement' || (type === 'ReturnStatement' && argument.type === 'JSXElement'))
      isInTemplate = true

    if (type === 'VariableDeclaration')
      children = declarations
    else if (type === 'VariableDeclarator')
      children = init
    else if (type === 'ReturnStatement')
      children = argument
    else if (type === 'JSXElement')
      children = child.children
    if (children && !Array.isArray(children))
      children = [children]

    if (children && children.length) {
      const result = jsxDfs(children, position) as any
      if (result)
        return result
    }
    if (type === 'JSXElement') {
      return {
        type: 'props',
        tag: openingElement.name.name,
      }
    }
    return {
      type: 'text',
      isInTemplate,
    }
  }
}

export function parserAst(code: string) {
  const entry = vscode.window.activeTextEditor?.document.uri.fsPath
  if (!entry)
    return
  const suffix = entry.slice(entry.lastIndexOf('.') + 1)
  if (!suffix)
    return
  if (suffix === 'vue')
    return transformVueAst(code)
  if (/ts|js|jsx|tsx/.test(suffix))
    return parserJSXAst(code)
}

export function transformVueAst(code: string) {
  const {
    descriptor: { template },
    errors,
  } = parse(code)
  if (errors.length || !template)
    return

  // 在template中
  const { ast } = template
  return jsxAstDfs(ast.children)
}
function jsxAstDfs(children: any, result: any[] = []) {
  for (const child of children) {
    const { props, children } = child
    if (props && props.length) {
      for (const prop of props) {
        if (prop.name === 'class') {
          prop.value.loc.end.column = prop.value.loc.start.column + prop.value.loc.source.length - 1
          result.push({
            content: prop.value.content,
            line: prop.value.loc.start.line,
            charater: prop.value.loc.start.column,
            start: prop.value.loc.start,
            end: prop.value.loc.end,
          })
        }
      }
    }
    if (children && children.length)
      dfsAst(children, result) as any
  }
  return result
}
function dfsAst(children: any, result: any[] = []) {
  for (const child of children) {
    const { props, children } = child
    if (props && props.length) {
      for (const prop of props) {
        if (prop.name === 'class') {
          prop.value.loc.end.column = prop.value.loc.start.column + prop.value.loc.source.length - 1
          result.push({
            content: prop.value.content,
            line: prop.value.loc.start.line,
            charater: prop.value.loc.start.column,
            start: prop.value.loc.start,
            end: prop.value.loc.end,
          })
        }
      }
    }
    if (children && children.length)
      dfsAst(children, result) as any
  }
  return result
}
export function parserJSXAst(code: string) {
  const ast = tsParser(code, { jsx: true, loc: true })
  return jsxAstDfs(ast.body)
}
