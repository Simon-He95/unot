import fsp from 'node:fs/promises'
import { toUnocss } from 'transform-to-unocss-core'
import fg from 'fast-glob'
import { findUp } from 'find-up'
import * as vscode from 'vscode'
import { parse } from '@vue/compiler-sfc'
import { parse as tsParser } from '@typescript-eslint/typescript-estree'
import { toRemFlag } from '../'

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
    selectedNewTexts.push(toRemFlag
      ? newText.replace(/-([0-9\.]+)px/, (_: string, v: string) => `-${+v / 4}`)
      : newText)
  }
  // 没有存在能够转换的元素
  if (!isChanged)
    return

  const selectedUnocssText = selectedNewTexts.join(' ')
  return selectedUnocssText
}
export class LRUCache {
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
