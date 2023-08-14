import * as vscode from 'vscode'
import { addEventListener, copyText, createBottomBar, createCompletionItem, createRange, createSelect, getConfiguration, message, registerCommand, registerCompletionItemProvider, updateText } from '@vscode-use/utils'
import { findUp } from 'find-up'
import { Processor } from 'windicss/lib'
import type { colorObject } from 'windicss/types/interfaces'
import { rules, transformClassAttr } from './transform'
import { getUnoCompletions } from './search'
import { CssToUnocssProcess } from './process'
import { LRUCache1, addCacheReact, addCacheVue, cacheMap, flatColors, getMultipedUnocssText, hasFile, hex2RGB, parser, parserAst, resetDecorationType, transformUnocssBack } from './utils'

const toUnocssMap = new LRUCache1(5000)
const processor = new Processor() as Processor
export const colors = flatColors(
  processor.theme('colors', {}) as colorObject,
)
export async function activate(context: vscode.ExtensionContext) {
  const activeTextEditor = vscode.window.activeTextEditor
  if (!activeTextEditor)
    return
  const pkgs = await hasFile(['**/package.json'])
  if (!pkgs.some(pkg => pkg.includes('unocss')))
    return

  let unoToCssToggle = true
  const styleReg = /style="([^"]+)"/
  const document = activeTextEditor.document
  const { presets = [], prefix = ['ts', 'js', 'vue', 'tsx', 'jsx', 'svelte'] } = getConfiguration('UnoT')
  const process = new CssToUnocssProcess()
  const LANS = ['html', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'solid', 'swan', 'react', 'js', 'ts', 'tsx', 'jsx', 'wxml', 'axml', 'css', 'wxss', 'acss', 'less', 'scss', 'sass', 'stylus', 'wxss', 'acss']
  const md = new vscode.MarkdownString()
  md.isTrusted = true
  md.supportHtml = true
  let copyClass = ''
  let copyAttr = ''
  // 注册ToUnocss命令
  context.subscriptions.push(registerCommand('UnoT.ToUnocss', async () => {
    const textEditor = vscode.window.activeTextEditor!
    const doc = textEditor.document
    const fileName = doc.fileName
    // 获取全部文本区域
    const selection = createRange([0, 0], [doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length])
    const text = doc.getText(selection)
    // 替换文件内容
    const newSelection = await process.convertAll(text, fileName)
    if (!newSelection)
      return
    textEditor.edit((builder) => {
      builder.replace(selection, newSelection)
    })
  }))
  // 注册InlineStyleToUnocss命令
  context.subscriptions.push(registerCommand('UnoT.InlineStyleToUnocss', async () => {
    const textEditor = vscode.window.activeTextEditor!
    const doc = textEditor.document
    let selection: vscode.Selection | vscode.Range = textEditor.selection
    // 获取选中区域
    if (selection.isEmpty)
      selection = createRange([0, 0], [doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length])

    const text = doc.getText(selection)
    const newSelection = await process.convert(text)
    if (!newSelection)
      return
    // 替换文件内容
    textEditor.edit((builder) => {
      builder.replace(selection, newSelection)
    })
  }))
  context.subscriptions.push(registerCommand('UnoT.copyAttr', () => {
    copyText(copyAttr)
    message.info('copy successfully')
  }))
  context.subscriptions.push(registerCommand('UnoT.copyClass', () => {
    copyText(copyClass)
    message.info('copy successfully')
  }))

  // style to unocss hover事件
  context.subscriptions.push(vscode.languages.registerHoverProvider(LANS, {
    provideHover(document, position) {
      // 获取当前选中的文本范围
      const editor = vscode.window.activeTextEditor
      if (!editor)
        return
      // 移除样式
      const selection = editor.selection
      const wordRange = new vscode.Range(selection.start, selection.end)
      let selectedText = editor.document.getText(wordRange)
      const realRangeMap: any = []
      if (!selectedText) {
        const range = document.getWordRangeAtPosition(position) as any
        let word = document.getText(range)
        if (!word)
          return
        const line = range.c.c
        const lineNumber = position.line
        const lineText = document.lineAt(lineNumber).text
        const styleMatch = word.match(styleReg)
        if (styleMatch) {
          word = styleMatch[1]
          const index = styleMatch.index!
          realRangeMap.push({
            content: styleMatch[0],
            range: createRange([line, index!], [line, index! + styleMatch[1].length]),

          })
        }
        else {
          // 可能存在多项，查找离range最近的
          if (lineText.indexOf(':') < 1)
            return
          const wholeReg = new RegExp(`([\\w\\-]+\\s*:\\s)?([\\w\\-\\[\\(\\!]+)?${word}(:*\\s*[^:"}{\`;\\/>]+)?`, 'g')
          for (const match of lineText.matchAll(wholeReg)) {
            const { index } = match
            const pos = index! + match[0].indexOf(word)
            if (pos === range?.c?.e) {
              word = match[0]
              realRangeMap.push({
                content: match[0],
                range: createRange([line, index!], [line, index! + match[0].length]),
              })
              break
            }
          }
        }
        selectedText = word.replace(/'/g, '').trim()
      }

      // 获取当前选中的文本内容
      if (!selectedText || !/[\w\-]+\s*:[^.]+/.test(selectedText))
        return
      if (toUnocssMap.has((selectedText)))
        return setStyle1(editor, realRangeMap, toUnocssMap.get(selectedText))
      const selectedUnocssText = getMultipedUnocssText(selectedText)
      if (!selectedUnocssText)
        return
      // 设置缓存
      toUnocssMap.set(selectedText, selectedUnocssText)

      return setStyle1(editor, realRangeMap, selectedUnocssText)
    },
  }))

  context.subscriptions.push(registerCommand('UnoT.switchToCss', () => {
    createSelect([
      'open',
      'close',
    ]).then((r) => {
      unoToCssToggle = r === 'open'
    })
  }))

  // 监听编辑器选择内容变化的事件
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
    const languageId = document.languageId
    if (languageId === 'vue')
      addCacheVue(document.getText() as string)
    else if (languageId === 'typescriptreact')
      addCacheReact(document!.getText() as string)
  }))

  // unocss to css hover事件
  context.subscriptions.push(vscode.languages.registerHoverProvider(LANS, {
    provideHover(document, position) {
      // 开关如果选择使用官方的unocss插件，可以选择关闭
      if (!unoToCssToggle)
        return

      if (!document)
        return
      const editor = vscode.window.activeTextEditor
      if (!editor)
        return
      // 移除样式
      resetDecorationType()
      const selection = editor.selection
      const wordRange = new vscode.Range(selection.start, selection.end)
      let selectedText = editor.document.getText(wordRange)
      const { line, character } = position
      const allText = document.getText()
      const lineText = allText.split('\n')[line]
      if (!selectedText) {
        let _text = lineText[character]
        if (!_text || /[><\s\/]/.test(_text))
          return
        let i = character
        let c
        while (!/[\s\/"><]/.test((c = lineText[--i])) && c)
          _text = `${c}${_text}`

        let j = character
        while (!/[\s\/"><]/.test((c = lineText[++j])) && c)
          _text = `${_text}${c}`

        if (_text.includes('="')) {
          const texts = _text.split('="')
          if (/class(Name)?/.test(texts[0]))
            _text = texts[1]

          else if (texts[1] === '~')
            _text = texts[0]

          else
            _text = texts.join('-')
        }
        else {
          _text = _text.replace(/[\[\]\(\)]/g, v => `\\${v}`)
          const newReg = new RegExp(`(\\w+)="[^"]*${_text}[^"]*"`, 'g')

          for (const match of lineText.matchAll(newReg)) {
            if (!match)
              continue
            const index = match.index!
            if (index <= character && character <= index + match[0].length) {
              if (!/class(Name)?/.test(match[1])) {
                if (_text.includes(':')) {
                  const temp = _text.split(':')
                  _text = `${temp.slice(0, -1).join('-')}-${match[1]}-${temp.slice(-1)[0]}`
                }
                else { _text = `${match[1]}-${_text}` }
              }
              break
            }
          }
        }

        selectedText = _text
      }
      else {
        if (selectedText.trim() === '')
          return

        const pos = lineText.indexOf(selectedText)
        if (pos < 0)
          return
        selectedText = selectedText.trim()
      }
      selectedText = selectedText.replace(/\\/g, '')
      if (cacheMap.has(selectedText)) {
        const cacheText = cacheMap.get(selectedText)
        return setStyle2(cacheText)
      }
      return new Promise((resolve) => {
        transformUnocssBack(selectedText).then((css) => {
          if (!css)
            return resolve(null)
          cacheMap.set(selectedText, css)
          resolve(setStyle2(css))
        })
      })
    },
  }))

  if (document) {
    const languageId = document.languageId
    if (languageId === 'vue')
      addCacheVue(document.getText() as string)
    else if (languageId === 'typescriptreact')
      addCacheReact(document!.getText() as string)
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
      if (!event.contentChanges.length)
        return
      if (languageId === 'vue')
        return addCacheVue(document.getText() as string)
      if (languageId === 'typescriptreact')
        return addCacheReact(document.getText() as string)
    }))
  }

  function setStyle1(editor: vscode.TextEditor, realRangeMap: any[], selectedUnocssText: string) {
    // 增加decorationType样式
    md.value = ''
    copyAttr = selectedUnocssText
    const copyIcon = '<img width="12" height="12" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyOWNkMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PHBhdGggZD0iTTIwLjk5OCAxMGMtLjAxMi0yLjE3NS0uMTA4LTMuMzUzLS44NzctNC4xMjFDMTkuMjQzIDUgMTcuODI4IDUgMTUgNWgtM2MtMi44MjggMC00LjI0MyAwLTUuMTIxLjg3OUM2IDYuNzU3IDYgOC4xNzIgNiAxMXY1YzAgMi44MjggMCA0LjI0My44NzkgNS4xMjFDNy43NTcgMjIgOS4xNzIgMjIgMTIgMjJoM2MyLjgyOCAwIDQuMjQzIDAgNS4xMjEtLjg3OUMyMSAyMC4yNDMgMjEgMTguODI4IDIxIDE2di0xIi8+PHBhdGggZD0iTTMgMTB2NmEzIDMgMCAwIDAgMyAzTTE4IDVhMyAzIDAgMCAwLTMtM2gtNEM3LjIyOSAyIDUuMzQzIDIgNC4xNzIgMy4xNzJDMy41MTggMy44MjUgMy4yMjkgNC43IDMuMTAyIDYiLz48L2c+PC9zdmc+" />'
    md.appendMarkdown('<a href="https://github.com/Simon-He95/tounocss">To Unocss:</a>\n')
    md.appendMarkdown(`\n<a href="command:UnoT.copyAttr">attributify: ${copyIcon} ${selectedUnocssText}</a>\n`)
    md.appendMarkdown('\n')
    copyClass = selectedUnocssText.replace(/="([^"]+)"/g, (_, v) => `-${v}`)
    md.appendMarkdown(`\n<a href="command:UnoT.copyClass">class: ${copyIcon} ${copyClass}</a>\n`)

    return new vscode.Hover(md)
  }

  function setStyle2(css: string) {
    md.value = ''
    md.appendMarkdown('<a href="https://github.com/Simon-He95/unocss-to-css">Unocss To Css:</a>\n')
    md.appendCodeblock(css, 'css')
    return new vscode.Hover(md)
  }

  let hasUnoConfig: string | undefined
  const currentFolder = (vscode.workspace.workspaceFolders as any)?.[0]
  const activeTextEditorUri = vscode.window.activeTextEditor?.document?.uri?.path
  let completions: vscode.CompletionItem[] = []
  let unoCompletionsMap: any
  const statusBarItem = createBottomBar({
    text: 'uno-magic off 😞',
    command: {
      title: 'uno-magic',
      command: 'unotmagic.changeStatus',
    },
    position: 'left',
    offset: 500,
  })
  if (currentFolder)
    await updateUnoStatus(vscode.window.activeTextEditor?.document.uri.fsPath)
  if (presets.length)
    rules.unshift(...presets)
  let isOpen = true

  registerCommand('unotmagic.changeStatus', () => {
    isOpen = !isOpen
    statusBarItem.text = `uno-magic ${isOpen ? 'off 😞' : 'on 🤩'}`
  })

  context.subscriptions.push(addEventListener('text-save', (document: vscode.TextDocument) => {
    const activeTextEditor = vscode.window.activeTextEditor
    if (!isOpen || !hasUnoConfig || !activeTextEditor)
      return
    // 对文档保存后的内容进行处理
    const text = document.getText()
    const classAttr = parserAst(text)
    if (!classAttr)
      return
    const changeList = transformClassAttr(classAttr as any)
    if (changeList.length) {
      updateText((edit) => {
        changeList.forEach((change: any) => {
          edit.replace(new vscode.Range(new vscode.Position(change.start.line - 1, change.start.column), new vscode.Position(change.end.line - 1, change.end.column - 1)), change.content)
        })
      })
    }
  }))

  context.subscriptions.push(addEventListener('activeText-change', () =>
    setTimeout(async () => {
      const url = vscode.window.activeTextEditor?.document.uri.fsPath
      if (!url)
        return
      await updateUnoStatus(url)
      if (!hasUnoConfig)
        statusBarItem.hide()
      else
        statusBarItem.show()
    }),
  ))
  if (!hasUnoConfig) {
    context.subscriptions.push(addEventListener('file-create', () => {
      updateUnoStatus()
    }))
  }

  function updateUnoStatus(cwd = currentFolder.uri.fsPath.replace(/\\/g, '/')) {
    if (activeTextEditorUri && !prefix.includes(activeTextEditorUri.split('.').slice(-1)[0])) {
      hasUnoConfig = undefined
      return
    }
    return findUp(['uno.config.js', 'uno.config.ts', 'unocss.config.js', 'unocss.config.ts'], { cwd })
      .then((filepath?: string) => {
        if (!filepath)
          return
        if (!completions.length) {
          getUnoCompletions(filepath).then((res: any) => {
            completions = res
            unoCompletionsMap = [
              ...['class', 'className', 'id', 'style'].map(item => createCompletionItem({ content: item, snippet: `${item}="$1"`, type: 5 })),
              ...completions
                .map(([content, detail, colorInfo]: any) => {
                  const documentation = new vscode.MarkdownString()
                  documentation.appendCodeblock(detail, 'css')

                  if (colorInfo) {
                    const { color, opacity } = colorInfo
                    if (opacity) {
                      const rgb = hex2RGB(colors[color])
                      return createCompletionItem({ content, detail: `rgba(${rgb?.join(',')},${opacity / 100})`, type: vscode.CompletionItemKind.Color, documentation })
                    }
                    return createCompletionItem({ content, detail: colors[color], type: vscode.CompletionItemKind.Color, documentation })
                  }
                  if (content.startsWith('animate'))
                    return createCompletionItem({ content, documentation, type: vscode.CompletionItemKind.Unit })

                  return createCompletionItem({ content, documentation, type: vscode.CompletionItemKind.Enum })
                })]
          })
        }
        hasUnoConfig = filepath
        statusBarItem.show()
      })
  }
  // 如果是unocss环境下,给出一些预设提醒
  context.subscriptions.push(registerCompletionItemProvider(['javascript', 'javascriptreact', 'svelte', 'solid', 'typescriptreact', 'html', 'vue', 'css'], (document, position) => {
    if (!hasUnoConfig)
      return
    const data = parser(document.getText(), position)
    if (data?.isJSX) {
      if (data?.propName === 'className')
        return unoCompletionsMap
    }
    else if (data?.type === 'props' || data === true) {
      return unoCompletionsMap
    }
  }, ['"', '\'', ' ']))
}

export function deactivate() {
  toUnocssMap.clear()
  cacheMap.clear()
}
