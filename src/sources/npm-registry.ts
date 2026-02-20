import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const CACHE_KEY_MCP = 'npm-registry:mcp-servers';
const CACHE_KEY_PLUGINS = 'npm-registry:claude-plugins';

interface NpmPackage {
  package: {
    name: string;
    description?: string;
    version: string;
    keywords?: string[];
    links: {
      npm?: string;
      homepage?: string;
      repository?: string;
    };
    publisher: {
      username: string;
    };
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
}

interface NpmSearchResponse {
  objects: NpmPackage[];
  total: number;
}

/**
 * Parse npm package to unified Resource format
 */
function parsePackage(pkg: NpmPackage, type: 'mcp' | 'plugin'): Resource {
  const name = pkg.package.name;

  let installCommand = '';
  let configSnippet = '';

  if (type === 'mcp') {
    installCommand = `npx -y ${name}`;
    configSnippet = JSON.stringify(
      {
        mcpServers: {
          [name
            .replace(/^@[^/]+\//, '')
            .replace(/^mcp-/, '')
            .replace(/^server-/, '')]: {
            command: 'npx',
            args: ['-y', name],
          },
        },
      },
      null,
      2
    );
  } else {
    // Plugin install command
    installCommand = `npm install -g ${name}`;
  }

  return {
    name,
    description: pkg.package.description || 'No description',
    type,
    install_command: installCommand,
    config_snippet: configSnippet,
    source: 'npmjs.com',
    url:
      pkg.package.links.homepage ||
      pkg.package.links.repository ||
      pkg.package.links.npm ||
      `https://www.npmjs.com/package/${name}`,
    version: pkg.package.version,
    keywords: pkg.package.keywords,
    quality_score: pkg.score.detail.quality,
    popularity_score: pkg.score.detail.popularity,
  };
}

/**
 * Fetch packages from npm registry with pagination
 */
async function fetchNpmPackages(keyword: string, type: 'mcp' | 'plugin'): Promise<Resource[]> {
  const allPackages: Resource[] = [];
  let from = 0;
  const size = 250;
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `${NPM_SEARCH_URL}?text=keywords:${keyword}&size=${size}&from=${from}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(`Failed to fetch npm packages for ${keyword}: ${response.status}`);
        break;
      }

      const data = (await response.json()) as NpmSearchResponse;

      if (!data.objects || data.objects.length === 0) {
        break;
      }

      allPackages.push(...data.objects.map((pkg) => parsePackage(pkg, type)));

      from += size;
      hasMore = data.objects.length === size && from < data.total;

      // Limit to first page for faster response (250 packages)
      // Full pagination takes too long for initial fetch
      break;
    }

    return allPackages;
  } catch (error) {
    console.error(`Error fetching npm packages for ${keyword}:`, error);
    return [];
  }
}

/**
 * Fetch MCP servers from npm (keyword: mcp-server)
 */
export async function fetchNpmMcpPackages(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY_MCP);
  if (cached) return cached;

  const packages = await fetchNpmPackages('mcp-server', 'mcp');
  cache.set(CACHE_KEY_MCP, packages, TTL.NPM_REGISTRY);
  return packages;
}

/**
 * Fetch Claude Code plugins from npm (keyword: claude-code-plugin)
 */
export async function fetchNpmPluginPackages(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY_PLUGINS);
  if (cached) return cached;

  const packages = await fetchNpmPackages('claude-code-plugin', 'plugin');
  cache.set(CACHE_KEY_PLUGINS, packages, TTL.NPM_REGISTRY);
  return packages;
}

/**
 * Get source status for npm MCP packages
 */
export function getNpmMcpSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY_MCP);
  return {
    name: 'npmjs.com (mcp)',
    type: 'mcp',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}

/**
 * Get source status for npm plugin packages
 */
export function getNpmPluginSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY_PLUGINS);
  return {
    name: 'npmjs.com (plugins)',
    type: 'plugin',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
