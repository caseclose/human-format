import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_spacing  # noqa: E402


class TestCheckSpacing(unittest.TestCase):
    def test_detects_and_fixes_basic_spacing(self) -> None:
        src = "本周完成 Qwen3-4B 优化，P99 从 420ms 降到 180ms。\n"
        hits = check_spacing.check(src)
        self.assertEqual(len(hits), 6)
        fixed, count = check_spacing.fix(src)
        self.assertEqual(count, 6)
        self.assertEqual(fixed, "本周完成Qwen3-4B优化，P99从420ms降到180ms。\n")

    def test_preserves_english_internal_spaces(self) -> None:
        src = "DFlash是Z Lab提出的块扩散drafter，相比Spec V2更快。\n"
        self.assertEqual(check_spacing.check(src), [])

    def test_skips_frontmatter_and_fences(self) -> None:
        src = (
            "---\n"
            "title: 测试 Qwen3 报告\n"
            "---\n"
            "````markdown\n"
            "```python\n"
            "# 中文 123 注释\n"
            "```\n"
            "````\n"
            "正文 123 测试\n"
        )
        hits = check_spacing.check(src)
        self.assertEqual(len(hits), 2)
        fixed, _ = check_spacing.fix(src)
        self.assertTrue(fixed.endswith("正文123测试\n"))
        self.assertIn("title: 测试 Qwen3 报告", fixed)
        self.assertIn("# 中文 123 注释", fixed)

    def test_skips_multi_backtick_inline_code_and_urls(self) -> None:
        src = (
            "命令 ``docker `run` 123`` 保持原样。\n"
            "详见 https://example.com/a1 和 [第 1 版](https://example.com/v 1)。\n"
        )
        hits = check_spacing.check(src)
        self.assertEqual(len(hits), 2)
        fixed, _ = check_spacing.fix(src)
        self.assertEqual(
            fixed,
            "命令 ``docker `run` 123`` 保持原样。\n"
            "详见 https://example.com/a1 和 [第1版](https://example.com/v 1)。\n",
        )

    def test_directives_require_html_comment(self) -> None:
        src = (
            "说明里提到 human-format:off 不应该关闭检查 1 次。\n"
            "<!-- human-format:off -->\n"
            "故意错误 1 次\n"
            "<!-- human-format:on -->\n"
            "恢复检查 2 次\n"
        )
        hits = check_spacing.check(src)
        self.assertEqual(len(hits), 6)
        self.assertEqual([h[0] for h in hits], [1, 1, 1, 1, 5, 5])

    def test_cli_fix_stdin(self) -> None:
        proc = subprocess.run(
            [sys.executable, "-B", str(ROOT / "scripts" / "check_spacing.py"), "--fix", "--quiet", "-"],
            input="本周修复 3 个问题。\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )
        self.assertEqual(proc.returncode, 0)
        self.assertEqual(proc.stdout, "本周修复3个问题。\n")

    def test_repo_docs_pass_check(self) -> None:
        proc = subprocess.run(
            [
                sys.executable,
                "-B",
                str(ROOT / "scripts" / "check_spacing.py"),
                str(ROOT / "SKILL.md"),
                str(ROOT / "examples.md"),
                str(ROOT / "README.md"),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stdout + proc.stderr)


if __name__ == "__main__":
    unittest.main()
