// HTML email renderer for daily digest

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '…' : s;
}

export function buildEmailHtml(topItems, aiResult, cluster = null, indieItems = []) {
  const model = aiResult?.model || 'deepseek-v4-flash';
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

  let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC',sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">

<div style="background:#ff6600;padding:24px 20px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:22px">AI 资讯摘要</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px">${now} · ${topItems.length} 篇${indieItems.length ? ` · 独立游戏 ${indieItems.length} 条` : ''}</p>
</div>

<div style="padding:16px">`;

  if (aiResult?.highlights?.length) {
    html += `
<div style="background:linear-gradient(135deg,#fff7ed,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa">
  <h2 style="margin:0 0 12px;font-size:16px;color:#c2410c">🔥 今日 AI 要闻</h2>
  ${aiResult.highlights.map(h => `
  <div style="margin-bottom:10px;padding-left:12px;border-left:3px solid #f97316">
    <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:2px">${escapeHtml(h.title)}</div>
    <div style="font-size:12px;color:#666">${escapeHtml(h.summary)}</div>
  </div>`).join('')}
</div>`;
  }

  if (aiResult?.careerAdvice) {
    const ca = aiResult.careerAdvice;
    html += `
<div style="background:linear-gradient(135deg,#f0f9ff,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #bae6fd">
  <h2 style="margin:0 0 12px;font-size:16px;color:#0369a1">🎯 求职风向标</h2>
  ${ca.trends?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 业界新趋势</div>
    ${ca.trends.map(t => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(t)}</div>`).join('')}
  </div>` : ''}
  ${ca.demands?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 新需求涌现</div>
    ${ca.demands.map(d => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(d)}</div>`).join('')}
  </div>` : ''}
  ${ca.tips?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 给我的建议</div>
    ${ca.tips.map(t => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(t)}</div>`).join('')}
  </div>` : ''}
  ${ca.focus_study?.length ? `
  <div>
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 专项学习</div>
    ${ca.focus_study.map(t => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(t)}</div>`).join('')}
  </div>` : ''}
</div>`;
  }

  if (cluster?.must_have?.length || cluster?.focus_plan?.length || cluster?.skill_project_map?.length) {
    const mapRows = (cluster.skill_project_map?.length
      ? cluster.skill_project_map
      : cluster.focus_plan || []).slice(0, 8);

    html += `
<div style="background:linear-gradient(135deg,#faf5ff,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #e9d5ff">
  <h2 style="margin:0 0 12px;font-size:16px;color:#7e22ce">📊 JD 共性 · 练手项目（专项学习）</h2>
  <div style="font-size:12px;color:#666;margin-bottom:10px">基于 ${cluster.total_jobs || 0} 个相关岗位 · 技能覆盖率聚类 → 对应可写简历的项目</div>
  ${cluster.must_have?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#7e22ce;margin-bottom:6px">必备共性（≥ 35%）</div>
    ${cluster.must_have.slice(0, 8).map(s => `
    <span style="display:inline-block;background:#f3e8ff;color:#6b21a8;font-size:11px;padding:3px 8px;border-radius:4px;margin:0 4px 4px 0">${escapeHtml(s.skill)} ${s.coverage}%</span>`).join('')}
  </div>` : ''}
  ${mapRows.length ? `
  <div>
    <div style="font-size:12px;font-weight:600;color:#7e22ce;margin-bottom:8px">技能 → 练手项目</div>
    ${mapRows.map(row => `
    <div style="margin-bottom:10px;padding:10px;background:#fff;border-radius:6px;border:1px solid #f3e8ff">
      <div style="margin-bottom:6px">
        <strong style="font-size:13px;color:#333">${escapeHtml(row.skill)}</strong>
        ${row.coverage != null ? `<span style="font-size:11px;color:#7e22ce;margin-left:6px">${row.coverage}%</span>` : ''}
        ${row.level ? `<span style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;background:${row.level === '必备' ? '#fee2e2' : '#ffedd5'};color:${row.level === '必备' ? '#991b1b' : '#9a3412'}">${escapeHtml(row.level)}</span>` : ''}
        ${row.priority ? `<span style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;background:${row.priority === 'P0' ? '#fee2e2' : '#ffedd5'};color:${row.priority === 'P0' ? '#991b1b' : '#9a3412'}">${escapeHtml(row.priority)}</span>` : ''}
      </div>
      ${(row.projects || []).slice(0, 2).map(p => `
      <div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:4px">• ${escapeHtml(p)}</div>`).join('')}
    </div>`).join('')}
  </div>` : ''}
</div>`;
  }

  if (aiResult?.jobs?.length) {
    const effectiveJobs = aiResult.jobs.slice(0, 12);
    html += `
<div style="background:linear-gradient(135deg,#f0fdf4,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #bbf7d0">
  <h2 style="margin:0 0 12px;font-size:16px;color:#15803d">🏛️ 国企校招机会</h2>
  ${effectiveJobs.map(j => `
  <div style="margin-bottom:12px;padding:12px;background:#fff;border-radius:6px;border:1px solid #eee">
    <div style="margin-bottom:4px">
      <span style="font-size:14px;font-weight:600;color:#333">${escapeHtml(j.company)}</span>
      <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;margin-left:8px">${escapeHtml(j.type || '')}</span>
    </div>
    <div style="font-size:13px;color:#555;margin-bottom:4px">${escapeHtml(j.title)}</div>
    <div style="font-size:11px;color:#999;margin-bottom:6px">📍 ${escapeHtml(j.location)}</div>
    <div style="font-size:12px;color:#555;margin-bottom:4px">💡 ${escapeHtml(j.match_reason || '')}</div>
    ${j.advantage_flag ? `
    <div style="font-size:12px;color:#b45309;font-weight:600;margin-bottom:4px;padding:4px 8px;background:#fef3c7;border-radius:4px;display:inline-block">⭐ ${escapeHtml(j.advantage_note)}</div>` : ''}
    ${j.advice ? `
    <div style="font-size:12px;color:#555;margin-top:4px">📌 ${escapeHtml(j.advice)}</div>` : ''}
    <div style="margin-top:6px">
      <a href="https://www.iguopin.com/job/detail?id=${encodeURIComponent(j.job_id)}" target="_blank" style="font-size:12px;color:#15803d;text-decoration:underline">查看详情 →</a>
    </div>
  </div>`).join('')}
</div>`;
  }

  if (aiResult?.articleMap) {
    const analyzedPairs = topItems
      .map((item, i) => ({ item, ai: aiResult.articleMap[i], i }))
      .filter(x => x.ai);
    if (analyzedPairs.length > 0) {
      html += `
<h2 style="margin:0 0 12px;font-size:16px;color:#333">📖 AI 深度摘要</h2>`;
      for (const { item, ai } of analyzedPairs) {
        const dateStr = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
          : '';
        html += `
<div style="padding:14px;margin-bottom:10px;background:#fafafa;border-radius:6px;border-left:3px solid #ff6600">
  <div style="margin-bottom:4px">
    <a href="${escapeHtml(item.link)}" style="font-size:11px;color:#999;text-decoration:underline">${escapeHtml(item.title)}</a>
  </div>
  <h3 style="margin:0 0 6px;font-size:15px;color:#333">${escapeHtml(ai.chinese_title || item.title)}</h3>
  <div style="font-size:12px;color:#999;margin-bottom:6px">
    <span style="color:#ff6600;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
  </div>
  <p style="margin:0 0 6px;font-size:13px;color:#555;line-height:1.5">${escapeHtml(ai.summary || '')}</p>
  ${ai.key_points?.length ? `
  <div style="margin-top:6px">
    ${ai.key_points.map(kp => `<span style="display:inline-block;background:#fff3e6;color:#c2410c;font-size:11px;padding:2px 8px;border-radius:4px;margin:0 4px 4px 0">${escapeHtml(kp)}</span>`).join('')}
  </div>` : ''}
</div>`;
      }
    }
  }

  html += `
<h2 style="margin:16px 0 12px;font-size:16px;color:#333">📋 全部 AI 资讯</h2>`;
  for (const item of topItems) {
    const dateStr = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '';
    html += `
<div style="padding:12px;margin-bottom:8px;background:#fafafa;border-radius:6px;border-left:2px solid #ddd">
  <h3 style="margin:0 0 4px;font-size:14px"><a href="${escapeHtml(item.link)}" style="color:#333;text-decoration:none">${escapeHtml(item.title)}</a></h3>
  <div style="font-size:11px;color:#999">
    <span style="color:#ff6600;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
  </div>
</div>`;
  }

  if (indieItems.length) {
    html += `
<div style="background:linear-gradient(135deg,#ecfdf5,#fff);border-radius:8px;padding:16px;margin:16px 0;border:1px solid #a7f3d0">
  <h2 style="margin:0 0 8px;font-size:16px;color:#047857">🎮 独立游戏开发（隔日推送）</h2>
  <div style="font-size:12px;color:#666;margin-bottom:12px">抓取 ${indieItems.length} 条相关动态，作灵感/工具向补充</div>
  ${indieItems.map(item => {
    const dateStr = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '';
    return `
  <div style="padding:12px;margin-bottom:8px;background:#fff;border-radius:6px;border:1px solid #d1fae5">
    <h3 style="margin:0 0 4px;font-size:14px"><a href="${escapeHtml(item.link)}" style="color:#065f46;text-decoration:none">${escapeHtml(item.title)}</a></h3>
    <div style="font-size:11px;color:#999;margin-bottom:4px">
      <span style="color:#047857;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
    </div>
    ${item.content ? `<div style="font-size:12px;color:#555">${escapeHtml(truncate(item.content, 140))}</div>` : ''}
  </div>`;
  }).join('')}
</div>`;
  }

  html += `
</div>
<div style="background:#fafafa;padding:12px;text-align:center;font-size:11px;color:#999">
  AI 分析由 DeepSeek ${model} 生成 · 每日一次 · 由 GitHub Actions 自动推送
</div>
</div>
</body></html>`;

  return html;
}
