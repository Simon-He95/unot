<p align="center">
<img height="200" src="./assets/kv.png" alt="UnoT">
</p>
<p align="center"> <a href="./README.md">English</a> | 简体中文</p>

UnoT 是 unocss tools 的简写，它是为了在vscode中使用unocss提供更加好的开发体验. 它集成了 [tounocss](https://github.com/Simon-He95/tounocss),  [vscode uno magic](https://github.com/Simon-He95/vscode-uno-magic)

![demo](/assets/demo.gif)

>⚠️ Warning: 移除了高亮unocss语法，本插件制作为unocss的扩展插件，如需高亮unocss，请下载官方的unocss


## 💡 影响
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


## 新特性
支持将设计稿中的css直接通过快捷键 `Mac` ? `cmd+alt+v` : `ctrl+alt+v` 自动转换成unocss，并且会根据你的位置自动处理成行内的unocss格式还是class形式的

## 参数配置
- 您可以使用配置来控制一些匹配规则，例如严格拆分，或者生成的计算结果是`-[10px]`或`-10px`

``` json
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
    }
```

## :coffee:

[请我喝一杯咖啡](https://github.com/Simon-He95/sponsor)

## License

[MIT](./license)
