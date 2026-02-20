import type { Resource, ResourceType, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const JMAN_URL = 'https://raw.githubusercontent.com/jmanhype/awesome-claude-code/main/README.md';
const CACHE_KEY = 'awesome-claude-jman';

/**
 * Infer type from URL
 */
function inferType(url: string): ResourceType {
  if (url.includes('/skills/') || url.includes('skill')) return 'skill';
  if (url.includes('/plugins/') || url.includes('plugin')) return 'plugin';
  if (url.includes('mcp') || url.includes('model-context-protocol')) return 'mcp';
  return 'plugin'; // default for claude-code resources
}

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

      const type = inferType(parsed.url);

      // Generate install command
      let install_command: string;
      let config_snippet: string | undefined;

      if (type === 'skill') {
        const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
        const skillMatch = parsed.url.match(/\/skills\/([^/]+)/);

        if (repoMatch && skillMatch) {
          install_command = `npx skills add ${repoMatch[1]} --skill ${skillMatch[1]} --global --agent claude-code`;
        } else if (repoMatch) {
          install_command = `npx skills add ${repoMatch[1]} --global --agent claude-code`;
        } else {
          install_command = `See: ${parsed.url}`;
        }
      } else if (type === 'plugin') {
        install_command = `/plugin install ${parsed.name}`;
      } else {
        // MCP server
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
        type,
        install_command,
        config_snippet,
        source: 'jmanhype/awesome-claude-code',
        url: parsed.url,
      });
    }
  }

  return resources;
}

/**
 * Fetch jmanhype/awesome-claude-code resources
 */
export async function fetchJmanAwesomeClaude(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(JMAN_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch jmanhype/awesome-claude-code: ${response.status}`);
      return [];
    }

    const markdown = await response.text();
    const resources = parseMarkdown(markdown);

    cache.set(CACHE_KEY, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error('Error fetching jmanhype/awesome-claude-code:', error);
    return [];
  }
}

/**
 * Get source status for jmanhype/awesome-claude-code
 */
export function getJmanAwesomeClaudeSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'jmanhype/awesome-claude-code',
    type: 'plugin',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
