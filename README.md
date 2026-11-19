# human-format

去掉中文与英文、数字之间多余空格的Agent Skill，面向周报、项目进度同步和向上汇报场景。

## 为什么只做这一件事

大模型写中文时，习惯在汉字和英文、数字之间插空格，例如`Qwen3-4B 上做到 3.3 倍`，很多人日常写周报并不会这样敲，一眼就能看出AI生成的痕迹。同时，周报和汇报需要保留清晰的标题分组和列表结构，不能为了“像人写”把结构全揉成散文。

因此这个技能只负责一件事：把汉字与英文、数字之间的空格去掉，标题、列表、数字、语气和原稿结构都不动。

## 规则速览

核心一条：汉字跟拉丁字母、阿拉伯数字紧挨着写。

- 对：本周完成Qwen3-4B推理优化，P99延迟从420ms降到180ms，吞吐提升3.3倍。
<!-- human-format:off -->
- 错：本周完成 Qwen3-4B 推理优化，P99 延迟从 420ms 降到 180ms，吞吐提升 3.3 倍。
<!-- human-format:on -->

数字与量词、单位连写（3个、5层、128GB、3.3倍）；英文单词之间的空格保持原样（Spec V2、Z Lab、DeepSeek Harness）。

例外同样保留原样：代码块、行内代码、命令行、路径、URL、邮箱、逐字引用、表格里的英文单元格。

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
