import type { Resource, DataSource, MarketplaceJson, MarketplacePlugin } from '../types.js';
import { cache, TTL } from '../cache.js';

/**
 * GitHub marketplace sources
 */
const MARKETPLACE_URLS = [
  {
    url: 'https://raw.githubusercontent.com/jeremylongshore/claude-code-plugins-plus/main/.claude-plugin/marketplace.json',
    marketplace: 'claude-code-plugins-plus',
  },
  {
    url: 'https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json',
    marketplace: 'claude-plugins-official',
  },
  {
    url: 'https://raw.githubusercontent.com/obra/superpowers-marketplace/main/.claude-plugin/marketplace.json',
    marketplace: 'superpowers-marketplace',
  },
];

/**
 * Parse a marketplace plugin entry to unified Resource format
 */
function parsePlugin(plugin: MarketplacePlugin, marketplace: string): Resource {
  const source = typeof plugin.source === 'object' ? plugin.source.url : plugin.source;
  const url = plugin.repository || (source?.startsWith('http') ? source : undefined);

  return {
    name: plugin.name,
    description: plugin.description || 'No description available',
    type: 'plugin',
    install_command: `/plugin install ${plugin.name}@${marketplace}`,
    source: marketplace,
    url,
    category: plugin.category,
    keywords: plugin.keywords,
    author: plugin.author?.name,
  };
}

/**
 * Fetch plugins from a single marketplace
 */
async function fetchMarketplace(url: string, marketplace: string): Promise<Resource[]> {
  const cacheKey = `github:${marketplace}`;
  const cached = cache.get<Resource[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch ${marketplace}: ${response.status}`);
      return [];
    }

    const json = (await response.json()) as MarketplaceJson;
    const plugins = json.plugins?.map((p) => parsePlugin(p, marketplace)) || [];

    cache.set(cacheKey, plugins, TTL.PLUGINS);
    return plugins;
  } catch (error) {
    console.error(`Error fetching ${marketplace}:`, error);
    return [];
  }
}

/**
 * Fetch all GitHub marketplace plugins
 */
export async function fetchGithubPlugins(): Promise<Resource[]> {
  const results = await Promise.all(
    MARKETPLACE_URLS.map(({ url, marketplace }) => fetchMarketplace(url, marketplace)),
  );

  return results.flat();
}

/**
 * Get source status for GitHub plugins
 */
export function getGithubPluginsSources(): DataSource[] {
  return MARKETPLACE_URLS.map(({ marketplace }) => {
    const cached = cache.get<Resource[]>(`github:${marketplace}`);
    return {
      name: marketplace,
      type: 'plugin' as const,
      count: cached?.length || 30,
      last_updated: cached ? new Date().toISOString() : 'never',
      status: cached ? ('ok' as const) : ('stale' as const),
    };
  });
}
