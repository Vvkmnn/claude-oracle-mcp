import type { Resource, DataSource } from '../types.js';
import { cache, TTL } from '../cache.js';

const AWESOME_SKILLS_URL =
  'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md';
const CACHE_KEY = 'awesome:agent-skills';

/**
 * Parse markdown table row to extract name, description, and URL
 * Handles formats like: | [Name](url) | description |
 */
function parseMarkdownRow(row: string): { name: string; url: string; description: string } | null {
  // Match: | [Name](url) | description |
  const linkMatch = row.match(/\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|([^|]*)\|?/);
  if (linkMatch) {
    return {
      name: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
      description: linkMatch[3].trim(),
    };
  }

  // Match: | Name | description | url |
  const plainMatch = row.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|?/);
  if (plainMatch) {
    const url = plainMatch[3].trim();
    if (url.startsWith('http')) {
      return {
        name: plainMatch[1].trim(),
        description: plainMatch[2].trim(),
        url,
      };
    }
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
      parsed = parseMarkdownListItem(line);
    }

    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());

      // Generate install command
      let install_command: string;

      // Extract repo and skill name from GitHub URL
      const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
      const skillMatch = parsed.url.match(/\/skills\/([^/]+)/);

      if (repoMatch && skillMatch) {
        install_command = `npx skills add ${repoMatch[1]} --skill ${skillMatch[1]} --global --agent claude-code`;
      } else if (repoMatch) {
        // Generic repo install
        install_command = `npx skills add ${repoMatch[1]} --global --agent claude-code`;
      } else {
        install_command = `See: ${parsed.url}`;
      }

      resources.push({
        name: parsed.name,
        description: parsed.description || 'No description',
        type: 'skill',
        install_command,
        source: 'awesome-agent-skills',
        url: parsed.url,
      });
    }
  }

  return resources;
}

/**
 * Fetch awesome-agent-skills resources
 */
export async function fetchAwesomeSkills(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(AWESOME_SKILLS_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch awesome-agent-skills: ${response.status}`);
      return [];
    }

    const content = await response.text();
    const resources = parseMarkdown(content);

    cache.set(CACHE_KEY, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error('Error fetching awesome-agent-skills:', error);
    return [];
  }
}

/**
 * Get source status for awesome-agent-skills
 */
export function getAwesomeSkillsSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: 'awesome-agent-skills',
    type: 'skill',
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : 'never',
    status: cached ? 'ok' : 'stale',
  };
}
