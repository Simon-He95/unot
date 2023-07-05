import { describe, expect, it } from 'vitest'
import { transform } from '../src/transform'

describe('should', () => {
  it('exported', () => {
    expect(transform('class="bg-[rgba(0,0,0)] text-[#fff]"')).toMatchInlineSnapshot('"class=\\"bg-[rgba(0,0,0)] text-[#fff]\\""')
  })
  it('exported', () => {
    expect(transform('class="translate-x-[-1px]"')).toMatchInlineSnapshot('"class=\\"translate-x-[-1px]\\""')
  })
  it('exported', () => {
    expect(transform(`class=" 
    xxmax-w
    maxw-1
     xx-col flex-col-x"`)).toMatchInlineSnapshot(`
       "class=\\" 
           xxmax-w
           max-w-1
            xx-col flex-col-x\\""
     `)
  })
  it('exported', () => {
    expect(transform('class="bg-rgba(1,1,1,1)"')).toMatchInlineSnapshot('"class=\\"bg-[rgba(1,1,1,1)]\\""')
  })

  it('expxxxorted', () => {
    expect(transform('class=" w-[calc(100%-20px)] "')).toMatchInlineSnapshot('"class=\\" w-[calc(100%-20px)] \\""')
  })
})
