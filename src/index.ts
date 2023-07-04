import fs from 'node:fs'
import * as vscode from 'vscode'
import { addEventListener, createBottomBar, createCompletionItem, getConfiguration, registerCommand, registerCompletionItemProvider } from '@vscode-use/utils'
import { findUp } from 'find-up'
import { rules, transform } from './transform'
import { getUnoCompletions } from './search'

let cacheMap: any
export async function activate(context: vscode.ExtensionContext) {
  // 只针对当前根目录下有tailwind.config.js | tailwind.config.ts才生效
  const { presets = [], prefix = ['ts', 'js', 'vue', 'tsx', 'jsx', 'svelte'] } = getConfiguration('uno-magic')

  let hasUnoConfig: string | undefined
  const currentFolder = (vscode.workspace.workspaceFolders as any)?.[0]
  const activeTextEditorUri = vscode.window.activeTextEditor?.document?.uri?.path
  let completions: vscode.CompletionItem[] = []

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
    return findUp(['uno.config.js', 'uno.config.ts', 'unocss.config.js', 'unocss.config.ts'], { cwd }).then((res: string) => {
      if (!res)
        return
      if (!completions.length) {
        getUnoCompletions(res).then((res: any) => {
          completions = res
          cacheMap = completions.map(([content, detail]: any) => createCompletionItem({ content, detail }))
        })
      }
      hasUnoConfig = res
    })
  }

  // 如果是unocss环境下,给出一些预设提醒
  context.subscriptions.push(registerCompletionItemProvider(['javascript', 'javascriptreact', 'svelte', 'solid', 'typescriptreact', 'html', 'vue', 'css'], () => hasUnoConfig && cacheMap, ['"', '\'', ' ']))
}

export function deactivate() {
  cacheMap = null
}
