import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories';
const CACHE_KEY_PREFIX = 'github-search:';

let rateLimitWarned = false;

interface GitHubRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  topics: string[];
  language: string | null;
  updated_at: string;
  owner: {
    login: string;
  };
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

/**
 * Infer install command from repo metadata.
 * npm-looking repos get npx, others get git clone.
 */
function inferInstallCommand(repo: GitHubRepo): string {
  const name = repo.name.toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());
  const lang = repo.language?.toLowerCase() || '';

  // npm/Node.js projects — use npx
  if (
    lang === 'typescript' ||
    lang === 'javascript' ||
    topics.includes('npm') ||
    topics.includes('nodejs') ||
    name.endsWith('-mcp') ||
    name.endsWith('-mcp-server')
  ) {
    return `npx -y ${repo.full_name}`;
  }

  // Python projects — use uvx or pip
  if (lang === 'python' || topics.includes('pip') || topics.includes('pypi')) {
    return `uvx ${repo.name}`;
  }

  // Default — git clone
  return `git clone ${repo.html_url}`;
}

/**
 * Infer resource type from repo topics and name
 */
function inferType(repo: GitHubRepo): Resource['type'] {
  const name = repo.name.toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());

  if (
    topics.includes('claude-code-plugin') ||
    topics.includes('claude-plugin') ||
    name.includes('plugin')
  ) {
    return 'plugin';
  }
  if (
    topics.includes('claude-code-skill') ||
    topics.includes('claude-skill') ||
    name.includes('skill')
  ) {
    return 'skill';
  }
  return 'mcp';
}

/**
 * Parse GitHub repo to unified Resource format
 */
function parseRepo(repo: GitHubRepo): Resource {
  return {
    name: repo.name,
    description: repo.description || 'No description',
    type: inferType(repo),
    install_command: inferInstallCommand(repo),
    source: 'github',
    url: repo.html_url,
    author: repo.owner.login,
    stars: repo.stargazers_count,
    keywords: repo.topics,
    last_updated: repo.updated_at,
  };
}

/** Common stopwords to exclude when extracting anchor keyword */
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'for',
  'and',
  'or',
  'with',
  'in',
  'on',
  'to',
  'of',
  'by',
  'is',
  'it',
  'at',
  'from',
]);

/**
 * Extract the most distinctive keyword from a multi-word query.
 * Removes stopwords, picks the first remaining token — users naturally
 * write the product/tool name first ("slack notifications", "docker container").
 * Returns null if query is a single token or all tokens are stopwords.
 */
function extractAnchor(query: string): string | null {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
  if (tokens.length < 2) return null;
  return tokens[0] ?? null;
}

/**
 * Check if a repo is actually an MCP server, plugin, or skill —
 * not a platform that happens to tag "mcp" for visibility.
 *
 * Name is the strongest signal: repos that ARE MCP tools have it in the name.
 * Topics must be specific ("mcp-server", "model-context-protocol") — just
 * "mcp" alone is too common (nacos 32k★, kratos 25k★, lobehub 72k★ all tag it).
 */
function isEcosystemRepo(repo: GitHubRepo): boolean {
  const name = repo.name.toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());

  // Name contains MCP/plugin/skill pattern — strong signal
  if (name.includes('mcp') || name.includes('claude-code') || name.includes('claude-skill')) {
    return true;
  }

  // Specific topic tags — repos that ARE MCP tools use these
  const specificTopics = [
    'mcp-server',
    'model-context-protocol',
    'claude-code',
    'claude-code-plugin',
    'claude-code-skill',
    'claude-plugin',
    'claude-skill',
  ];
  for (const t of specificTopics) {
    if (topics.includes(t)) return true;
  }

  return false;
}

/**
 * Run a single GitHub search query and return parsed repos
 */
async function fetchGithubQuery(
  searchQuery: string,
  headers: Record<string, string>,
): Promise<GitHubRepo[]> {
  const url = `${GITHUB_SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=15`;
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    if (response.status === 403) rateLimitWarned = true;
    console.error(`GitHub search failed: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as GitHubSearchResponse;
  return data.items || [];
}

/**
 * Search GitHub repositories for MCP servers, plugins, and skills.
 * Runs two focused queries in parallel to cover all resource types.
 * Per-query search — cache key includes the query.
 */
export async function searchGithub(query: string): Promise<Resource[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase().trim()}`;
  const cached = cache.get<Resource[]>(cacheKey);
  if (cached) return cached;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'claude-oracle-mcp',
    };

    // Optional auth for higher rate limits (10 req/min → 30 req/min)
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Focused queries: MCP servers + Claude Code plugins/skills + anchor fallback
    // No in: qualifier — let GitHub search broadly (name+desc+topics+readme)
    // isEcosystemRepo post-filter removes noise from readme-only matches
    const queries: Promise<GitHubRepo[]>[] = [
      fetchGithubQuery(`${query} mcp`, headers),
      fetchGithubQuery(`${query} claude-code plugin OR skill`, headers),
    ];

    // Anchor query: for multi-word queries, search with just the most distinctive
    // keyword + "mcp". This catches repos that match the core term but not all
    // auxiliary terms (e.g., "xcode mcp" finds XcodeBuildMCP missed by "xcode swift iOS mcp")
    const anchor = extractAnchor(query);
    if (anchor) {
      queries.push(fetchGithubQuery(`${anchor} mcp`, headers));
    }

    const queryResults = await Promise.all(queries);

    // Merge, deduplicate, and filter for actual ecosystem repos
    const seen = new Set<string>();
    const allRepos: GitHubRepo[] = [];
    for (const repo of queryResults.flat()) {
      if (!seen.has(repo.full_name) && isEcosystemRepo(repo)) {
        seen.add(repo.full_name);
        allRepos.push(repo);
      }
    }

    const resources = allRepos.filter((repo) => repo.description).map(parseRepo);

    cache.set(cacheKey, resources, TTL.GITHUB_SEARCH);
    return resources;
  } catch (error) {
    console.error('Error searching GitHub:', error);
    return [];
  }
}

/**
 * Get source status for GitHub Search
 */
/**
 * Returns a warning string if GitHub search was rate-limited, then resets the flag.
 * Called by the aggregator after each search to surface the issue to the user.
 */
export function consumeGithubWarning(): string | null {
  if (!rateLimitWarned) return null;
  rateLimitWarned = false;
  const hint = process.env.GITHUB_TOKEN
    ? 'GitHub rate limit hit despite token — try again in a minute.'
    : 'GitHub rate-limited (no token). For better results: claude mcp add-json oracle \'{"command":"node","args":["/path/to/dist/index.js"],"env":{"GITHUB_TOKEN":"your-token"}}\' or export GITHUB_TOKEN=$(gh auth token)';
  return hint;
}

export function getGithubSearchSource(): DataSource {
  return {
    name: 'github (search)',
    type: 'mcp',
    count: 0, // Per-query — no static count
    last_updated: new Date().toISOString(),
    status: 'ok',
  };
}
