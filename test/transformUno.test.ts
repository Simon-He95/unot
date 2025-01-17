import { toUnocssClass, transformStyleToUnocss } from 'transform-to-unocss-core'
import { describe, expect, it } from 'vitest'

describe('should', () => {
  it('toUnocssClass', () => {
    expect(toUnocssClass(`width: 550px;
    height: 307px;
    background: #000000;`)[0]).toMatchInlineSnapshot('"w-550px h-307px bg-[#000000]"')
  })
  it('transformStyleToUnocss', () => {
    expect(transformStyleToUnocss(`width: 550px;
    height: 307px;
    background: #000000;`)[0]).toMatchInlineSnapshot('"w-550px h-307px bg=\\"[#000000]\\""')
  })
})
