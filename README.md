# human-format

面向中文周报、月报和向上汇报的Agent Skill，清掉一眼就能看出的AI生成痕迹，同时保留汇报原本的标题分组和可读性。

## 解决哪些问题

大模型写工作汇报有几个固定毛病：汉字与英文、数字之间自动插空格（`Qwen3-4B 上做到 3.3 倍`）；每条列表都套`**小标题**：说明`；不管事情大小硬凑几条差不多长的；动辄写“显著提升、稳步推进、奠定坚实基础”，遇到风险就写“关注潜在瓶颈、做好预案”。

这个技能把这几类机械痕迹清掉，同时保留工程汇报必需的标题、列表和克制平实的语气，并把内部技术黑话转成通用工程表达、突出阶段进展与目标转向、按需核验并挂载在线可视化看板链接。

## 规则速览

1. 汉字与拉丁字母、阿拉伯数字紧挨着写，不加空格（`Qwen3-4B`、`P99从420ms降到180ms`、`3个`、`128GB`）；英文单词之间空格保留（`Spec V2`、`Z Lab`、`DeepSeek Harness`）。
2. 保留汇报标题与列表分组，去掉`**模块名**：说明`前缀套娃、装饰性emoji和无意义双引号，条数和长短按事情重要度走。
3. 列表只写动作与可验证结果，砍掉无数据支撑的程度副词、开头总括句、结尾升华句和论文过渡词，风险项写清具体卡点与诉求。
4. 技术周报中把内部类名、参数flag和生僻简称翻译成通用工程/算法表达，前置核心成果并交代方向调整的评测依据，裁剪分支/commit/早期step号等过程噪音；涉及看板或画廊时先做HTTP探活再挂载Markdown链接。
5. 代码块、行内代码、命令行、路径、URL、邮箱、逐字引用和带空格的官方专有名词保持原样，不篡改原稿事实与数字。

## 安装

放到支持`SKILL.md`的Agent技能目录即可：

```bash
mkdir -p ~/.cursor/skills      # 或 ~/.claude/skills、~/.dsh/skills
cp -r human-format ~/.cursor/skills/
```

装完重启会话，或者直接在对话里点名“用human-format润色这段周报”。

## 检查与自动修复脚本

`scripts/check_spacing.py`会扫描汉字与英文、数字之间的空格，自动跳过YAML frontmatter、围栏代码块、行内代码、Markdown链接目标地址、裸URL和邮箱：

```bash
python3 scripts/check_spacing.py report.md
cat draft.md | python3 scripts/check_spacing.py -
python3 scripts/check_spacing.py --fix report.md
```

检查模式命中时退出码为1；`--fix`模式会原地清理文件中的多余空格（传入`-`时输出修复后的内容到标准输出）。

需要故意展示错误写法时，用`<!-- human-format:off -->`和`<!-- human-format:on -->`包起来；单行跳过可在该行加上`<!-- human-format:ignore -->`。

## 文件

```
human-format/
├── SKILL.md              技能本体
├── examples.md           周报与汇报改前改后对照
├── scripts/
│   └── check_spacing.py  中英数字空格检查与修复脚本
├── tests/
│   └── test_check_spacing.py
├── README.md
└── LICENSE
```

## 许可

MIT，见[LICENSE](LICENSE)。
