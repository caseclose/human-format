(() => {
  const HAN_CLASS = "\\u3400-\\u4dbf\\u4e00-\\u9fff";
  const GAP_AFTER_HAN = new RegExp(`[${HAN_CLASS}]([ \\t]+)(?=[A-Za-z0-9])`, "g");
  const GAP_BEFORE_HAN = new RegExp(`([A-Za-z0-9])([ \\t]+)(?=[${HAN_CLASS}])`, "g");
  const FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})/;
  const OFF_MARK_RE = /<!--\s*human-format:off\s*-->/;
  const ON_MARK_RE = /<!--\s*human-format:on\s*-->/;
  const LINE_MARK_RE = /<!--\s*human-format:ignore\s*-->/;

  const PROTECTED_PATTERNS = [
    /<!--.*?-->/g,
    /\$\$[^$\n]*\$\$/g,
    /\]\([^)\s]+\)/g,
    /<(?:https?:\/\/|mailto:)[^>\s]+>/g,
    /https?:\/\/[^\s<>()\[\]"']+/g,
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^>]*)?>/g
  ];

  const FILLER_WORDS = [
    "显著提升", "大幅提升", "大幅降低", "有效缓解", "稳步推进",
    "有序推进", "全面覆盖", "合理配置", "充分验证", "奠定坚实基础",
    "值得注意的是", "与此同时", "基于上述考虑", "综上所述", "整体来看",
    "不难发现", "潜在瓶颈", "做好预案"
  ];
  const EMOJI_RE = /[✅🚀📌💡🔥✨🎯📊⚡]/gu;
  const BOLD_PREFIX_RE = /^([ \t]*[-*][ \t]+)\*\*([^*\n]{1,24})\*\*[：:][ \t]*/;

  const PRESETS = {
    weekly: `本周整体工作围绕既定目标有序推进，主要成果如下：

### 本周完成
- **推理性能优化**：✅ 通过合理的参数调优与充分的压测验证，在 Qwen3-4B 上显著提升了服务吞吐，QPS 提升至 120，P99 延迟从 420ms 大幅降至 180ms，为后续业务上线奠定了坚实基础。
- **内存问题修复**：排查并修复了 3 个高优内存泄漏问题，有效保障了服务稳定性，可用性稳步保持在 99.95%。

### 风险与关注点
- **算力资源风险**：值得注意的是，当前 GPU 资源可能存在潜在瓶颈，建议提前做好预案。`,

    tech: `### Agent 训推评测与 SFT 训练
- 在 \`cervol/develop-sft-rl\`（commit \`86e346c\`）新增 \`wandb_metrics.py\` 修复多段奖励重复累加 Bug（24 项 CPU 单测通过）。在 \`RL-Parity\` 下评测发现 Knowledge 为 85.53% vs 88.35%，产后 \`image_inspect\` 从 82 跌至 1 题。
- 在 \`cervol/sft-concise-all-seats\` 排查了 \`tool_aux\` 缺失与辅助消息误入 loss 的问题，回放补采 1,113 条非 verifier 子槽位样本（12 项单测通过），在 4×8 H20 解决 \`attention_backend=auto\` 的 \`NaN\` 后训至 step 40/1908，lm_loss 从 1.542 降至 1.059。`,

    protected: `---
title: 测试 Qwen3 报告
---

正文中的 Qwen3-4B 优化和 3 个修复需要去掉空格，但下面的区域必须保持原样：

- 行内代码：\`\`docker \`run\` 123\`\` 与 \`pytest -k Qwen3\`
- 链接与路径：详见 https://example.com/v1 和 [第 1 版](https://example.com/v 1)，日志在 /var/log/qwen3/run 1.log
- 英文词间空格：DFlash是Z Lab提出的块扩散drafter，相比Spec V2更快。

\`\`\`python
# 代码块中的 中文 123 注释不会被改动
print("Qwen3 4B 测试")
\`\`\`

<!-- human-format:off -->
故意保留错误写法 1 次（human-format:off 块内不修复）
<!-- human-format:on -->`
  };

  const EXAMPLES = {
    "ex-tech": {
      titleBad: "改前（过程细节过碎、内部黑话多、缺方向切换依据与看板链接）",
      bad: `### Agent 训推评测与 SFT 训练
- 在 \`cervol/develop-sft-rl\`（commit \`86e346c\`）新增 \`wandb_metrics.py\` 修复多段奖励重复累加 Bug（24 项 CPU 单测通过）。在 \`RL-Parity\` 下评测 \`RL-120\` 发现 Knowledge 85.53% vs 88.35%，产后 \`image_inspect\` 从 82 跌至 1 题。
- 在 \`cervol/sft-concise-all-seats\` 排查了 \`tool_aux\` 缺失与 \`本轮信息计划\` 误入 loss 的问题，回放补采 1,113 条非 verifier 子槽位样本（12 项单测通过），在 4×8 H20 解决 \`attention_backend=auto\` 的 \`NaN\` 后训至 step 40/1908，lm_loss 从 1.542 降至 1.059。`,
      titleGood: "改后（突出目标转向依据、术语降维、裁剪过程细节并挂看板链接）",
      good: `### Service Agent目标转向：从主攻美学/知识切换至推理速度优先

> 可视化看板：[600题训推一致对比看板](http://example.internal:18833/dashboard/results.html)

- 完成\`AgentRL Step120\`在600题上的训推一致（\`RL-Parity\`）对比并修复多段轨迹奖励重复累加Bug。评测显示，此前以美学/知识为主目标的RL模型知识分落后基线2.82pp（85.53% vs 88.35%）、出图后自主检视退化（82→1题），且中位输出Token反超10%~15%（909 vs 826）；而精简数据版SFT输出最短且一致性最高（93.52%）。基于此，本周将后续优化重心切换为在保质量前提下压低Token与轮数、优先提升推理速度。
- 补齐1,113条非校验类工具子调用样本，构建覆盖外层主控与7类工具内部子调用的精简数据集（30,538条训练/7,822条验证），将工具轮冗余文本降至0.0%；屏蔽辅助拼接消息loss并解决H20硬件上FlashAttention后端切换导致的梯度溢出（\`NaN\`）后，已在32卡H20稳定开训（单步31.8s，MFU 45.6%~47.1%）。`,
      note: "修改要点：删掉branch/commit/单测条数/第40步loss等过程流水账；把“产后”“tool_aux”“non-verifier子槽位”译成通用表达；先用实测数据说明为何转向提速，再挂已探活的可视化看板。"
    },
    "ex-weekly": {
      titleBad: "改前（中英空格 + **小标题**：套娃 + 空洞程度副词 + 公文尾巴）",
      bad: `本周整体工作围绕既定目标有序推进，主要成果如下：

### 本周完成
- **推理性能优化**：🚀 通过合理的参数调优与充分的压测验证，在 Qwen3-4B 上显著提升了服务吞吐，QPS 提升至 120，P99 延迟从 420ms 大幅降至 180ms，为后续业务上线奠定了坚实基础。
- **内存问题修复**：排查并修复了 3 个高优内存泄漏问题，有效保障了服务稳定性，可用性稳步保持在 99.95%。`,
      titleGood: "改后（保留结构与真实数据，清掉空格、套娃与空话）",
      good: `### 本周完成
- 完成Qwen3-4B推理服务参数调整与压测，QPS达到120，P99延迟从420ms降到180ms。
- 修复3个内存泄漏问题，服务可用性保持在99.95%。`,
      note: "修改要点：保留全部数字与原有标题层级，清掉6处汉字与英文数字间的多余空格、2处加粗前缀套娃、1个emoji以及5处无实质信息的套话。"
    },
    "ex-risk": {
      titleBad: "改前（AI常见圆滑套话，看不出卡在哪里、要谁做什么）",
      bad: `### 风险与关注点
- **算力资源风险**：值得注意的是，随着并发请求增加，当前 GPU 资源可能存在潜在瓶颈，建议提前做好资源预案。
- **联调进度对齐**：与此同时，下游接口联调仍需进一步跟进，以确保项目按期交付。`,
      titleGood: "改后（写清具体缺口、影响范围与协调诉求）",
      good: `### 风险与需协调
- 下周起4卡并发压测还缺2张A100，如果周五前资源池批不下来，全量回归会顺延2天。
- 下游鉴权接口的报错码格式还没定，今天需要跟对应研发对齐确认，不然客户端联调没法收口。`,
      note: "修改要点：去掉“值得注意的是”“潜在瓶颈”“做好预案”等模棱两可的表达，直接写出具体缺口资源、时间节点和阻塞影响（仅在源头撰写时补全真实事实，润色他人草稿时不编造数据）。"
    }
  };

  function maskInlineCode(chars, line) {
    const n = line.length;
    let i = 0;
    while (i < n) {
      if (line[i] !== "`") {
        i += 1;
        continue;
      }
      const tickStart = i;
      while (i < n && line[i] === "`") i += 1;
      const tickLen = i - tickStart;
      let closeIdx = -1;
      let j = i;
      while (j < n) {
        if (line[j] === "`") {
          const cStart = j;
          while (j < n && line[j] === "`") j += 1;
          if (j - cStart === tickLen) {
            closeIdx = j;
            break;
          }
        } else {
          j += 1;
        }
      }
      if (closeIdx !== -1) {
        for (let k = tickStart; k < closeIdx; k += 1) chars[k] = " ";
        i = closeIdx;
      }
    }
  }

  function maskProtected(line) {
    const chars = line.split("");
    maskInlineCode(chars, line);
    for (const pattern of PROTECTED_PATTERNS) {
      const text = chars.join("");
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const startOffset = m[0].startsWith("](") ? m.index + 1 : m.index;
        for (let k = startOffset; k < m.index + m[0].length; k += 1) {
          chars[k] = " ";
        }
        if (m.index === pattern.lastIndex) pattern.lastIndex += 1;
      }
    }
    return chars.join("");
  }

  function findLineGaps(line) {
    const scanned = maskProtected(line);
    const raw = [];
    let m;
    GAP_AFTER_HAN.lastIndex = 0;
    while ((m = GAP_AFTER_HAN.exec(scanned)) !== null) {
      raw.push({ start: m.index + 1, end: m.index + 1 + m[1].length, where: "汉字后" });
    }
    GAP_BEFORE_HAN.lastIndex = 0;
    while ((m = GAP_BEFORE_HAN.exec(scanned)) !== null) {
      raw.push({ start: m.index + 1, end: m.index + 1 + m[2].length, where: "汉字前" });
    }
    raw.sort((a, b) => a.start - b.start);
    const dedup = [];
    for (const item of raw) {
      const prev = dedup[dedup.length - 1];
      if (!prev || item.start >= prev.end) dedup.push(item);
    }
    return dedup;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function analyzeText(text, cleanTemplates) {
    const rawLines = text.match(/[^\r\n]*(?:\r?\n|$)/g) || [];
    if (rawLines.length && rawLines[rawLines.length - 1] === "") rawLines.pop();

    const hits = [];
    const fillerHits = [];
    const prefixHits = [];
    const emojiHits = [];
    const outLines = [];
    const annotatedLines = [];

    let inFrontmatter = false;
    let fenceChar = null;
    let fenceLen = 0;
    let inHtmlComment = false;
    let skip = false;

    rawLines.forEach((rawLine, idx) => {
      const lineno = idx + 1;
      const lineBody = rawLine.replace(/\r?\n$/, "");
      const lineEnding = rawLine.slice(lineBody.length);
      const stripped = lineBody.trim();

      let isProtected = false;
      if (lineno === 1 && stripped === "---") {
        inFrontmatter = true;
        isProtected = true;
      } else if (inFrontmatter) {
        if (stripped === "---" || stripped === "...") inFrontmatter = false;
        isProtected = true;
      } else if (fenceChar !== null) {
        const closeRe = new RegExp(`^[ \\t]*${escapeRegex(fenceChar)}{${fenceLen},}[ \\t]*$`);
        if (closeRe.test(lineBody)) {
          fenceChar = null;
          fenceLen = 0;
        }
        isProtected = true;
      } else {
        const openMatch = lineBody.match(FENCE_OPEN_RE);
        if (openMatch) {
          fenceChar = openMatch[1][0];
          fenceLen = openMatch[1].length;
          isProtected = true;
        } else if (OFF_MARK_RE.test(lineBody)) {
          skip = true;
          isProtected = true;
        } else if (ON_MARK_RE.test(lineBody)) {
          skip = false;
          isProtected = true;
        } else if (inHtmlComment) {
          if (lineBody.includes("-->")) inHtmlComment = false;
          isProtected = true;
        } else if (lineBody.includes("<!--") && !lineBody.slice(lineBody.indexOf("<!--") + 4).includes("-->")) {
          inHtmlComment = true;
          isProtected = true;
        } else if (skip || LINE_MARK_RE.test(lineBody)) {
          isProtected = true;
        }
      }

      if (isProtected) {
        outLines.push(rawLine);
        annotatedLines.push({ text: lineBody, protected: true, gaps: [], fillers: [], prefix: null });
        return;
      }

      const gaps = findLineGaps(lineBody);
      gaps.forEach((g) => hits.push({ lineno, col: g.start + 1, where: g.where, snippet: stripped }));

      const prefixMatch = lineBody.match(BOLD_PREFIX_RE);
      if (prefixMatch) prefixHits.push({ lineno, label: prefixMatch[2] });

      const lineFillers = [];
      for (const word of FILLER_WORDS) {
        let pos = lineBody.indexOf(word);
        while (pos !== -1) {
          lineFillers.push({ start: pos, end: pos + word.length, word });
          fillerHits.push({ lineno, word });
          pos = lineBody.indexOf(word, pos + word.length);
        }
      }

      const emMatches = lineBody.match(EMOJI_RE);
      if (emMatches) {
        emMatches.forEach((e) => emojiHits.push({ lineno, emoji: e }));
      }

      let rebuilt = "";
      let cursor = 0;
      for (const g of gaps) {
        rebuilt += lineBody.slice(cursor, g.start);
        cursor = g.end;
      }
      rebuilt += lineBody.slice(cursor);

      if (cleanTemplates) {
        rebuilt = rebuilt.replace(BOLD_PREFIX_RE, "$1");
        rebuilt = rebuilt.replace(EMOJI_RE, "");
        rebuilt = rebuilt.replace(/^([ \t]*[-*])[ \t]{2,}/, "$1 ");
      }

      outLines.push(rebuilt + lineEnding);
      annotatedLines.push({
        text: lineBody,
        protected: false,
        gaps,
        fillers: lineFillers,
        prefix: prefixMatch ? { start: prefixMatch[1].length, end: prefixMatch[0].length } : null
      });
    });

    return {
      hits,
      fillerHits,
      prefixHits,
      emojiHits,
      fixedText: outLines.join(""),
      annotatedLines
    };
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAnnotatedHtml(annotatedLines) {
    return annotatedLines
      .map((line) => {
        if (line.protected) {
          return `<span class="hl-protected">${escapeHtml(line.text)}</span>`;
        }
        const marks = [];
        line.gaps.forEach((g) => marks.push({ start: g.start, end: g.end, cls: "hl-gap", title: `${g.where}多余空格` }));
        if (line.prefix) {
          marks.push({ start: line.prefix.start, end: line.prefix.end, cls: "hl-prefix", title: "AI加粗前缀套娃" });
        }
        line.fillers.forEach((f) => marks.push({ start: f.start, end: f.end, cls: "hl-filler", title: "无数据支撑的空话/套话" }));

        if (!marks.length) return escapeHtml(line.text);

        marks.sort((a, b) => a.start - b.start || a.end - b.end);
        let html = "";
        let cursor = 0;
        for (const m of marks) {
          if (m.start < cursor) continue;
          html += escapeHtml(line.text.slice(cursor, m.start));
          const seg = line.text.slice(m.start, m.end);
          const display = m.cls === "hl-gap" ? seg.replace(/ /g, "·").replace(/\t/g, "→") : escapeHtml(seg);
          html += `<span class="${m.cls}" title="${m.title}">${display}</span>`;
          cursor = m.end;
        }
        html += escapeHtml(line.text.slice(cursor));
        return html;
      })
      .join("\n");
  }

  const sourceInput = document.getElementById("source-input");
  const fixedOutput = document.getElementById("fixed-output");
  const highlightView = document.getElementById("highlight-view");
  const inputStats = document.getElementById("input-stats");
  const diagBadges = document.getElementById("diag-badges");
  const diagSummary = document.getElementById("diag-summary");
  const diagList = document.getElementById("diag-list");
  const btnFixSpacing = document.getElementById("btn-fix-spacing");
  const btnFixAll = document.getElementById("btn-fix-all");
  const btnClear = document.getElementById("btn-clear");
  const btnCopyOutput = document.getElementById("btn-copy-output");
  const copyInstallBtn = document.getElementById("copy-install");
  const installFeedback = document.getElementById("install-feedback");
  const exampleStage = document.getElementById("example-stage");

  let cleanTemplatesMode = false;

  function refresh() {
    const text = sourceInput.value;
    inputStats.textContent = `${text.length}字符 · ${text ? text.split(/\r?\n/).length : 0}行`;

    const res = analyzeText(text, cleanTemplatesMode);
    highlightView.innerHTML = renderAnnotatedHtml(res.annotatedLines) || '<span class="hl-protected">输入内容后将在此高亮展示问题位置…</span>';
    fixedOutput.value = res.fixedText;

    const badges = [];
    if (res.hits.length) {
      badges.push(`<span class="badge badge-red">空格 ${res.hits.length}处</span>`);
    } else {
      badges.push('<span class="badge badge-ok">空格 0处</span>');
    }
    if (res.prefixHits.length) badges.push(`<span class="badge badge-amber">套娃前缀 ${res.prefixHits.length}处</span>`);
    if (res.fillerHits.length) badges.push(`<span class="badge badge-amber">空话/套话 ${res.fillerHits.length}处</span>`);
    if (res.emojiHits.length) badges.push(`<span class="badge badge-amber">Emoji ${res.emojiHits.length}个</span>`);
    diagBadges.innerHTML = badges.join("");

    const totalIssues = res.hits.length + res.prefixHits.length + res.fillerHits.length + res.emojiHits.length;
    diagSummary.textContent = totalIssues
      ? `发现${totalIssues}处可清理项（红底为中英空格，紫底为加粗前缀，黄底为空洞套话）`
      : "未检测到中英多余空格、前缀套娃或常见套话。";

    const cards = [];
    if (res.hits.length) {
      const sample = res.hits.slice(0, 4).map((h) => `<code>L${h.lineno}:${h.col} ${h.where}</code>`).join(" ");
      cards.push(`<div class="diag-item"><strong>中英数字多余空格（${res.hits.length}处）</strong>可由脚本自动清除：${sample}${res.hits.length > 4 ? " …" : ""}</div>`);
    }
    if (res.prefixHits.length) {
      const labels = res.prefixHits.map((p) => `<code>${escapeHtml(p.label)}</code>`).join("、");
      cards.push(`<div class="diag-item"><strong>加粗前缀套娃（${res.prefixHits.length}处）</strong>建议直接写事，不必套${labels}。</div>`);
    }
    if (res.fillerHits.length) {
      const words = Array.from(new Set(res.fillerHits.map((f) => `<code>${escapeHtml(f.word)}</code>`))).join("、");
      cards.push(`<div class="diag-item"><strong>无数字支撑空话/公文套话（${res.fillerHits.length}处）</strong>建议删除或改写为实测数字：${words}</div>`);
    }
    if (res.emojiHits.length) {
      cards.push(`<div class="diag-item"><strong>装饰性Emoji（${res.emojiHits.length}个）</strong>正式工程汇报建议直接清除。</div>`);
    }
    diagList.innerHTML = cards.join("");
  }

  function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    highlightView.classList.toggle("hidden", tabName !== "highlight");
    fixedOutput.classList.toggle("hidden", tabName !== "output");
  }

  function renderExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    exampleStage.innerHTML = `
      <div class="example-box">
        <div class="example-head bad"><span>✕</span><span>${escapeHtml(ex.titleBad)}</span></div>
        <pre class="example-body">${escapeHtml(ex.bad)}</pre>
      </div>
      <div class="example-box">
        <div class="example-head good"><span>✓</span><span>${escapeHtml(ex.titleGood)}</span></div>
        <pre class="example-body">${escapeHtml(ex.good)}</pre>
        <div class="example-note">${escapeHtml(ex.note)}</div>
      </div>
    `;
  }

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-preset]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      cleanTemplatesMode = false;
      sourceInput.value = PRESETS[btn.dataset.preset] || "";
      switchTab("highlight");
      refresh();
    });
  });

  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-example]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderExample(btn.dataset.example);
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  sourceInput.addEventListener("input", refresh);

  btnFixSpacing.addEventListener("click", () => {
    cleanTemplatesMode = false;
    const res = analyzeText(sourceInput.value, false);
    sourceInput.value = res.fixedText;
    refresh();
    switchTab("output");
  });

  btnFixAll.addEventListener("click", () => {
    cleanTemplatesMode = true;
    const res = analyzeText(sourceInput.value, true);
    sourceInput.value = res.fixedText;
    refresh();
    switchTab("output");
  });

  btnClear.addEventListener("click", () => {
    sourceInput.value = "";
    cleanTemplatesMode = false;
    refresh();
  });

  btnCopyOutput.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(fixedOutput.value);
      const old = btnCopyOutput.textContent;
      btnCopyOutput.textContent = "已复制";
      setTimeout(() => { btnCopyOutput.textContent = old; }, 1400);
    } catch {
      fixedOutput.select();
      document.execCommand("copy");
    }
  });

  copyInstallBtn.addEventListener("click", async () => {
    const cmd = copyInstallBtn.dataset.copy;
    try {
      await navigator.clipboard.writeText(cmd);
      installFeedback.textContent = "已复制安装命令";
      setTimeout(() => { installFeedback.textContent = ""; }, 1800);
    } catch {
      installFeedback.textContent = "请直接复制下方命令";
    }
  });

  sourceInput.value = PRESETS.weekly;
  refresh();
  renderExample("ex-tech");
})();
