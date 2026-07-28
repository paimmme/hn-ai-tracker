import RssParser from 'rss-parser';

// 已移除 arXiv（学术论文过多）
// weight 越高，在 AI 相关度打分中基础分越高
export const AI_FEEDS = [
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', weight: 3 },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', weight: 2 },
  { name: 'BAIR Blog', url: 'https://bair.berkeley.edu/blog/feed.xml', weight: 2 },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss', weight: 3 },
  { name: '量子位', url: 'https://rsshub.app/qbitai', weight: 3 },
  { name: 'InfoQ 中文', url: 'https://rsshub.app/infoq/topic/1', weight: 2 },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', weight: 1 },
];

// 独立游戏开发资讯（隔日附带 2~4 条）
export const INDIE_GAME_FEEDS = [
  { name: 'itch.io Blog', url: 'https://itch.io/blog.rss' },
  { name: 'Gamasutra/Game Developer', url: 'https://www.gamedeveloper.com/rss.xml' },
  { name: 'IndieDB News', url: 'https://www.indiedb.com/rss/news' },
  { name: 'Godot Engine Blog', url: 'https://godotengine.org/rss.xml' },
];

// 不用裸词 "ai"（误伤过多），中文短词 + 明确英文短语
export const AI_KEYWORDS = [
  'aigc', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'deepseek',
  'machine learning', 'deep learning', 'neural network', 'transformer',
  'ai agent', 'chatgpt', 'rag', 'multimodal', 'diffusion',
  'artificial intelligence', 'generative ai', 'large language',
  '人工智能', '大模型', '机器学习', '深度学习', '智能体', '生成式',
  '多模态', '大语言模型', '机器人',
];

// 词边界 / 短语匹配（降低 GitHub 杂讯）
const AI_WORD_RE = /\b(ai|ml|llm|gpt|rag)\b/i;

export const INDIE_KEYWORDS = [
  'indie', 'independent game', 'game jam', 'game dev', 'gamedev',
  'unity', 'unreal', 'godot', 'steam', 'itch.io', 'pixel', 'rogue',
  '独立游戏', '游戏开发', '游戏设计', '引擎',
];

const parser = new RssParser({
  timeout: 20000,
  customFields: { item: ['source'] },
});

export function textMatches(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.some(k => t.includes(k.toLowerCase()));
}

export function isAiRelevantText(text) {
  const blob = text || '';
  if (textMatches(blob, AI_KEYWORDS)) return true;
  // 单独的 ai/ml 缩写仅作弱信号，需配合上下文
  if (AI_WORD_RE.test(blob) && /model|agent|tool|code|data|research|open.?source/i.test(blob)) {
    return true;
  }
  return false;
}

export function scoreAiRelevance(item, feedWeight = 1) {
  const blob = `${item.title || ''} ${item.content || ''}`;
  let score = feedWeight * 10;

  if (textMatches(blob, AI_KEYWORDS)) score += 45;
  else if (isAiRelevantText(blob)) score += 25;

  // 明确 AI 源：即便标题不含关键词也保留基础分
  if (feedWeight >= 2) score += 5;

  // 轻惩罚明显非 AI 杂讯
  if (/hiring|jobs? board|podcast episode|weekly roundup/i.test(blob) && !isAiRelevantText(blob)) {
    score -= 20;
  }
  return score;
}

export function shouldIncludeIndie(item) {
  const blob = `${item.title || ''} ${item.content || ''}`;
  return textMatches(blob, INDIE_KEYWORDS) ||
    /indie|godot|itch|gamedev|game jam/i.test(item.source || '');
}

export async function fetchFeedItems(feeds) {
  const results = await Promise.allSettled(feeds.map(async feed => {
    const result = await parser.parseURL(feed.url);
    const items = (result.items || []).map(item => ({
      title: item.title || '(无标题)',
      link: item.link || '',
      pubDate: item.isoDate || item.pubDate || '',
      content: item.contentSnippet || item.content || '',
      source: feed.name,
      weight: feed.weight || 1,
    }));
    console.log(`  ✓ ${feed.name}: ${items.length} 篇`);
    return items;
  }));

  const allItems = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') allItems.push(...r.value);
    else console.error(`  ✗ ${feeds[i].name}: ${r.reason?.message || r.reason}`);
  }
  return allItems;
}

export function dedupeByLink(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

export function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });
}

/** 北京时间日序：奇数日推送独立游戏（约隔日一次，且固定可预期） */
export function shouldAttachIndieGames(date = new Date()) {
  const day = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    day: 'numeric',
  }).format(date));
  // 奇数日推送（1,3,5...）— 频率约 15 次/月 ≈ 每两天
  return day % 2 === 1;
}

export function selectAiArticles(rawItems, limit = 40) {
  let unique = dedupeByLink(rawItems)
    .map(item => ({ ...item, aiScore: scoreAiRelevance(item, item.weight) }))
    .filter(item => item.aiScore >= 18)
    .sort((a, b) => {
      if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

  return unique.slice(0, limit);
}

export function selectIndieArticles(rawItems, min = 2, max = 4) {
  let items = sortByDateDesc(dedupeByLink(rawItems))
    .filter(shouldIncludeIndie)
    .slice(0, max);

  if (items.length < min) {
    items = sortByDateDesc(dedupeByLink(rawItems)).slice(0, Math.max(min, 3));
  }
  return items.slice(0, max);
}
