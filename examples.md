# 改前改后对照

仅去掉汉字与英文、数字之间的空格，保留汇报原本的标题、列表、数字与语气。

## 周报进度

改前：

<!-- human-format:off -->
```text
### 本周完成
- 完成 Qwen3-4B 推理服务压测，QPS 提升至 120，P99 延迟从 420ms 降至 180ms。
- 修复 3 个高优内存泄漏问题，服务可用性保持在 99.95%。
```
<!-- human-format:on -->

改后：

> ### 本周完成
> - 完成Qwen3-4B推理服务压测，QPS提升至120，P99延迟从420ms降至180ms。
> - 修复3个高优内存泄漏问题，服务可用性保持在99.95%。

## 技术调研汇报

改前：

<!-- human-format:off -->
```text
DFlash 是 Z Lab 提出的块扩散 drafter，在 Qwen3-4B 上实现了 3.3 倍端到端加速。相比 Spec V2，主要收益来自并行草稿生成。
```
<!-- human-format:on -->

改后：

> DFlash是Z Lab提出的块扩散drafter，在Qwen3-4B上实现了3.3倍端到端加速。相比Spec V2，主要收益来自并行草稿生成。

注意：`Z Lab`、`Spec V2`内部的英文空格按原样保留。

## 不该动的地方

行内代码、代码块、命令行、路径和URL保持原样，不删空格也不粘连汉字：

- 命令行与路径：`` `docker run -it --rm my/image:tag` ``、`/var/log/nginx/error.log`
- 裸链接：在周报中附带 `https://example.com/report/2026-w47` 时，保留链接前后边界，避免把中文粘到URL末尾导致链接失效。
