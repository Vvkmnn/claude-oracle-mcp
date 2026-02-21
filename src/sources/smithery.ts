import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const SMITHERY_API_URL = 'https://registry.smithery.ai/servers';
const CACHE_KEY = 'smithery:servers';

interface SmitheryServer {
  qualifiedName: string;
  displayName: string;
  description: string;
  useCount: number;
  verified: boolean;
  homepage?: string;
  createdAt: string;
}

interface SmitheryResponse {
  servers: SmitheryServer[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Parse Smithery server to unified Resource format
 */
function parseServer(server: SmitheryServer): Resource {
  // Extract package name from qualified name (e.g., "@modelcontextprotocol/server-filesystem" -> server-filesystem)
  const name = server.qualifiedName.split('/').pop() || server.displayName;

  return {
    name: server.displayName || name,
    description: server.description || 'No description',
    type: 'mcp',
    install_command: `npx -y ${server.qualifiedName}`,
    config_snippet: JSON.stringify(
      {
        mcpServers: {
          [name.toLowerCase().replace(/^server-/, '')]: {
            command: 'npx',
            args: ['-y', server.qualifiedName],
          },
        },
      },
      null,
      2,
    ),
    source: 'smithery.ai',
    url: server.homepage || `https://smithery.ai/server/${server.qualifiedName}`,
    verified: server.verified,
    last_updated: server.createdAt,
  };
}

/**
 * Fetch all MCP servers from Smithery Registry with pagination
 */
export async function fetchSmitheryServers(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const allServers: Resource[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${SMITHERY_API_URL}?page=${page}&pageSize=100`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(`Failed to fetch Smithery page ${page}: ${response.status}`);
        break;
      }

      const data = (await response.json()) as SmitheryResponse;

      if (!data.servers || data.servers.length === 0) {
        break;
      }

      allServers.push(...data.servers.map(parseServer));

      // Check if there are more pages
      hasMore = page < data.totalPages;
      page++;

      // Limit to 5 pages for faster initial response (500 servers)
      // Full fetch on cache refresh would take too long
      if (page > 5) break;
    }

    cache.set(CACHE_KEY, allServers, TTL.SMITHERY);
    return allServers;
  } catch (error) {
    console.error('Error fetching Smithery Registry:', error);
    return [];
  }
}

/**
 * Get source status for Smithery
 */
export function getSmitherySource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'smithery.ai',
    type: 'mcp',
    count: cached?.length || 200,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
