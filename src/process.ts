import { getConfiguration } from '@vscode-use/utils'
import { transfromCode } from 'transform-to-unocss'
import { getCssType, getMultipedUnocssText } from './utils'

export class CssToUnocssProcess {
  /**
   * transform multiple style to unocss
   *
   * @param {string} text origin text
   * @return {string} transformed text
   */
  convert(text: string) {
    return getMultipedUnocssText(text)
  }

  /**
   * transform all page to unocss
   *
   * @param {string} code origin text
   * @return {string} transformed text
   */
  async convertAll(code: string, fileName: string): Promise<string> {
    if (!code)
      return ''
    const type = getCssType(fileName) as any
    const isJsx = getConfiguration('unot.classMode')
    return await transfromCode(code, { filepath: fileName, type, isJsx })
  }
}
