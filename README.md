# PageOne

极简的 Firefox 新标签页。新标签里只有一个靠上的搜索框：输入后打开 Google 搜索，页面跟随系统的明暗主题。

当前版本：**1.2.0**。需要 Firefox 115 或更高版本。

## 安装

可以直接安装该插件。在 Firefox 中打开附加组件页面，点击「添加到 Firefox」即可：

https://addons.mozilla.org/zh-CN/firefox/addon/pageone/

安装完成后，新建标签页会使用 PageOne。

## 能做什么

- 新标签页只保留一个搜索框，位置靠上
- 提交后打开 Google 搜索
- 输入时显示搜索建议，可用上下方向键选择，回车打开，Esc 关闭
- 自动跟随系统的浅色或深色主题

## 数据

搜索建议会把当前输入的搜索词发送到 Google（`suggestqueries.google.com`），只用于补全候选。扩展本身不保存这些内容。

## 源码

| 文件 | 作用 |
| --- | --- |
| `manifest.json` | 扩展清单 |
| `newtab.html` | 新标签页结构 |
| `newtab.css` | 样式与明暗主题 |
| `newtab.js` | 搜索框与建议列表 |
| `background.js` | 向 Google 请求搜索建议 |
