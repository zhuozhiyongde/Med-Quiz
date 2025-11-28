# Med-Quiz

面向北大医学部课程的刷题网站，使用 React + TypeScript + Vite + Tailwind CSS 构建。

## ✨ 功能概览

-   课程索引页面会从 `src/data/index.json` 动态加载题库信息，并以卡片形式展示课程标题、原始题库下载按钮和作者博客入口，支持深色/浅色主题切换（`ThemeContext` 会记住 localStorage 中的选择）。
-   `CoursePage` 根据课程配置支持「单一题库」与「章节题库」两种形态：章节模式会先展示章节索引、题量统计以及「全部题目」入口，并为每个章节提供 `.txt` 下载。
-   `Quiz` 组件提供顺序/随机两种练习模式、题型统计、键盘快捷键（1-5 / ASDFG / ← → / Space）、选项自动重排、解析中字母映射到当前编号等交互细节，并在答题后展示正确答案与解析。
-   练习过程自动保存到 localStorage，可随时放弃、提前交卷保存进度、下次继续；结果页会统计对错、正确率，并能自动生成「错题训练」集合。
-   每道题支持复制题干/选项/正确答案/错答到剪贴板；结果页还内置错题回顾，可快速二次练习或分享。

## 🧰 数据与脚本

-   所有题目数据保存在 `src/data`，静态资源（原始 txt 题库）位于 `public/data`，界面通过动态 `import()` 加载。
-   `scripts/parse_quiz.py` 会根据 `scripts/config.json` 中的课程列表解析文本题库：支持自动拆章节、生成 `index.json`、输出 `all.json`/章节 JSON，并为下载按钮同步生成 txt 文件。
-   运行脚本前将题库 txt 置于 `public/data`，随后执行 `python scripts/parse_quiz.py` 即可批量更新题库与索引。

## 🏃 使用方式

```bash
bun install
bun dev          # 本地开发
bun run build    # 生成静态站点
bun run preview  # 预览构建产物
```

## 📄 LICENSE

本项目以 [GNU General Public License v3.0](./LICENSE) 授权，您可以在同样的许可条款下自由使用、修改与分发。
