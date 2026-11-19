#!/usr/bin/env python3
"""扫描中文文本里汉字与拉丁字母、数字之间多余的空格。

跳过围栏代码块和行内代码。正文里如果确实要故意展示错误写法，用标记跳过：

    <!-- human-format:off -->
    ...
    <!-- human-format:on -->

命中时退出码为 1，方便挂进 pre-commit 或 CI。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HAN = "\u4e00-\u9fff"
GAP_AFTER_HAN = re.compile(rf"[{HAN}]([ \t]+)(?=[A-Za-z0-9])")
GAP_BEFORE_HAN = re.compile(rf"(?<=[A-Za-z0-9])([ \t]+)(?=[{HAN}])")
INLINE_CODE = re.compile(r"`[^`\n]*`")
FENCE = ("```", "~~~")
OFF_MARK = "human-format:off"
ON_MARK = "human-format:on"
LINE_MARK = "human-format:ignore"


def mask_inline_code(line: str) -> str:
    """行内代码换成等长空白，避免误报，列号保持不变。"""
    return INLINE_CODE.sub(lambda m: " " * len(m.group(0)), line)


def check(text: str):
    hits, in_fence, skip = [], False, False
    for lineno, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith(FENCE):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if OFF_MARK in line:
            skip = True
            continue
        if ON_MARK in line:
            skip = False
            continue
        if skip or LINE_MARK in line:
            continue
        scanned = mask_inline_code(line)
        for pattern, where in ((GAP_AFTER_HAN, "汉字后"), (GAP_BEFORE_HAN, "汉字前")):
            for match in pattern.finditer(scanned):
                hits.append((lineno, match.start() + 1, where, line.strip()))
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description="检查中文与英文、数字之间的多余空格")
    parser.add_argument("paths", nargs="+", help="文件路径，用 - 表示标准输入")
    parser.add_argument("--quiet", action="store_true", help="只输出命中总数")
    args = parser.parse_args()

    total = 0
    for raw in args.paths:
        if raw == "-":
            name, text = "<stdin>", sys.stdin.read()
        else:
            path = Path(raw)
            if not path.is_file():
                print(f"跳过：{raw}", file=sys.stderr)
                continue
            name, text = raw, path.read_text(encoding="utf-8")

        hits = check(text)
        total += len(hits)
        if args.quiet:
            continue
        for lineno, column, where, snippet in hits:
            print(f"{name}:{lineno}:{column}  {where}多出空格  {snippet}")
        if hits:
            print(f"{name}: {len(hits)} 处", file=sys.stderr)

    if args.quiet:
        print(total)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
