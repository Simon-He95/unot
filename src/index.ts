import fs from 'node:fs'
import * as vscode from 'vscode'
import { addEventListener, copyText, createBottomBar, createCompletionItem, createRange, createSelect, getConfiguration, message, registerCommand, registerCompletionItemProvider } from '@vscode-use/utils'
import { findUp } from 'find-up'
import { rules, transform } from './transform'
import { getUnoCompletions } from './search'
import { CssToUnocssProcess } from './process'
import { LRUCache1, addCacheReact, addCacheVue, cacheMap, getMultipedUnocssText, hasFile, highlight, resetDecorationType, style, transformUnocssBack, unoToCssDecorationType } from './utils'

const toUnocssMap = new LRUCache1(5000)

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
  const LANS = ['html', 'vue', 'svelte', 'solid', 'swan', 'react', 'js', 'ts', 'tsx', 'jsx', 'wxml', 'axml', 'css', 'wxss', 'acss', 'less', 'scss', 'sass', 'stylus', 'wxss', 'acss']
  const md = new vscode.MarkdownString()
  md.isTrusted = true
  md.supportHtml = true
  let copyClass = ''
  let copyAttr = ''
  const toUnocssDecorationType = vscode.window.createTextEditorDecorationType(style)
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
      vscode.window.activeTextEditor?.setDecorations(toUnocssDecorationType, [])
      const selection = editor.selection
      const wordRange = new vscode.Range(selection.start, selection.end)
      let selectedText = editor.document.getText(wordRange)
      const realRangeMap: any = []
      if (!selectedText) {
        const range = document.getWordRangeAtPosition(position) as any
        let word = document.getText(range)
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
      const realRangeMap: any = []
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
          if (/class(Name)?/.test(texts[0])) {
            _text = texts[1]
            realRangeMap.push(createRange(
              [line, j - texts[1].length],
              [line, j],
            ))
          }
          else if (texts[1] === '~') {
            _text = texts[0]

            realRangeMap.push(createRange(
              [line, j - texts[1].length],
              [line, j],
            ))
            realRangeMap.push(createRange(
              [line, i + 1],
              [line, i + 1 + texts[0].length],
            ))
          }
          else {
            _text = texts.join('-')

            realRangeMap.push(createRange(
              [line, j - texts[1].length],
              [line, j],
            ))
          }
        }
        else {
          const newReg = new RegExp(`(\\w+)="[^"]*${_text}[^"]*"`, 'g')
          let isFind = false
          for (const match of lineText.matchAll(newReg)) {
            if (!match)
              continue
            const index = match.index!
            if (index <= character && character <= index + match[0].length) {
              isFind = true
              if (!/class(Name)?/.test(match[1])) {
                if (_text.includes(':')) {
                  const temp = _text.split(':')
                  _text = `${temp.slice(0, -1).join('-')}-${match[1]}-${temp.slice(-1)[0]}`
                }
                else { _text = `${match[1]}-${_text}` }

                realRangeMap.push(createRange(
                  [line, index],
                  [line, index + match[1].length],
                ))
              }

              realRangeMap.push(createRange(
                [line, i + 1],
                [line, j],
              ))
              break
            }
          }
          if (!isFind) {
            realRangeMap.push(createRange(
              [line, i + 1],
              [line, j],
            ))
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
        let offsetLeft = 0

        while (selectedText[offsetLeft] === ' ')
          offsetLeft++
        let offsetRight = -1
        while (selectedText.slice(offsetRight)[0] === ' ')
          offsetRight--
        offsetRight++
        realRangeMap.push(createRange(
          [line, pos + offsetLeft],
          [line, pos + selectedText.length + offsetRight],
        ))
        selectedText = selectedText.trim()
      }

      if (cacheMap.has(selectedText)) {
        const cacheText = cacheMap.get(selectedText)
        return setStyle2(realRangeMap, cacheText)
      }
      return new Promise((resolve) => {
        transformUnocssBack(selectedText).then((css) => {
          if (!css)
            return resolve(null)
          cacheMap.set(selectedText, css)
          resolve(setStyle2(realRangeMap, css))
        })
      })
    },
  }))

  // 监听编辑器选择内容变化的事件
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
    vscode.window.activeTextEditor?.setDecorations(toUnocssDecorationType, [])
    vscode.window.activeTextEditor?.setDecorations(unoToCssDecorationType, [])
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
    editor.edit(() => editor.setDecorations(toUnocssDecorationType, realRangeMap.map((item: any) => item.range)))

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

  function setStyle2(realRangeMap: any[], css: string) {
    // 增加decorationType样式
    highlight(realRangeMap)
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
  if (currentFolder)
    await updateUnoStatus(vscode.window.activeTextEditor?.document.uri.fsPath)
  if (presets.length)
    rules.unshift(...presets)
  let isOpen = true
  // 如果在class或者className中才处理成-[]
  const statusBarItem = createBottomBar({
    text: 'uno-magic off 😞',
    command: {
      title: 'uno-magic',
      command: 'unomagic.changeStatus',
    },
    position: 'left',
    offset: 500,
  })

  if (hasUnoConfig)
    statusBarItem.show()

  registerCommand('unomagic.changeStatus', () => {
    isOpen = !isOpen
    statusBarItem.text = `uno-magic ${isOpen ? 'off 😞' : 'on 🤩'}`
  })

  context.subscriptions.push(addEventListener('text-save', (document: vscode.TextDocument) => {
    const url = vscode.window.activeTextEditor!.document.uri.fsPath
    const activeTextEditor = vscode.window.activeTextEditor
    if (!isOpen || !hasUnoConfig || !activeTextEditor)
      return
    const beforeActivePosition = activeTextEditor.selection.active
    // 对文档保存后的内容进行处理
    const text = document.getText()
    const newText = transform(text)

    if (newText === text)
      return

    fs.promises.writeFile(url, newText, 'utf-8').then(() => {
      const beforeLineText = activeTextEditor.document.lineAt(beforeActivePosition.line).text
      const currentLineText = newText.split('\n')[beforeActivePosition.line]
      // 光标在class之后并且当前行与新当前行发生差异时需要偏移
      const match = beforeLineText.match(/(class(Name)?=")([^"]*)"/)
      const isAfterClass = match
        ? (match.index! + match[1].length - 1 < beforeActivePosition.character)
        : (currentLineText !== beforeLineText)
      const isInClass = match
        ? ((match.index! + match[1].length - 1 < beforeActivePosition.character) && (match.index! + match[1].length + match[3].length >= beforeActivePosition.character))
        : (currentLineText !== beforeLineText)
      let newPosition = isAfterClass
        ? beforeActivePosition.character + currentLineText.length - beforeLineText.length
        : beforeActivePosition.character
      if (isInClass) {
        while ((newPosition > 0) && (currentLineText[newPosition] !== undefined && currentLineText[newPosition] !== ' ' && currentLineText[newPosition] !== '"' && currentLineText[newPosition - 1] !== ' ' && currentLineText[newPosition - 1] !== '"' && currentLineText[newPosition + 1] !== '"' && currentLineText[newPosition + 1] !== ' '))
          newPosition--
      }

      const newCursorPosition = new vscode.Position(
        beforeActivePosition.line,
        newPosition,
      )
      setTimeout(() => {
        activeTextEditor.selection = new vscode.Selection(newCursorPosition, newCursorPosition)
      }, 100)
    })
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
            unoCompletionsMap = completions.map(([content, detail]: any) => createCompletionItem({ content, detail }))
          })
        }
        hasUnoConfig = filepath
      })
  }

  // 如果是unocss环境下,给出一些预设提醒
  context.subscriptions.push(registerCompletionItemProvider(['javascript', 'javascriptreact', 'svelte', 'solid', 'typescriptreact', 'html', 'vue', 'css'], () => hasUnoConfig && unoCompletionsMap, ['"', '\'', ' ']))
}

export function deactivate() {
  toUnocssMap.clear()
  cacheMap.clear()
}
