import type { Resource, DataSource, ResourceType } from '../types.js';
import { cache, TTL } from '../cache.js';

const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/';
const CACHE_KEY_PREFIX = 'web-search:';

interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Parse DuckDuckGo Lite HTML into structured results.
 * The lite page uses a simple table layout with result links and snippets.
 */
function parseDdgLiteHtml(html: string): WebResult[] {
  const results: WebResult[] = [];

  // DDG Lite renders results as table rows with links and snippet cells.
  // Result links: <a rel="nofollow" href="URL" class='result-link'>Title</a>
  // Snippets: <td class='result-snippet'>...</td>
  // Note: DDG Lite uses single quotes for class attributes
  const linkRegex =
    /<a[^>]*href=["']([^"']+)["'][^>]*class=['"]result-link['"][^>]*>([^<]+)<\/a>/gi;
  const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const links: { url: string; title: string }[] = [];
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    links.push({
      url: linkMatch[1]!,
      title: linkMatch[2]!.trim(),
    });
  }

  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    // Strip HTML tags from snippet
    snippets.push(snippetMatch[1]!.replace(/<[^>]+>/g, '').trim());
  }

  for (let i = 0; i < links.length; i++) {
    const link = links[i]!;
    results.push({
      title: link.title,
      url: link.url,
      snippet: snippets[i] || '',
    });
  }

  return results;
}

/**
 * Infer resource type from web result content
 */
function inferType(result: WebResult): ResourceType {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  if (text.includes('plugin')) return 'plugin';
  if (text.includes('skill')) return 'skill';
  return 'mcp';
}

/**
 * Try to extract install command from snippet text
 */
function extractInstallCommand(result: WebResult): string {
  const text = `${result.title} ${result.snippet}`;

  // Look for common install patterns in the snippet
  const patterns = [
    /npx\s+[\w@/-]+/i,
    /npm\s+install\s+[\w@/-]+/i,
    /brew\s+install\s+[\w-]+/i,
    /pip\s+install\s+[\w-]+/i,
    /uvx\s+[\w-]+/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return '';
}

/**
 * Parse web result to unified Resource format
 */
function parseResult(result: WebResult): Resource {
  return {
    name: result.title.slice(0, 80), // Truncate long titles
    description: result.snippet.slice(0, 200) || 'No description',
    type: inferType(result),
    install_command: extractInstallCommand(result),
    source: 'web',
    url: result.url,
  };
}

/**
 * Search the web for MCP-related resources via DuckDuckGo Lite.
 * Per-query search — cache key includes the query.
 */
export async function searchWeb(query: string): Promise<Resource[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase().trim()}`;
  const cached = cache.get<Resource[]>(cacheKey);
  if (cached) return cached;

  try {
    const searchQuery = `${query} MCP server claude`;
    const response = await fetch(DDG_LITE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(searchQuery)}`,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`DuckDuckGo search failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const webResults = parseDdgLiteHtml(html);

    // Filter for results that seem MCP/plugin/skill related
    const relevant = webResults.filter((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      return (
        text.includes('mcp') ||
        text.includes('model context protocol') ||
        text.includes('claude') ||
        text.includes('plugin') ||
        text.includes('skill')
      );
    });

    const resources = relevant.slice(0, 10).map(parseResult);
    cache.set(cacheKey, resources, TTL.WEB_SEARCH);
    return resources;
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
}

/**
 * Get source status for Web Search
 */
export function getWebSearchSource(): DataSource {
  return {
    name: 'web (search)',
    type: 'mcp',
    count: 0, // Per-query — no static count
    last_updated: new Date().toISOString(),
    status: 'ok',
  };
}
