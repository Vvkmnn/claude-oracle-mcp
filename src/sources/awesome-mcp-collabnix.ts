import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const COLLABNIX_URL =
  'https://raw.githubusercontent.com/collabnix/awesome-mcp-lists/main/README.md';
const CACHE_KEY = 'awesome-mcp-collabnix';

/**
 * Parse markdown list item
 * Handles formats like: - [Name](url) - description
 */
function parseMarkdownListItem(
  line: string
): { name: string; url: string; description: string } | null {
  // Match: - [Name](url) - description OR * [Name](url) - description
  const match = line.match(/^[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*[-–—]?\s*(.*)$/);
  if (match) {
    return {
      name: match[1].trim(),
      url: match[2].trim(),
      description: match[3].trim(),
    };
  }
  return null;
}

/**
 * Extract resources from markdown content
 */
function parseMarkdown(content: string): Resource[] {
  const resources: Resource[] = [];
  const lines = content.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseMarkdownListItem(line);

    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());

      // Generate install command
      let install_command: string;
      let config_snippet: string | undefined;

      // Check if it's a Docker-based MCP (collabnix focuses on containerized)
      const isDocker =
        parsed.url.includes('docker') ||
        parsed.description.toLowerCase().includes('docker') ||
        parsed.description.toLowerCase().includes('container');

      if (isDocker) {
        install_command = `# See ${parsed.url} for Docker installation`;
        const packageName = parsed.name.toLowerCase().replace(/\s+/g, '-');
        config_snippet = JSON.stringify(
          {
            mcpServers: {
              [packageName]: {
                command: 'docker',
                args: ['run', '-i', 'See repository'],
              },
            },
          },
          null,
          2
        );
      } else {
        install_command = `# See ${parsed.url} for installation instructions`;
        const packageName = parsed.name.toLowerCase().replace(/\s+/g, '-');
        config_snippet = JSON.stringify(
          {
            mcpServers: {
              [packageName]: {
                command: 'See repository',
                args: [],
              },
            },
          },
          null,
          2
        );
      }

      resources.push({
        name: parsed.name,
        description: parsed.description || 'No description',
        type: 'mcp',
        install_command,
        config_snippet,
        source: 'collabnix/awesome-mcp-lists',
        url: parsed.url,
        keywords: isDocker ? ['docker', 'container'] : undefined,
      });
    }
  }

  return resources;
}

/**
 * Fetch collabnix/awesome-mcp-lists resources
 */
export async function fetchCollabnixAwesomeMcp(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(COLLABNIX_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch collabnix/awesome-mcp-lists: ${response.status}`);
      return [];
    }

    const markdown = await response.text();
    const resources = parseMarkdown(markdown);

    cache.set(CACHE_KEY, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error('Error fetching collabnix/awesome-mcp-lists:', error);
    return [];
  }
}

/**
 * Get source status for collabnix/awesome-mcp-lists
 */
export function getCollabnixAwesomeMcpSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'collabnix/awesome-mcp-lists',
    type: 'mcp',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
