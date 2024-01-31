<p align="center">
<img height="200" src="./assets/kv.png" alt="UnoT">
</p>
<p align="center"> <a href="./README.md">English</a> | 简体中文</p>

UnoT 是 unocss tools 的简写，它是为了在vscode中使用unocss提供更加好的开发体验. 它集成了 [tounocss](https://github.com/Simon-He95/tounocss),  [vscode uno magic](https://github.com/Simon-He95/vscode-uno-magic)

![demo](/assets/demo.gif)

## 🦸🏻 能力
- 提供了hover style 提示对应 UnoCss 的css代码
- 开启 uno-magic 提供自动处理空格和括号的能力
- 提供了快捷键自动将浏览器复制的样式转换成 UnoCss
- 右键提供了快速打开 UnoCss 的文档 和 Unot 在线编辑的转换结果网站

## 💡 开启uno-magic
- text-\[red,hover:pink,2xl,lg:hover:3xl\] -> text-red hover:text-pink text-2xl lg:hover:text-3xl
- class or className content like `w-calc(100% - 20px)` -> `w-[calc(100%-20px)]` [🔎详情](https://github.com/Simon-He95/vscode-uno-magic)
- Provides code selection for unocss syntax [🔎详情](https://github.com/Simon-He95/vscode-uno-magic)
- Provide the unocss hover to display the css code [🔎详情](https://github.com/Simon-He95/unocss-to-css)
- bg#fff -> bg-#fff
- maxw-100% -> max-w-[100%]
- bg-[rgba(255, 255, 255, 0.5)] -> bg-[rgba(255,255,255,0.5)]
- -translatex50% -> translate-x-[-50%]
- hover:(text-red bg-blue) -> hover:text-red hover:bg-blue
- !(text-red bg-blue) -> !text-red !bg-blue
- h="[calc(100% - 20px)]" -> h="[calc(100%-20px)]"

## 核心能力来源于
- [transformToUnoCSS](https://github.com/Simon-He95/transformToUnoCSS)
- [transform-to-tailwindcss-core](https://github.com/Simon-He95/transform-to-tailwindcss-core)

## 新特性
支持将设计稿中的css直接通过快捷键 `Mac` ? `cmd+alt+v` : `ctrl+alt+v` 自动转换成unocss，并且会根据你的位置自动处理成行内的unocss格式还是class形式的

## 参数配置
- 您可以使用配置来控制一些匹配规则，例如严格拆分，或者生成的计算结果是`-[10px]`或`-10px`

``` json
  "unot.classMode": {
    "type": "boolean",
    "default": true,
    "description": "Enable/disable class mode"
  },
  "unot.variantGroup": {
    "type": "boolean",
    "default": true,
    "description": "Enable/disable transform hover:(x1 x2) to hover:x1 hover:x2"
  },
  "unot.strictVariable": {
    "type": "boolean",
    "default": true,
    "description": "if true w10px or w-10px will transform w-[10px]"
  },
  "unot.strictHyphen": {
    "type": "boolean",
    "default": false,
    "description": "if true bg#fff or bgrgba(0,0,0,.0) will transform bg-[#fff] or bg-[rgba(0,0,0,.0)]"
  },
  "unot.switchMagic": {
    "type": "boolean",
    "default": true,
    "description": "switch magic"
  },
  "unot.presets": {
    "type": "array",
    "default": [],
    "description": "unocss transform presets"
  },
  "unot.dark": {
    "type": "object",
    "default": {},
    "description": "unocss dark theme style"
  },
  "unot.light": {
    "type": "object",
    "default": {},
    "description": "unocss light theme style"
  }
```

## :coffee:

[请我喝一杯咖啡](https://github.com/Simon-He95/sponsor)

## License

[MIT](./license)
