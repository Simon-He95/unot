import fsp from 'node:fs/promises'
import { toUnocss } from 'transform-to-unocss-core'
import fg from 'fast-glob'
import * as vscode from 'vscode'
import { parse } from '@vue/compiler-sfc'
import { parse as tsParser } from '@typescript-eslint/typescript-estree'
import { decorationType, toRemFlag } from '../'

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

export const disposes: any = []

export function highlight(realRangeMap: vscode.Range[]) {
  const editor = vscode.window.activeTextEditor
  if (!editor)
    return
  editor.edit(() => editor.setDecorations(decorationType, realRangeMap))
}

export function resetDecorationType() {
  return vscode.window.activeTextEditor?.setDecorations(decorationType, [])
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
    descriptor: { template, script, scriptSetup },
    errors,
  } = parse(code)

  if ((script || scriptSetup)?.lang === 'tsx' && (script || scriptSetup)?.content)
    return parserJSXAst((script || scriptSetup)!.content)
  if (errors.length || !template)
    return

  // 在template中
  const { ast } = template
  return jsxAstDfs(ast.children)
}
function jsxAstDfs(children: any, result: { classAttr: any[], attrs: any[] } = { classAttr: [], attrs: [] }) {
  for (const child of children) {
    const { props, children } = child
    if (props && props.length) {
      for (const prop of props) {
        if (prop.name === 'class' && prop.value) {
          prop.value.loc.end.column = prop.value.loc.start.column + prop.value.loc.source.length - 1
          result.classAttr.push({
            content: prop.value.content,
            line: prop.value.loc.start.line,
            charater: prop.value.loc.start.column,
            start: prop.value.loc.start,
            end: prop.value.loc.end,
            attrName: prop.name,
          })
        }
        else if (prop.name === 'bind' && prop.arg && prop.arg.content === 'class') {
          const start = {
            column: prop.exp.loc.start.column - 1,
            line: prop.exp.loc.start.line,
          }
          result.classAttr.push({
            content: prop.exp.content,
            line: prop.exp.loc.start.line,
            charater: prop.exp.loc.start.column,
            start,
            end: prop.exp.loc.end,
            attrName: prop.name,
          })
        }
        else if (props.name === 'bind') {
          const start = {
            column: prop.exp.loc.start.column - 1,
            line: prop.exp.loc.start.line,
          }
          result.attrs.push({
            content: prop.exp.content,
            line: prop.exp.loc.start.line,
            charater: prop.exp.loc.start.column,
            start,
            end: prop.exp.loc.end,
            attrName: prop.name,
          })
        }
        else if (prop.name && prop.value) {
          prop.value.loc.end.column = prop.value.loc.start.column + prop.value.loc.source.length - 1
          result.attrs.push({
            content: prop.value.content,
            line: prop.value.loc.start.line,
            charater: prop.value.loc.start.column,
            start: prop.value.loc.start,
            end: prop.value.loc.end,
            attrName: prop.name,
          })
        }
      }
    }
    if (children && children.length)
      jsxAstDfs(children, result) as any
  }
  return result
}

export function parserJSXAst(code: string) {
  const ast = tsParser(code, { jsx: true, loc: true })
  return jsxDfsAst(ast.body)
}

function jsxDfsAst(children: any, result: { classAttr: any[], attrs: any[] } = { classAttr: [], attrs: [] }) {
  for (const child of children) {
    let { type, openingElement, body: children, argument, declaration, declarations, init } = child
    if (openingElement && openingElement.attributes.length) {
      for (const prop of openingElement.attributes) {
        if (prop.value && prop.value.type === 'Literal') {
          if (prop.name.name === 'className' || prop.name.name === 'class') {
            prop.value.loc.start.column++
            result.classAttr.push({
              content: prop.value.value,
              start: prop.value.loc.start,
              end: prop.value.loc.end,
              attrName: prop.name.name,
            })
          }
          else if (prop.name.name) {
            prop.value.loc.start.column++
            result.attrs.push({
              content: prop.value.value,
              start: prop.value.loc.start,
              end: prop.value.loc.end,
              attrName: prop.name.name,
            })
          }
        }
      }
    }

    if (type === 'VariableDeclaration') { children = declarations }
    else if (type === 'VariableDeclarator') { children = init }
    else if (type === 'ReturnStatement') { children = argument }
    else if (type === 'JSXElement') { children = child.children }
    else if (type === 'ExportDefaultDeclaration' || (type === 'ExportNamedDeclaration' && declaration.type === 'FunctionDeclaration')) {
      if (declaration.callee.name === 'defineComponent') {
        const properties = declaration.arguments[0]?.properties
        const result = []
        if (properties) {
          for (const p of properties) {
            if (p.key.name === 'setup' || p.key.name === 'render')
              result.push(p.value)
          }
        }
        children = result
      }
      else { children = declaration?.body?.body }
    }
    else if (type === 'ExportNamedDeclaration') { children = declaration.declarations }

    if (children && !Array.isArray(children))
      children = [children]

    if (children && children.length)
      jsxDfsAst(children, result) as any
  }
  return result
}
