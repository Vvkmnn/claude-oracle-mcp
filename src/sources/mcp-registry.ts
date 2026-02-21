import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const MCP_REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers';
const CACHE_KEY = 'mcp-registry:servers';

interface McpServer {
  name: string;
  description?: string;
  version?: string;
  repository?: {
    url: string;
  };
  packages?: {
    npm?: string;
    pypi?: string;
  };
  remotes?: {
    docker?: string;
  };
  websiteUrl?: string;
}

interface McpRegistryResponse {
  servers: McpServer[];
  metadata: {
    nextCursor?: string;
  };
}

/**
 * Parse MCP Registry server to unified Resource format
 */
function parseServer(server: McpServer): Resource {
  // Determine install command based on available packages
  let installCommand = '';
  let configSnippet = '';

  if (server.packages?.npm) {
    installCommand = `npx -y ${server.packages.npm}`;
    configSnippet = JSON.stringify(
      {
        mcpServers: {
          [server.name.toLowerCase()]: {
            command: 'npx',
            args: ['-y', server.packages.npm],
          },
        },
      },
      null,
      2,
    );
  } else if (server.packages?.pypi) {
    installCommand = `pip install ${server.packages.pypi}`;
    configSnippet = JSON.stringify(
      {
        mcpServers: {
          [server.name.toLowerCase()]: {
            command: 'python',
            args: ['-m', server.packages.pypi],
          },
        },
      },
      null,
      2,
    );
  } else if (server.remotes?.docker) {
    installCommand = `docker pull ${server.remotes.docker}`;
    configSnippet = JSON.stringify(
      {
        mcpServers: {
          [server.name.toLowerCase()]: {
            command: 'docker',
            args: ['run', '-i', server.remotes.docker],
          },
        },
      },
      null,
      2,
    );
  }

  return {
    name: server.name,
    description: server.description || 'No description',
    type: 'mcp',
    install_command: installCommand,
    config_snippet: configSnippet,
    source: 'modelcontextprotocol.io',
    url:
      server.websiteUrl ||
      server.repository?.url ||
      `https://registry.modelcontextprotocol.io/servers/${server.name}`,
    version: server.version,
  };
}

/**
 * Fetch all MCP servers from official registry with cursor pagination
 */
export async function fetchMcpRegistry(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const allServers: Resource[] = [];
    let cursor: string | undefined;
    let iterations = 0;

    do {
      const url = cursor ? `${MCP_REGISTRY_URL}?cursor=${cursor}` : MCP_REGISTRY_URL;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(`Failed to fetch MCP Registry: ${response.status}`);
        break;
      }

      const data = (await response.json()) as McpRegistryResponse;

      if (!data.servers || data.servers.length === 0) {
        break;
      }

      allServers.push(...data.servers.map(parseServer));
      cursor = data.metadata?.nextCursor;
      iterations++;

      // Limit to 3 iterations for faster response
      // Full pagination takes too long for initial fetch
      if (iterations > 3) break;
    } while (cursor);

    cache.set(CACHE_KEY, allServers, TTL.MCP_REGISTRY);
    return allServers;
  } catch (error) {
    console.error('Error fetching MCP Registry:', error);
    return [];
  }
}

/**
 * Get source status for MCP Registry
 */
export function getMcpRegistrySource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'modelcontextprotocol.io',
    type: 'mcp',
    count: cached?.length || 100,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
