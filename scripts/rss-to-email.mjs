import nodemailer from 'nodemailer';
import { fetchJobs, cleanJob, clusterJobsBySkills } from './fetch-jobs.mjs';
import {
  AI_FEEDS,
  INDIE_GAME_FEEDS,
  AI_KEYWORDS,
  fetchFeedItems,
  selectAiArticles,
  selectIndieArticles,
  shouldAttachIndieGames,
  textMatches,
} from '../lib/feeds.mjs';
import { analyzeWithDeepSeek } from '../lib/deepseek.mjs';
import { buildEmailHtml } from '../lib/email-html.mjs';

const AI_BATCH_SIZE = 20;

async function main() {
  console.log(`[${new Date().toISOString()}] 开始抓取 AI 资讯（已移除 arXiv）...`);

  const rawItems = await fetchFeedItems(AI_FEEDS);
  if (rawItems.length === 0) throw new Error('没有抓到任何文章');

  const topItems = selectAiArticles(rawItems, 40);
  const aiRatio = topItems.filter(i =>
    textMatches(`${i.title} ${i.content}`, AI_KEYWORDS) || (i.aiScore || 0) >= 25
  ).length;
  console.log(`\n筛选后 ${topItems.length} 篇（高 AI 相关约 ${aiRatio} 篇）`);

  let topJobs = [];
  let cluster = null;
  try {
    topJobs = await fetchJobs();
    console.log(`  ✓ 国聘: ${topJobs.length} 个相关校招岗位`);
    const cleaned = topJobs.map(cleanJob);
    cluster = clusterJobsBySkills(cleaned);
    console.log(`  ✓ JD 聚类: must_have=${cluster.must_have.length}, roles=${cluster.role_clusters.length}`);
  } catch (e) {
    console.error(`  ✗ 国聘/聚类失败: ${e.message}`);
  }

  let aiResult = null;
  const aiBatch = topItems.slice(0, AI_BATCH_SIZE);
  if (aiBatch.length > 0) {
    try {
      aiResult = await analyzeWithDeepSeek(aiBatch, topJobs, cluster);
    } catch (e) {
      console.error(`  ✗ AI 分析失败: ${e.message}`);
    }
  }

  let indieItems = [];
  if (shouldAttachIndieGames()) {
    console.log('\n今日为隔日推送日，抓取独立游戏资讯...');
    try {
      const rawIndie = await fetchFeedItems(INDIE_GAME_FEEDS);
      indieItems = selectIndieArticles(rawIndie, 2, 4);
      console.log(`  ✓ 独立游戏: ${indieItems.length} 条`);
    } catch (e) {
      console.error(`  ✗ 独立游戏抓取失败: ${e.message}`);
    }
  } else {
    console.log('\n今日非独立游戏推送日，跳过。');
  }

  const html = buildEmailHtml(topItems, aiResult, cluster, indieItems);
  const subjectBase = `AI 资讯摘要 ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  if (!process.env.QQ_EMAIL || !process.env.QQ_SMTP_PASS) {
    throw new Error('缺少 QQ_EMAIL / QQ_SMTP_PASS 环境变量');
  }

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

  await transporter.sendMail({
    from: process.env.QQ_EMAIL,
    to: process.env.QQ_EMAIL,
    subject: `${subjectBase}（${topItems.length} 篇${topJobs.length ? ` · ${topJobs.length} 岗` : ''}${cluster ? ' · JD聚类' : ''}${indieItems.length ? ` · 游戏${indieItems.length}` : ''}${aiResult ? ' · AI' : ''}）`,
    html,
  });

  console.log('✓ 邮件发送成功！');
}

main().catch(e => {
  console.error('\n✗ 失败:', e.message);
  process.exit(1);
});
