import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const siteUrl = 'https://allli0379.github.io/githubbook';

function walkDir(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, relativePath));
    } else if (entry.name.endsWith('.html')) {
      let urlPath = relativePath.replace(/\\/g, '/');
      // Remove index.html suffix for cleaner URLs
      if (urlPath.endsWith('/index.html')) {
        urlPath = urlPath.replace('/index.html', '/');
      } else if (urlPath === 'index.html') {
        urlPath = '';
      } else {
        urlPath = urlPath.replace('.html', '');
      }
      files.push(urlPath);
    }
  }

  return files;
}

function generateSitemap() {
  const pages = walkDir(distDir);

  const now = new Date().toISOString().split('T')[0];

  const urls = pages.map((page) => {
    const url = page ? `${siteUrl}/${page}` : siteUrl;
    const priority = page === '' ? '1.0' :
                     page.startsWith('trending') ? '0.9' :
                     '0.7';
    const changefreq = page === '' ? 'daily' :
                       page.startsWith('trending') ? 'daily' :
                       'weekly';

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`✓ Sitemap generated with ${pages.length} URLs`);
}

generateSitemap();
