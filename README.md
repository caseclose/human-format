# human-format

写中文时按人的方式排版的一个Agent Skill。

它干三件事：汉字跟英文、数字之间不留空格；清掉AI味的套话和列表堆砌；少用标题和加粗，让句子长短不齐。

DeepSeek Harness、Claude Code、Codex、Cursor这类支持SKILL.md的工具都能用，没有依赖。

## 为什么会有这个

大模型写中文有一套固定习惯，读起来很整齐，也很假：

- 汉字和英文之间自动插一个空格，`Qwen3-4B 上做到 3.3 倍`这种，人打字不会这么打；
- 每段开头一句功能句，"首先""值得注意的是""综上所述"；
- 内容本来是并列关系，一律做成带加粗前缀的列表；
- 句子长度整齐得像排过版，一行一行差不多长。

这些特征叠在一起，读者第一眼就知道是机器写的。这份技能把它们逐条列出来，还配一个能跑的自查脚本。

## 规则速览

核心一条：汉字跟拉丁字母、阿拉伯数字贴着写。

- 对：DFlash是ZLab的块扩散drafter，在Qwen3-4B上做到3.3倍加速。
<!-- human-format:off -->
- 错：DFlash 是 Z Lab 的块扩散 drafter，在 Qwen3-4B 上做到 3.3 倍加速。
<!-- human-format:on -->

数字跟量词、跟单位也连写，3个、5层、128GB、3.3倍，都不插空格。

例外同样重要：代码块、行内代码、命令行、路径、URL、逐字引用、表格里的英文单元格一律保持原样。技能里专门有一节列这些例外，因为一刀切会把能复制的东西弄坏。

标点跟着句子语言走。中文句子用全角，句末不写英文句号，破折号写两个全角横线。

语气和结构那部分才决定"像不像人"：少用标题、别每段都以功能句开头、列表只在真并列且每项都短时用、一段最多一处加粗，还给了一串禁用套话。

## 安装

DSH把技能放在`$DSH_HOME/skills/`下，默认是`~/.dsh/skills/`：

```bash
mkdir -p ~/.dsh/skills
cp -r human-format ~/.dsh/skills/
```

其他工具用自己的技能目录，结构一样，都是`<skill-name>/SKILL.md`：

```bash
mkdir -p ~/.cursor/skills      # 或者 ~/.claude/skills
cp -r human-format ~/.cursor/skills/
```

装完重启会话，它会出现在技能列表里。

## 怎么触发

技能描述里写了触发条件，模型读到自己要写中文、或者用户抱怨"像AI写的"时会自动加载。不想靠自动判断就直接点名，说"用human-format写"；也可以把SKILL.md里的规则抄进项目级指令文件，等于永久生效。

## 自查脚本

`scripts/check_spacing.py`扫一遍中英空格，跳过代码块和行内代码，输出行号、列号和原文：

```bash
python3 scripts/check_spacing.py README.md
cat draft.md | python3 scripts/check_spacing.py -
```

有命中时退出码是1，可以挂进pre-commit或者CI。它只查空格，语气和结构还得人看。

故意展示错误写法的地方，用`<!-- human-format:off -->`和`<!-- human-format:on -->`包起来，检查会跳过；单行跳过就在那行任意位置写`<!-- human-format:ignore -->`。

## 文件

```
human-format/
├── SKILL.md              技能本体
├── examples.md           改前改后对照
├── scripts/
│   └── check_spacing.py  中英空格检查
├── README.md
└── LICENSE
```

## 边界

默认"不加空格"，但中文排版圈有相反主张，盘古之白那一派认为中英之间加空格更易读。技能里留了例外：用户当次要求加、或者目标平台有硬性规范时，以用户和平台为准。

它管排版，不管事实。改别人的稿子只动空格和标点，数字、结论、引用、链接一律不许改。

## 许可

MIT，见[LICENSE](LICENSE)。
