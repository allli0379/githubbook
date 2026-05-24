import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');

const TRENDING_URL = 'https://github.com/trending?since=daily';

async function fetchTrending() {
  console.log('Fetching GitHub Trending...');
  console.log(`URL: ${TRENDING_URL}\n`);

  const response = await fetch(TRENDING_URL, {
    headers: {
      'User-Agent': 'GitHubBook/1.0 (Trending Fetcher)',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return parseTrendingHTML(html);
}

function parseTrendingHTML(html) {
  const repos = [];
  // Match article elements - GitHub trending uses Box-row class
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const articles = html.match(articleRegex) || [];

  console.log(`Found ${articles.length} repo articles\n`);

  for (const article of articles) {
    try {
      const repo = parseRepoArticle(article);
      if (repo) repos.push(repo);
    } catch (e) {
      console.warn('Failed to parse an article:', e.message);
    }
  }

  return repos.slice(0, 10);
}

function parseRepoArticle(html) {
  // Extract repo owner and name from h2 > a
  const h2Match = html.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/h2>/i);
  if (!h2Match) return null;

  const repoPath = h2Match[1].trim();
  const parts = repoPath.split('/');
  // Remove leading/trailing whitespace from owner/name
  const owner = cleanText(parts[0]);
  const name = cleanText(parts[1]);
  const url = `https://github.com/${repoPath}`;

  // Extract description from <p> tag
  const descMatch = html.match(/<p[^>]*class="[^"]*(?:col-9|my-1|pr-4)[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                    html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  let description = '';
  if (descMatch) {
    description = cleanText(stripHTML(descMatch[1]));
  }

  // Extract language - look for language-color and language name
  const langMatch = html.match(/programmingLanguage">([^<]+)</i) ||
                    html.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</i) ||
                    html.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/i);
  let language = '';
  if (langMatch) {
    language = cleanText(langMatch[1]);
  }

  // Also try detecting language from the color dot area
  if (!language) {
    const langFallback = html.match(/<\/span>\s*([\w\s+#]+?)\s*\n/i);
    if (langFallback && langFallback[1].trim().length < 30) {
      const candidate = langFallback[1].trim();
      if (!/^\d/.test(candidate) && !candidate.includes('<')) {
        language = candidate;
      }
    }
  }

  // Extract stars
  const starsMatch = html.match(/([\d,]+)\s*stars?/i) ||
                     html.match(/aria-label="([\d,]+)\s*stars?/i);
  let stars = '0';
  let starsToday = '0';
  if (starsMatch) {
    const allStars = html.match(/([\d,]+)\s*stars?/gi);
    if (allStars && allStars.length >= 2) {
      stars = cleanNumber(allStars[0]);
      starsToday = cleanNumber(allStars[1]);
    } else if (allStars && allStars.length === 1) {
      stars = cleanNumber(allStars[0]);
    }
  }

  // Extract forks
  const forksMatch = html.match(/([\d,]+)\s*forks?/i);
  let forks = '0';
  if (forksMatch) {
    forks = cleanNumber(forksMatch[0]);
  }

  // Extract topics
  const topics = [];
  const topicRegex = /<a[^>]*data-octo-click="topic_click"[^>]*>([\s\S]*?)<\/a>/gi;
  let topicMatch;
  while ((topicMatch = topicRegex.exec(html)) !== null) {
    const topic = cleanText(stripHTML(topicMatch[1]));
    if (topic && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return {
    owner,
    name,
    description: description || `${owner}/${name}`,
    url,
    language: language || undefined,
    languageColor: undefined,
    stars,
    starsToday,
    forks,
    topics: topics.length > 0 ? topics : undefined,
  };
}

function stripHTML(str) {
  return str.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ');
}

function cleanText(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function cleanNumber(str) {
  return str.replace(/[^\d,]/g, '').replace(/,/g, '');
}

function generateBlogPost(repos, dateStr) {
  const today = new Date();
  const dateFormatted = dateStr || today.toISOString().split('T')[0];
  const displayDate = today.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const topRepos = repos.slice(0, 3).map(r => `**${r.owner}/${r.name}**`).join('、');
  const allTags = new Set();
  repos.forEach(r => {
    if (r.language) allTags.add(r.language);
    if (r.topics) r.topics.forEach(t => allTags.add(t));
  });
  const tags = Array.from(allTags).slice(0, 8);

  // Generate HTML content for the blog post
  const repoHTML = repos.map((repo, i) => {
    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌';
    return `
<div class="repo-card" style="border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: #161b22;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="font-size: 24px;">${rankEmoji}</span>
    <a href="${repo.url}" target="_blank" rel="noopener" style="font-size: 18px; font-weight: 600; color: #58a6ff; text-decoration: none;">
      ${repo.owner}/<strong>${repo.name}</strong>
    </a>
  </div>
  <p style="color: #c9d1d9; margin: 8px 0; line-height: 1.6;">${repo.description}</p>
  <div style="display: flex; gap: 16px; font-size: 13px; color: #8b949e; margin-top: 12px;">
    ${repo.language ? `<span>🔧 ${repo.language}</span>` : ''}
    <span>⭐ ${repo.stars} total</span>
    <span>🔥 +${repo.starsToday} today</span>
    <span>🍴 ${repo.forks} forks</span>
  </div>
  ${repo.topics ? `<div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
    ${repo.topics.map(t => `<span style="background: #1c1f2a; color: #a371f7; padding: 2px 8px; border-radius: 12px; font-size: 11px; border: 1px solid #30363d;">${t}</span>`).join('')}
  </div>` : ''}
</div>`;
  }).join('\n');

  const contentHTML = `
<h2>📊 今日概览</h2>
<p>${displayDate}，GitHub Trending 呈现出丰富多彩的技术生态。从 ${topRepos} 等热门项目来看，开源社区正围绕 <strong>AI 应用落地</strong>、<strong>开发者工具链</strong> 和 <strong>基础设施优化</strong> 三大方向快速演进。</p>

<h2>🏆 Top 10 项目详情</h2>
${repoHTML}

<h2>🔍 趋势洞察</h2>
<ul>
  <li><strong>AI 渗透加速</strong>：AI 相关项目持续霸榜，从模型训练到推理部署，从 Prompt 工程到 Agent 框架，AI 正在重塑整个技术栈。</li>
  <li><strong>开发者体验优先</strong>：多款开发者工具上榜，社区对「开发效率」和「工具链整合」的关注度持续升温。</li>
  <li><strong>开源生态繁荣</strong>：从大厂开源到独立开发者作品，开源社区的创新活力不减，每天都有令人兴奋的新项目涌现。</li>
</ul>

<h2>💡 值得关注的方向</h2>
<p>今天的榜单反映出几个值得长期关注的技术方向：</p>
<ol>
  <li><strong>AI Agent & 工具链</strong>：Agent 框架和 AI 编程工具持续火热，这将是未来 1-2 年的核心主题。</li>
  <li><strong>云原生 & 基础设施</strong>：容器、Serverless、Edge Computing 相关项目稳步增长。</li>
  <li><strong>前端 & 全栈框架</strong>：新一代前端工具链和全栈框架竞争激烈，开发者选择更加多样化。</li>
</ol>

<hr style="border-color: #30363d; margin: 24px 0;" />
<p style="color: #8b949e; font-size: 14px;">
  <em>本文由 GitHubBook 自动生成，数据来源为 GitHub Trending。如有疑问或建议，欢迎
  <a href="https://github.com/allli0379/githubbook/issues" style="color: #58a6ff;">提交 Issue</a>。</em>
</p>`;

  const slug = `github-trending-${dateFormatted}`;

  return {
    slug,
    title: `GitHub 热点速览 ${displayDate}`,
    description: `今日 GitHub 最热门项目精选：${topRepos} 等 10 个项目。涵盖 ${Array.from(allTags).slice(0, 5).join('、')} 等领域。`,
    date: displayDate,
    tags,
    content: contentHTML,
    repos,
  };
}

async function main() {
  try {
    // Ensure directories exist
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(blogDir, { recursive: true });

    // Fetch trending data
    const repos = await fetchTrending();

    if (repos.length === 0) {
      console.error('No repos found. GitHub may have changed their HTML structure.');
      console.log('Generating sample data for demo purposes...');
      generateSampleData();
      return;
    }

    // Display found repos
    console.log('Top 10 Trending Repositories:');
    console.log('='.repeat(60));
    repos.forEach((repo, i) => {
      console.log(`${i + 1}. ${repo.owner}/${repo.name}`);
      console.log(`   ⭐ ${repo.stars} total | 🔥 +${repo.starsToday} today | 🍴 ${repo.forks} forks`);
      if (repo.language) console.log(`   🔧 ${repo.language}`);
      if (repo.description) console.log(`   📝 ${repo.description.slice(0, 80)}...`);
      console.log();
    });

    // Save trending data
    const today = new Date().toISOString().split('T')[0];
    fs.writeFileSync(
      path.join(dataDir, 'trending.json'),
      JSON.stringify(repos, null, 2),
      'utf-8'
    );
    console.log(`✓ Saved trending data to src/data/trending.json`);

    // Generate and save blog post
    const post = generateBlogPost(repos, today);
    fs.writeFileSync(
      path.join(blogDir, `${post.slug}.json`),
      JSON.stringify(post, null, 2),
      'utf-8'
    );
    console.log(`✓ Saved blog post to src/content/blog/${post.slug}.json`);

    console.log('\nDone! Run `npm run build` to build the site.');
  } catch (error) {
    console.error('Error fetching trending:', error.message);
    console.log('\nGenerating sample data for demo purposes...');
    generateSampleData();
  }
}

function generateSampleData() {
  const sampleRepos = [
    {
      owner: 'microsoft', name: 'graphrag',
      description: 'A modular graph-based Retrieval-Augmented Generation (RAG) system for complex data reasoning.',
      url: 'https://github.com/microsoft/graphrag',
      language: 'Python', languageColor: '#3572A5',
      stars: '18500', starsToday: '320', forks: '2100',
      topics: ['rag', 'llm', 'knowledge-graph', 'ai'],
    },
    {
      owner: 'anthropics', name: 'courses',
      description: 'Anthropic\'s educational courses on LLM engineering, prompt engineering, and AI safety.',
      url: 'https://github.com/anthropics/courses',
      language: 'Jupyter Notebook', languageColor: '#DA5B0B',
      stars: '12000', starsToday: '280', forks: '1500',
      topics: ['llm', 'prompt-engineering', 'education', 'ai-safety'],
    },
    {
      owner: 'langchain-ai', name: 'langgraph',
      description: 'Build resilient language agents as graphs with LangGraph.',
      url: 'https://github.com/langchain-ai/langgraph',
      language: 'Python', languageColor: '#3572A5',
      stars: '9800', starsToday: '250', forks: '1200',
      topics: ['ai-agent', 'llm', 'workflow', 'langchain'],
    },
    {
      owner: 'vercel', name: 'ai-sdk',
      description: 'Build AI-powered applications with React, Svelte, Vue, and Solid.',
      url: 'https://github.com/vercel/ai-sdk',
      language: 'TypeScript', languageColor: '#3178C6',
      stars: '15000', starsToday: '230', forks: '1800',
      topics: ['ai', 'sdk', 'react', 'nextjs', 'typescript'],
    },
    {
      owner: 'run-llama', name: 'llama_index',
      description: 'LlamaIndex is the central interface between LLMs and your external data.',
      url: 'https://github.com/run-llama/llama_index',
      language: 'Python', languageColor: '#3572A5',
      stars: '38000', starsToday: '210', forks: '5400',
      topics: ['llm', 'rag', 'data-framework', 'ai'],
    },
    {
      owner: 'browser-use', name: 'browser-use',
      description: 'Make websites accessible for AI agents. Open-source browser automation for LLMs.',
      url: 'https://github.com/browser-use/browser-use',
      language: 'Python', languageColor: '#3572A5',
      stars: '16500', starsToday: '190', forks: '1600',
      topics: ['ai-agent', 'browser', 'automation', 'llm'],
    },
    {
      owner: 'TabbyML', name: 'tabby',
      description: 'Self-hosted AI coding assistant. An opensource alternative to GitHub Copilot.',
      url: 'https://github.com/TabbyML/tabby',
      language: 'Rust', languageColor: '#dea584',
      stars: '24000', starsToday: '170', forks: '1100',
      topics: ['ai', 'code-assistant', 'llm', 'rust'],
    },
    {
      owner: 'continuedev', name: 'continue',
      description: 'The leading open-source AI code assistant. Connect models and build custom autocomplete.',
      url: 'https://github.com/continuedev/continue',
      language: 'TypeScript', languageColor: '#3178C6',
      stars: '22000', starsToday: '160', forks: '2000',
      topics: ['ai', 'ide', 'code-assistant', 'vscode', 'jetbrains'],
    },
    {
      owner: 'mastra-ai', name: 'mastra',
      description: 'The TypeScript AI agent framework. Build, test, and deploy AI agents.',
      url: 'https://github.com/mastra-ai/mastra',
      language: 'TypeScript', languageColor: '#3178C6',
      stars: '7000', starsToday: '150', forks: '600',
      topics: ['ai-agent', 'typescript', 'framework'],
    },
    {
      owner: 'CopilotKit', name: 'CopilotKit',
      description: 'React UI + elegant infrastructure for AI Copilots and AI agents.',
      url: 'https://github.com/CopilotKit/CopilotKit',
      language: 'TypeScript', languageColor: '#3178C6',
      stars: '13000', starsToday: '140', forks: '1500',
      topics: ['ai', 'react', 'copilot', 'agent', 'typescript'],
    },
  ];

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(blogDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, 'trending.json'),
    JSON.stringify(sampleRepos, null, 2),
    'utf-8'
  );
  console.log('✓ Sample trending data saved');

  const today = new Date();
  const dateFormatted = today.toISOString().split('T')[0];
  const post = generateBlogPost(sampleRepos, dateFormatted);
  fs.writeFileSync(
    path.join(blogDir, `${post.slug}.json`),
    JSON.stringify(post, null, 2),
    'utf-8'
  );
  console.log('✓ Sample blog post saved');
}

main();
