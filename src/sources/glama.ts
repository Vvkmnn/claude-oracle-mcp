import { XMLParser } from 'fast-xml-parser';
import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const GLAMA_RSS_URL = 'https://glama.ai/mcp/servers/feeds/recent-servers.xml';
const CACHE_KEY = 'glama:mcp-servers';

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  category?: string | string[];
}

interface RssFeed {
  rss: {
    channel: {
      item: RssItem | RssItem[];
    };
  };
}

/**
 * Parse RSS item to unified Resource format
 */
function parseRssItem(item: RssItem): Resource {
  const categories = Array.isArray(item.category)
    ? item.category
    : item.category
      ? [item.category]
      : [];

  // Extract repo name from GitHub URL for install command
  const repoMatch = item.link?.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoName = repoMatch ? repoMatch[1] : item.title;

  return {
    name: item.title,
    description: item.description?.slice(0, 200) || 'No description',
    type: 'mcp',
    install_command: `npx -y ${repoName}`,
    config_snippet: JSON.stringify(
      {
        mcpServers: {
          [item.title.toLowerCase().replace(/\s+/g, '-')]: {
            command: 'npx',
            args: ['-y', repoName],
          },
        },
      },
      null,
      2,
    ),
    source: 'glama.ai',
    url: item.link,
    category: categories[0],
    keywords: categories,
    last_updated: item.pubDate,
  };
}

/**
 * Fetch MCP servers from Glama.ai RSS feed
 */
export async function fetchGlamaMcpServers(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(GLAMA_RSS_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch Glama RSS: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const feed = parser.parse(xml) as RssFeed;
    const items = feed.rss?.channel?.item;

    if (!items) return [];

    const itemArray = Array.isArray(items) ? items : [items];
    const servers = itemArray.map(parseRssItem);

    cache.set(CACHE_KEY, servers, TTL.MCP_SERVERS);
    return servers;
  } catch (error) {
    console.error('Error fetching Glama RSS:', error);
    return [];
  }
}

/**
 * Get source status for Glama
 */
export function getGlamaSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'glama.ai',
    type: 'mcp' as const,
    count: cached?.length || 300,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? ('ok' as const) : ('stale' as const),
  };
}
