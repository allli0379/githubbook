import fs from 'node:fs';
import path from 'node:path';

export interface Repo {
  owner: string;
  name: string;
  description: string;
  url: string;
  language?: string;
  languageColor?: string;
  stars: string;
  starsToday: string;
  forks: string;
  topics?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content?: string;
  repos?: Repo[];
}

const dataDir = path.join(process.cwd(), 'src', 'data');
const contentDir = path.join(process.cwd(), 'src', 'content', 'blog');

export async function getTrendingData(): Promise<Repo[]> {
  try {
    const filePath = path.join(dataDir, 'trending.json');
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getRecentPosts(limit = 10): Promise<BlogPost[]> {
  try {
    if (!fs.existsSync(contentDir)) return [];

    const files = fs.readdirSync(contentDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    const posts: BlogPost[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
      const post = JSON.parse(raw) as BlogPost;
      posts.push(post);
    }
    return posts;
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(contentDir, `${slug}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as BlogPost;
  } catch {
    return null;
  }
}
