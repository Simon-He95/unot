<p align="center">
  <img height="200" src="./assets/kv.png" alt="UnoT">
</p>
<p align="center"> English | <a href="./README_zh.md">简体中文</a></p>


UnoT is short for unocss tools that is to provide a better development experience using unocss in vscode. It integrated [tounocss](https://github.com/Simon-He95/tounocss)、 [vscode uno magic](https://github.com/Simon-He95/vscode-uno-magic)

![demo](/assets/demo.gif)

>⚠️ Warning: The highlighting unocss syntax has been removed. This plug-in is made as an extension plug-in for unocss. If you need to highlight unocss, please download the official unocss.


## 💡 Effects
- text-\[red,hover:pink,2xl,lg:hover:3xl\] -> text-red hover:text-pink text-2xl lg:hover:text-3xl
- class or className content like `w-calc(100% - 20px)` -> `w-[calc(100%-20px)]` [🔎detail](https://github.com/Simon-He95/vscode-uno-magic)
- Provides code selection for unocss syntax [🔎detail](https://github.com/Simon-He95/vscode-uno-magic)
- Provide the unocss hover to display the css code [🔎detail](https://github.com/Simon-He95/unocss-to-css)
- bg#fff -> bg-#fff
- maxw-100% -> max-w-[100%]
- bg-[rgba(255, 255, 255, 0.5)] -> bg-[rgba(255,255,255,0.5)]
- translatex--50% -> translate-x-[-50%]
- hover:(text-red bg-blue) -> hover:text-red hover:bg-blue
- !(text-red bg-blue) -> !text-red !bg-blue
- h="[calc(100% - 20px)]" -> h="[calc(100%-20px)]"

## Configuration
- You can use config to control some matching rules, such as strict-splicing, or the generated calculation result is `-[10px]` or `-10px`

``` json
   "unot.variantGroup": {
      "type": "boolean",
      "default": true,
      "description": "Enable/disable transform hover:(x1 x2) to hover:x1 hover:x2"
    },
    "unot.strictVaribale": {
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

[buy me a cup of coffee](https://github.com/Simon-He95/sponsor)

## License

[MIT](./license)
