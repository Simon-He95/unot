import * as vscode from 'vscode'
import type { TextEditorDecorationType } from 'vscode'
import { addEventListener, createBottomBar, createPosition, createRange, getActiveText, getActiveTextEditor, getConfiguration, getCopyText, getCurrentFileUrl, getLineText, getLocale, getSelection, message, nextTick, registerCommand, setConfiguration, setCopyText, updateText } from '@vscode-use/utils'
import { findUp } from 'find-up'
import { toUnocssClass, transformStyleToUnocss } from 'transform-to-unocss-core'
import { rules, transformAttrs, transformClassAttr } from './transform'
import { CssToUnocssProcess } from './process'
import { LRUCache, getMultipedUnocssText, hasFile, highlight, parserAst } from './utils'
import { openDocumentation } from './openDocumentation'
import { openPlayground } from './openPlayground'
import type { ChangeList } from './type'
import { parser } from './parser'

const cacheMap = new LRUCache(5000)
export let toRemFlag = false
export let decorationType: TextEditorDecorationType
export async function activate(context: vscode.ExtensionContext) {
  const activeTextEditor = getActiveTextEditor()
  if (!activeTextEditor)
    return

  // 注册打开文档事件
  openDocumentation(context)
  openPlayground(context)
  const pkgs = await hasFile(['**/package.json'])
  const isNotUnocss = !pkgs.some(pkg => pkg.includes('unocss'))

  const styleReg = /style="([^"]+)"/
  const { presets = [], prefix = ['ts', 'js', 'vue', 'tsx', 'jsx', 'svelte'], dark, light } = getConfiguration('unot')
  const process = new CssToUnocssProcess()
  const LANS = ['html', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'solid', 'swan', 'react', 'js', 'ts', 'tsx', 'jsx', 'wxml', 'axml', 'css', 'wxss', 'acss', 'less', 'scss', 'sass', 'stylus', 'wxss', 'acss']
  const md = new vscode.MarkdownString()
  md.isTrusted = true
  md.supportHtml = true
  let copyClass = ''
  let copyAttr = ''
  let copyRange: any
  const style = {
    dark: Object.assign({
      textDecoration: 'underline',
      backgroundColor: 'rgba(144, 238, 144, 0.5)',
      color: 'black',
    }, dark),
    light: Object.assign({
      textDecoration: 'underline',
      backgroundColor: 'rgba(255, 165, 0, 0.5)',
      color: '#ffffff',
      borderRadius: '6px',
    }, light),
  }
  decorationType = vscode.window.createTextEditorDecorationType(style)

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

  // 注册快捷指令
  context.subscriptions.push(registerCommand('UnoT.transform', async () => {
    const selection = getSelection()
    if (!selection)
      return
    const { line, character, lineText } = selection
    const copyText = (await getCopyText()).trim()
    if (!copyText)
      return
    const locale = getLocale()
    const isZh = locale.includes('zh')
    let pre = character - 1
    let prefixName = ''
    while (pre > 0 && (lineText[pre] !== '"' || lineText[pre - 1] !== '=') && (lineText[pre] !== '{' || lineText[pre - 1] !== '=')) {
      if ((lineText[pre] === '>' || lineText[pre] === '"') && lineText[pre - 1] !== '=') {
        prefixName = ''
        break
      }
      pre--
    }

    if (lineText[--pre] === '=') {
      pre--
      while (pre > 0 && !(/[\s'"><\/]/.test(lineText[pre]))) {
        prefixName = `${lineText[pre]}${prefixName}`
        pre--
      }
    }

    let transferred = ''
    let noTransferred = []
    if (prefixName)
      [transferred, noTransferred] = toUnocssClass(copyText)
    else
      [transferred, noTransferred] = transformStyleToUnocss(copyText)

    if (noTransferred.length) {
      message.error(`${isZh ? '⚠️ 有一些属性unocss暂时还不支持转换，请自行处理：' : '⚠️ Some attributes unocss do not support conversion for the time being, please deal with them by yourself: '}${noTransferred.join('; ')}`)
      return
    }

    updateText((builder) => {
      builder.insert(new vscode.Position(line, character), transferred)
    })

    message.info(`${isZh ? '🎉 转换成功：' : '🎉 Successful conversion: '}${transferred}`)
  }))

  context.subscriptions.push(registerCommand('UnoT.copyAttr', () => {
    setCopyText(copyAttr)
    message.info(`copy successfully ➡️ ${copyAttr}`)
    replaceStyleToAttr(copyAttr, true)
  }))

  context.subscriptions.push(registerCommand('UnoT.copyClass', () => {
    setCopyText(copyClass)
    message.info(`copy successfully ➡️ ${copyClass}`)
    replaceStyleToAttr(copyClass, false)
  }))

  function replaceStyleToAttr(text: string, isAttr: boolean) {
    let item: any
    let isRemoveAfter = false
    if (copyRange?.length) {
      // 如果最后一位的后面跟着; 则end+1
      const afterChar = getLineText(copyRange[0].range.end.line)![copyRange[0].range.end.character]
      isRemoveAfter = afterChar === ';'
      item = {
        range: copyRange[0].range,
      }
    }
    else {
      item = {
        range: getActiveTextEditor()!.selection,
      }
    }

    const ast = parser(getActiveText()!, item.range.start)
    if (ast?.tag) {
      const propClass = ast.props?.find((i: any) => i.name === (ast.isJsx ? 'className' : 'class'))
      if (!isAttr && propClass) {
        updateText((edit) => {
          edit.insert(new vscode.Position(propClass.value.loc.start.line - 1, propClass.value.loc.start.column), propClass.value.content ? `${text} ` : text)
          edit.replace(updateRange(item.range), '')
        })
      }
      else if (ast.props?.length > 1) {
        const pos = ast.props.find((i: any) => i.name !== 'style')!.loc
        updateText((edit) => {
          edit.insert(new vscode.Position(pos.start.line - 1, pos.start.column - 1), isAttr ? `${text} ` : `${ast.isJsx ? 'className' : 'class'}="${text}" `)
          edit.replace(updateRange(item.range), '')
        })
      }
      else {
        const pos = {
          line: ast.loc.start.line,
          column: ast.loc.start.column + ast.tag.length + 1,
          offset: ast.loc.start.offset + ast.tag.length + 1,
        }
        updateText((edit) => {
          edit.insert(new vscode.Position(pos.line - 1, pos.column), isAttr ? `${text} ` : `${ast.isJsx ? 'className' : 'class'}="${text}" `)
          edit.replace(updateRange(item.range), '')
        })
      }
    }
    else {
      updateText((edit) => {
        edit.replace(updateRange(item.range), text)
      })
    }

    function updateRange(range: any) {
      if (!isRemoveAfter)
        return range
      return new vscode.Range(new vscode.Position(range.start.line, range.start.character), new vscode.Position(range.end.line, range.end.character + 1))
    }
  }

  if (isNotUnocss)
    return

  // style to unocss hover事件
  context.subscriptions.push(vscode.languages.registerHoverProvider(LANS, {
    provideHover(document, position) {
      // 获取当前选中的文本范围
      const editor = getActiveTextEditor()
      if (!editor)
        return
      // 移除样式
      editor.setDecorations(decorationType, [])
      const selection = editor.selection
      const wordRange = new vscode.Range(selection.start, selection.end)
      let selectedText = editor.document.getText(wordRange)
      const realRangeMap: any = []
      if (!selectedText) {
        const range = document.getWordRangeAtPosition(position) as any
        if (!range)
          return
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
      const key = `${selectedText}-${toRemFlag}`
      if (cacheMap.has((key)))
        return setStyle(cacheMap.get(key), realRangeMap)
      const selectedUnocssText = getMultipedUnocssText(selectedText)
      if (!selectedUnocssText)
        return
      // 设置缓存
      cacheMap.set(key, selectedUnocssText)

      return setStyle(selectedUnocssText, realRangeMap)
    },
  }))

  context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(() => {
    // 移除装饰器
    getActiveTextEditor()?.setDecorations(decorationType, [])
  }))

  context.subscriptions.push(addEventListener('text-change', () => getActiveTextEditor()?.setDecorations(decorationType, [])))

  context.subscriptions.push(addEventListener('selection-change', () => getActiveTextEditor()?.setDecorations(decorationType, [])))

  function setStyle(selectedUnocssText: string, rangeMap: vscode.Range[]) {
    // 增加decorationType样式
    md.value = ''
    copyAttr = selectedUnocssText
    copyRange = rangeMap
    highlight(rangeMap)
    const useHex = getConfiguration('unot.useHex')
    const copyIcon = '<img width="12" height="12" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyOWNkMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PHBhdGggZD0iTTIwLjk5OCAxMGMtLjAxMi0yLjE3NS0uMTA4LTMuMzUzLS44NzctNC4xMjFDMTkuMjQzIDUgMTcuODI4IDUgMTUgNWgtM2MtMi44MjggMC00LjI0MyAwLTUuMTIxLjg3OUM2IDYuNzU3IDYgOC4xNzIgNiAxMXY1YzAgMi44MjggMCA0LjI0My44NzkgNS4xMjFDNy43NTcgMjIgOS4xNzIgMjIgMTIgMjJoM2MyLjgyOCAwIDQuMjQzIDAgNS4xMjEtLjg3OUMyMSAyMC4yNDMgMjEgMTguODI4IDIxIDE2di0xIi8+PHBhdGggZD0iTTMgMTB2NmEzIDMgMCAwIDAgMyAzTTE4IDVhMyAzIDAgMCAwLTMtM2gtNEM3LjIyOSAyIDUuMzQzIDIgNC4xNzIgMy4xNzJDMy41MTggMy44MjUgMy4yMjkgNC43IDMuMTAyIDYiLz48L2c+PC9zdmc+" />'
    md.appendMarkdown('<a href="https://github.com/Simon-He95/unot">To Unocss:</a>\n')
    md.appendMarkdown(`\n<a href="command:UnoT.copyAttr">attributify: ${copyIcon} ${useHex ? selectedUnocssText..replace(/\[#([a-zA-Z0-9]+)\]/i, 'hex-$1') : selectedUnocssText}</a>\n`)
    md.appendMarkdown('\n')
    copyClass = selectedUnocssText.replace(/([^\s\=]+)="([^"]+)"/, (_, v1, v2) => v2.split(' ').map((v: string) => `${v1}-${v}`).join(' '))
    md.appendMarkdown(`\n<a href="command:UnoT.copyClass">class: ${copyIcon} ${useHex ? copyClass..replace(/\[#([a-zA-Z0-9]+)\]/i, 'hex-$1') : copyClass}</a>\n`)

    return new vscode.Hover(md)
  }

  let hasUnoConfig: string | undefined
  const currentFolder = (vscode.workspace.workspaceFolders as any)?.[0]
  const activeTextEditorUri = getCurrentFileUrl()
  if (!activeTextEditorUri)
    return
  // const completions: vscode.CompletionItem[] = []
  // let unoCompletionsMap: any
  const switchMagic = getConfiguration('unot').get('switchMagic')

  let isOpen = switchMagic
  const statusBarItem = createBottomBar({
    text: `uno-magic ${isOpen ? '✅' : '❌'}`,
    command: {
      title: 'uno-magic',
      command: 'unotmagic.changeStatus',
    },
    position: 'left',
    offset: 500,
  })

  const bottomBar = createBottomBar({
    text: 'to-rem ❌',
    command: {
      title: 'unot-toRem',
      command: 'unotToRem.changeStatus',
    },
    position: 'left',
    offset: 500,
  })

  context.subscriptions.push(registerCommand('unotToRem.changeStatus', () => {
    toRemFlag = !toRemFlag
    bottomBar.text = `to-rem ${toRemFlag ? '✅' : '❌'}`
  }))

  bottomBar.show()

  if (currentFolder)
    await updateUnoStatus(getCurrentFileUrl())
  if (presets.length)
    rules.unshift(...presets)

  registerCommand('unotmagic.changeStatus', () => {
    isOpen = !isOpen
    setConfiguration('unot.switchMagic', isOpen)
    statusBarItem.text = `uno-magic ${isOpen ? '✅' : '❌'}`
  })

  context.subscriptions.push(addEventListener('text-save', (document: vscode.TextDocument) => {
    const activeTextEditor = getActiveTextEditor()
    if (!isOpen || !hasUnoConfig || !activeTextEditor)
      return
    // 对文档保存后的内容进行处理
    const text = document.getText()
    const { classAttr, attrs } = parserAst(text) as any
    const changeList: ChangeList[] = []

    if (classAttr)
      changeList.push(...transformClassAttr(classAttr as any))
    if (attrs)
      changeList.push(...transformAttrs(attrs))

    if (changeList.length) {
      updateText((edit) => {
        changeList.forEach((change: any) => {
          edit.replace(new vscode.Range(createPosition(change.start.line - 1, change.start.column), createPosition(change.end.line - 1, change.end.column - 1)), change.content)
        })
      })
      nextTick(() => {
        // 文件已更新,调用保存
        activeTextEditor.document.save()
      })
    }
  }))

  context.subscriptions.push(addEventListener('activeText-change', () =>
    setTimeout(async () => {
      const url = getCurrentFileUrl()
      if (!url)
        return
      await updateUnoStatus(url)
      if (!hasUnoConfig)
        statusBarItem.hide()
      else
        statusBarItem.show()
    }, 200)))

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
        // if (!completions.length) {
        //   getUnoCompletions(filepath).then((res: any) => {
        //     completions = res
        //     unoCompletionsMap = completions
        //       .map(([content, detail]: any) => {
        //         const documentation = new vscode.MarkdownString()
        //         documentation.appendCodeblock(detail, 'css')
        //         if (content.startsWith('animate'))
        //           return createCompletionItem({ content, documentation, type: vscode.CompletionItemKind.Unit })

        //         return createCompletionItem({ content, documentation, type: vscode.CompletionItemKind.Enum })
        //       })
        //   })
        // }
        hasUnoConfig = filepath
        statusBarItem.show()
      })
  }
}

export function deactivate() {
  cacheMap.clear()
}
