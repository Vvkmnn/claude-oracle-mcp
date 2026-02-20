import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const AWESOME_CC_URL =
  'https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/README.md';
const CACHE_KEY = 'awesome:claude-code';

/**
 * Parse markdown table row to extract name, description, and URL
 * Handles formats like: | [Name](url) | description |
 */
function parseMarkdownRow(
  row: string
): { name: string; url: string; description: string; type?: string } | null {
  // Match: | [Name](url) | description | type |
  const linkMatch = row.match(/\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|([^|]*)\|?([^|]*)?/);
  if (linkMatch) {
    return {
      name: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
      description: linkMatch[3].trim(),
      type: linkMatch[4]?.trim().toLowerCase(),
    };
  }

  return null;
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
 * Determine resource type from URL or context
 */
function inferType(url: string, name: string): 'skill' | 'plugin' | 'mcp' {
  const urlLower = url.toLowerCase();
  const nameLower = name.toLowerCase();

  if (urlLower.includes('/skills/') || nameLower.includes('skill')) {
    return 'skill';
  }
  if (
    urlLower.includes('/plugins/') ||
    urlLower.includes('.claude-plugin') ||
    nameLower.includes('plugin')
  ) {
    return 'plugin';
  }
  return 'skill'; // Default for awesome-claude-code
}

/**
 * Extract resources from markdown content
 */
function parseMarkdown(content: string): Resource[] {
  const resources: Resource[] = [];
  const lines = content.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    // Try table format first
    let parsed = parseMarkdownRow(line);

    // Try list format
    if (!parsed) {
      const listItem = parseMarkdownListItem(line);
      if (listItem) {
        parsed = { ...listItem, type: undefined };
      }
    }

    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());

      // Infer type if not explicitly provided
      const type =
        parsed.type === 'plugin'
          ? 'plugin'
          : parsed.type === 'skill'
            ? 'skill'
            : parsed.type === 'mcp'
              ? 'mcp'
              : inferType(parsed.url, parsed.name);

      // Generate install command based on type
      let install_command: string;
      let config_snippet: string | undefined;

      if (type === 'skill') {
        // Extract repo from GitHub URL
        const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
        const skillMatch = parsed.url.match(/\/skills\/([^/]+)/);

        if (repoMatch && skillMatch) {
          install_command = `npx skills add ${repoMatch[1]} --skill ${skillMatch[1]} --global --agent claude-code`;
        } else {
          install_command = `See: ${parsed.url}`;
        }
      } else if (type === 'plugin') {
        const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
        if (repoMatch) {
          install_command = `/plugin install ${parsed.name}@github`;
        } else {
          install_command = `See: ${parsed.url}`;
        }
      } else {
        // MCP server
        const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
        const repo = repoMatch ? repoMatch[1] : parsed.name;
        install_command = `npx -y ${repo}`;
        config_snippet = JSON.stringify(
          {
            mcpServers: {
              [parsed.name.toLowerCase().replace(/\s+/g, '-')]: {
                command: 'npx',
                args: ['-y', repo],
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
        source: 'awesome-claude-code',
        url: parsed.url,
      });
    }
  }

  return resources;
}

/**
 * Fetch awesome-claude-code resources
 */
export async function fetchAwesomeClaudeCode(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(AWESOME_CC_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch awesome-claude-code: ${response.status}`);
      return [];
    }

    const content = await response.text();
    const resources = parseMarkdown(content);

    cache.set(CACHE_KEY, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error('Error fetching awesome-claude-code:', error);
    return [];
  }
}

/**
 * Get source status for awesome-claude-code
 */
export function getAwesomeClaudeCodeSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'awesome-claude-code',
    type: 'skill',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
