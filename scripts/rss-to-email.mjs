import RssParser from 'rss-parser';
import nodemailer from 'nodemailer';

const FEEDS = [
  { name: 'arXiv AI/ML/CV', url: 'https://rss.arxiv.org/rss/cs.AI+cs.CL+cs.LG' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
  { name: 'BAIR Blog', url: 'https://bair.berkeley.edu/blog/feed.xml' },
];

const parser = new RssParser({
  timeout: 20000,
  customFields: { item: ['source'] },
});

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

async function main() {
  console.log(`[$(new Date().toISOString())] 开始抓取 ${FEEDS.length} 个源...`);

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(FEEDS.map(async feed => {
    const result = await parser.parseURL(feed.url);
    const items = (result.items || []).map(item => ({
      title: item.title || '(无标题)',
      link: item.link || '',
      pubDate: item.isoDate || item.pubDate || '',
      content: item.contentSnippet || item.content || '',
      source: feed.name,
    }));
    console.log(`  ✓ ${feed.name}: ${items.length} 篇`);
    return items;
  }));

  // Collect all items
  const allItems = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    } else {
      console.error(`  ✗ ${FEEDS[i].name}: ${r.reason.message}`);
    }
  }

  if (allItems.length === 0) {
    throw new Error('没有抓到任何文章');
  }

  // Deduplicate by link
  const seen = new Set();
  const unique = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Sort by date descending
  unique.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const topItems = unique.slice(0, 60);
  console.log(`\n去重后 ${unique.length} 篇，取前 ${topItems.length} 篇`);

  // Generate HTML
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
<div style="background:#ff6600;padding:20px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px">AI 资讯摘要</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px">${now}</p>
</div>
<div style="padding:16px">
<p style="color:#666;font-size:13px;margin:0 0 16px">共 <strong style="color:#ff6600">${topItems.length}</strong> 篇文章（来自 ${FEEDS.length} 个源）</p>
${topItems.map(item => {
  const dateStr = item.pubDate
    ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : '';
  return `
<div style="padding:14px;margin-bottom:10px;background:#fafafa;border-radius:6px;border-left:3px solid #ff6600">
<h3 style="margin:0 0 6px;font-size:15px"><a href="${escapeHtml(item.link)}" style="color:#333;text-decoration:none">${escapeHtml(item.title)}</a></h3>
<div style="font-size:12px;color:#999;margin-bottom:6px">
<span style="color:#ff6600;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
</div>
<p style="margin:0;font-size:13px;color:#555;line-height:1.5">${escapeHtml(truncate(item.content, 200))}</p>
</div>`;
}).join('\n')}
</div>
<div style="background:#fafafa;padding:12px;text-align:center;font-size:11px;color:#999">
由 GitHub Actions 自动推送
</div>
</div>
</body></html>`;

  // Send email
  console.log('\n发送邮件中...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.QQ_EMAIL,
      pass: process.env.QQ_SMTP_PASS,
    },
  });

  const dateStr = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  await transporter.sendMail({
    from: process.env.QQ_EMAIL,
    to: process.env.QQ_EMAIL,
    subject: `AI 资讯摘要 ${dateStr}（${topItems.length} 篇）`,
    html,
  });

  console.log('✓ 邮件发送成功！');
}

main().catch(e => {
  console.error('\n✗ 失败:', e.message);
  process.exit(1);
});
