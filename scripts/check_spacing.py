#!/usr/bin/env python3
"""检查并可选修复中文与拉丁字母、数字之间多余的空格。

跳过 YAML frontmatter、围栏代码块、行内代码、URL、邮箱、Markdown 链接目标及 HTML 注释。
正文里如果确实要故意展示错误写法，用标记跳过：

    <!-- human-format:off -->
    ...
    <!-- human-format:on -->

检查模式下命中时退出码为 1，方便挂进 pre-commit 或 CI。
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Optional, Pattern, Tuple

HAN = "\u3400-\u4dbf\u4e00-\u9fff"
GAP_AFTER_HAN = re.compile(r"[%s]([ \t]+)(?=[A-Za-z0-9])" % HAN)
GAP_BEFORE_HAN = re.compile(r"(?<=[A-Za-z0-9])([ \t]+)(?=[%s])" % HAN)

FENCE_OPEN_RE = re.compile(r"^[ \t]*(`{3,}|~{3,})")
OFF_MARK_RE = re.compile(r"<!--\s*human-format:off\s*-->")
ON_MARK_RE = re.compile(r"<!--\s*human-format:on\s*-->")
LINE_MARK_RE = re.compile(r"<!--\s*human-format:ignore\s*-->")

DISPLAY_MATH_RE = re.compile(r"\$\$[^$\n]*\$\$")
MD_LINK_TARGET_RE = re.compile(r"(?<=\])\([^)\s]+\)")
AUTOLINK_RE = re.compile(r"<(?:https?://|mailto:)[^>\s]+>")
BARE_URL_RE = re.compile(r"https?://[^\s<>()\[\]\"']+")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
HTML_COMMENT_INLINE_RE = re.compile(r"<!--.*?-->")
HTML_TAG_RE = re.compile(r"</?[A-Za-z][A-Za-z0-9-]*(?:\s+[^>]*)?>")


def _mask_inline_code(chars: List[str], line: str) -> None:
    """将单/多反引号包裹的行内代码替换成等长空格，保持列号不变。"""
    n = len(line)
    i = 0
    while i < n:
        if line[i] != "`":
            i += 1
            continue
        tick_start = i
        while i < n and line[i] == "`":
            i += 1
        tick_len = i - tick_start
        close_idx = -1
        j = i
        while j < n:
            if line[j] == "`":
                c_start = j
                while j < n and line[j] == "`":
                    j += 1
                if j - c_start == tick_len:
                    close_idx = j
                    break
            else:
                j += 1
        if close_idx != -1:
            for k in range(tick_start, close_idx):
                chars[k] = " "
            i = close_idx


def _mask_regex(chars: List[str], line: str, pattern: Pattern[str]) -> None:
    for m in pattern.finditer(line):
        for k in range(m.start(), m.end()):
            chars[k] = " "


def mask_protected(line: str) -> str:
    """遮蔽不应修改的片段，返回等长字符串以便精确定位列号。"""
    chars = list(line)
    _mask_inline_code(chars, line)
    for pattern in (
        HTML_COMMENT_INLINE_RE,
        DISPLAY_MATH_RE,
        MD_LINK_TARGET_RE,
        AUTOLINK_RE,
        BARE_URL_RE,
        EMAIL_RE,
        HTML_TAG_RE,
    ):
        _mask_regex(chars, "".join(chars), pattern)
    return "".join(chars)


def _find_line_gaps(line: str) -> List[Tuple[int, int, str]]:
    scanned = mask_protected(line)
    raw = []  # type: List[Tuple[int, int, str]]
    for pattern, where in ((GAP_AFTER_HAN, "汉字后"), (GAP_BEFORE_HAN, "汉字前")):
        for match in pattern.finditer(scanned):
            raw.append((match.start(1), match.end(1), where))
    raw.sort(key=lambda item: item[0])
    return raw


def process_text(text: str) -> Tuple[List[Tuple[int, int, str, str]], str]:
    """扫描并返回 (命中列表, 修复后文本)。"""
    hits = []  # type: List[Tuple[int, int, str, str]]
    out_lines = []  # type: List[str]

    in_frontmatter = False
    fence_char = None  # type: Optional[str]
    fence_len = 0
    in_html_comment = False
    skip = False

    lines = text.splitlines(True)
    for lineno, raw_line in enumerate(lines, 1):
        line_body = raw_line.rstrip("\r\n")
        line_ending = raw_line[len(line_body):]
        stripped = line_body.strip()

        if lineno == 1 and stripped == "---":
            in_frontmatter = True
            out_lines.append(raw_line)
            continue
        if in_frontmatter:
            if stripped in ("---", "..."):
                in_frontmatter = False
            out_lines.append(raw_line)
            continue

        if fence_char is not None:
            close_re = re.compile(r"^[ \t]*%s{%d,}[ \t]*$" % (re.escape(fence_char), fence_len))
            if close_re.match(line_body):
                fence_char = None
                fence_len = 0
            out_lines.append(raw_line)
            continue

        open_match = FENCE_OPEN_RE.match(line_body)
        if open_match:
            marker = open_match.group(1)
            fence_char = marker[0]
            fence_len = len(marker)
            out_lines.append(raw_line)
            continue

        if OFF_MARK_RE.search(line_body):
            skip = True
            out_lines.append(raw_line)
            continue
        if ON_MARK_RE.search(line_body):
            skip = False
            out_lines.append(raw_line)
            continue

        if in_html_comment:
            if "-->" in line_body:
                in_html_comment = False
            out_lines.append(raw_line)
            continue

        if "<!--" in line_body and "-->" not in line_body[line_body.index("<!--") + 4:]:
            in_html_comment = True
            out_lines.append(raw_line)
            continue

        if skip or LINE_MARK_RE.search(line_body):
            out_lines.append(raw_line)
            continue

        gaps = _find_line_gaps(line_body)
        if not gaps:
            out_lines.append(raw_line)
            continue

        for start, _, where in gaps:
            hits.append((lineno, start + 1, where, stripped))

        rebuilt = []  # type: List[str]
        cursor = 0
        for start, end, _ in gaps:
            rebuilt.append(line_body[cursor:start])
            cursor = end
        rebuilt.append(line_body[cursor:])
        out_lines.append("".join(rebuilt) + line_ending)

    return hits, "".join(out_lines)


def check(text: str) -> List[Tuple[int, int, str, str]]:
    hits, _ = process_text(text)
    return hits


def fix(text: str) -> Tuple[str, int]:
    hits, fixed = process_text(text)
    return fixed, len(hits)


def main() -> int:
    parser = argparse.ArgumentParser(description="检查或修复中文与英文、数字之间的多余空格")
    parser.add_argument("paths", nargs="+", help="文件路径，用 - 表示标准输入")
    parser.add_argument("--fix", action="store_true", help="自动移除多余空格（文件原地修改，stdin 输出到 stdout）")
    parser.add_argument("--quiet", action="store_true", help="只输出命中总数（或静默修复）")
    args = parser.parse_args()

    total = 0
    for raw in args.paths:
        if raw == "-":
            name, text = "<stdin>", sys.stdin.read()
            is_stdin = True
        else:
            path = Path(raw)
            if not path.is_file():
                print("跳过：%s" % raw, file=sys.stderr)
                continue
            name, text = raw, path.read_text(encoding="utf-8")
            is_stdin = False

        hits, fixed = process_text(text)
        total += len(hits)

        if args.fix:
            if is_stdin:
                sys.stdout.write(fixed)
            elif fixed != text:
                Path(raw).write_text(fixed, encoding="utf-8")
            if not args.quiet and hits:
                print("%s: 已修复 %d 处" % (name, len(hits)), file=sys.stderr)
            continue

        if args.quiet:
            continue
        for lineno, column, where, snippet in hits:
            print("%s:%d:%d  %s多出空格  %s" % (name, lineno, column, where, snippet))
        if hits:
            print("%s: %d 处" % (name, len(hits)), file=sys.stderr)

    if args.quiet and not args.fix:
        print(total)
    if args.fix:
        return 0
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
