import { describe, expect, it } from 'vitest'
import { transform } from '../src/transform'

describe('should', () => {
  it('exported', () => {
    expect(transform('class="bg-rgba(0,0,0) text-[#fff]"')).toMatchInlineSnapshot('"class=\\"bg-[rgba(0,0,0)] text-[#fff]\\""')
  })
  it('exported', () => {
    expect(transform('class="-translatex1px"')).toMatchInlineSnapshot('"class=\\"-translate-x-[1px]\\""')
  })
  it('exported', () => {
    expect(transform('class="maxw100%"')).toMatchInlineSnapshot('"class=\\"max-w-[100%]\\""')
  })
  it('exported', () => {
    expect(transform(`class=" 
    xxmax-w
    max-w-1
     xx-col flex-col-x"`)).toMatchInlineSnapshot(`
       "class=\\" 
           xxmax-w
           max-w1
            xx-col flex-col-x\\""
     `)
  })
  it('exported', () => {
    expect(transform('class="bg-hsl(150 , 30% , 60% , 0.8)"')).toMatchInlineSnapshot('"class=\\"bg-[hsl(150,30%,60%,0.8)]\\""')
  })
  it('exported', () => {
    expect(transform('class="bg-rgba(150 30% 60% / 0.8)"')).toMatchInlineSnapshot('"class=\\"bg-[rgba(150,30%,60%,0.8)]\\""')
  })

  it('exported', () => {
    expect(transform('class=" w-calc(100% - 20px) "')).toMatchInlineSnapshot('"class=\\" w-[calc(100%-20px)] \\""')
  })
  it('exported', () => {
    expect(
      transform('class="text-[rgba(1,1,1,1),hover:pink,2xl,lg:hover:3xl]"')).toMatchInlineSnapshot('"class=\\"text-[rgba(1,1,1,1)] hover:text-pink text-2xl lg:hover:text-3xl\\""')
  })
  it('exported', () => {
    expect(
      transform('class="-translatex50rem!"')).toMatchInlineSnapshot('"class=\\"-translate-x-[50rem]!\\""')
  })
  it('exported', () => {
    expect(
      transform('class="text#fff!"')).toMatchInlineSnapshot('"class=\\"text-[#fff!]\\""')
  })
  it('exported', () => {
    expect(
      transform('class="textrgba(1,2,3,.1)!"')).toMatchInlineSnapshot('"class=\\"text-[rgba(1,2,3,.1)]!\\""')
  })
  it('exported', () => {
    expect(
      transform(':class="[\'hcalc(100vh-104px)\']"')).toMatchInlineSnapshot('":class=\\"[\'h-[calc(100vh-104px)]\']\\""')
  })
  it('exported', () => {
    expect(
      transform('class="hcalc(100vh-104px)"')).toMatchInlineSnapshot('"class=\\"h-[calc(100vh-104px)]\\""')
  })
  it('match error', () => {
    expect(
      transform(':class="hover:(text-white rounded)"')).toMatchInlineSnapshot('":class=\\"hover:text-white hover:rounded\\""')
  })
  it('match error', () => {
    expect(
      transform(':class="hover:(flex-center) w10"')).toMatchInlineSnapshot('":class=\\"hover:flex hover:justify-center hover:items-center w10\\""')
  })
  it('match error', () => {
    expect(
      transform(':class="hover:(flex-center) w10"')).toMatchInlineSnapshot('":class=\\"hover:flex hover:justify-center hover:items-center w10\\""')
  })
  it('match error', () => {
    expect(
      transform(':class=" w10 !(flex-center w10) w20"')).toMatchInlineSnapshot('":class=\\" w10 !flex-center !w10 w20\\""')
  })
  it('match error', () => {
    expect(
      transform(':class=" top10 gapx-1"')).toMatchInlineSnapshot('":class=\\" top-10 gap-x-1\\""')
      expect(
        transform(':class=" [x?\'top10\': \'gapx1\']"')).toMatchInlineSnapshot('":class=\\" [x?\'top-10\': \'gapx-1\']\\""')
  })
})
