import type { Resource, ResourceType } from "../types.js";
import { cache, TTL } from "../cache.js";

interface AwesomeListConfig {
  url: string;
  name: string;
  type: ResourceType;
  marketplace?: string;
}

const AWESOME_LISTS: AwesomeListConfig[] = [
  {
    url: "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
    name: "awesome-mcp-servers",
    type: "mcp",
  },
  {
    url: "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md",
    name: "awesome-claude-skills",
    type: "skill",
    marketplace: "github",
  },
];

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
    if (url.startsWith("http")) {
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
function parseMarkdownListItem(line: string): { name: string; url: string; description: string } | null {
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
function parseMarkdown(
  content: string,
  config: AwesomeListConfig
): Resource[] {
  const resources: Resource[] = [];
  const lines = content.split("\n");
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

      // Generate install command based on type
      let install_command: string;
      let config_snippet: string | undefined;

      if (config.type === "mcp") {
        // Extract repo from GitHub URL
        const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);
        const repo = repoMatch ? repoMatch[1] : parsed.name;
        install_command = `npx -y ${repo}`;
        config_snippet = JSON.stringify(
          {
            mcpServers: {
              [parsed.name.toLowerCase().replace(/\s+/g, "-")]: {
                command: "npx",
                args: ["-y", repo],
              },
            },
          },
          null,
          2
        );
      } else if (config.type === "skill" && config.marketplace) {
        install_command = `/plugin install ${parsed.name}@${config.marketplace}`;
      } else {
        install_command = `See: ${parsed.url}`;
      }

      resources.push({
        name: parsed.name,
        description: parsed.description || "No description",
        type: config.type,
        install_command,
        config_snippet,
        source: config.name,
        url: parsed.url,
      });
    }
  }

  return resources;
}

/**
 * Fetch and parse an awesome list
 */
async function fetchAwesomeList(config: AwesomeListConfig): Promise<Resource[]> {
  const cacheKey = `awesome:${config.name}`;
  const cached = cache.get<Resource[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(config.url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
      return [];
    }

    const content = await response.text();
    const resources = parseMarkdown(content, config);

    cache.set(cacheKey, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch all awesome lists
 */
export async function fetchAwesomeLists(): Promise<Resource[]> {
  const results = await Promise.all(AWESOME_LISTS.map(fetchAwesomeList));
  return results.flat();
}

/**
 * Get source status for awesome lists
 */
export function getAwesomeListsSources() {
  return AWESOME_LISTS.map((config) => {
    const cached = cache.get<Resource[]>(`awesome:${config.name}`);
    return {
      name: config.name,
      type: config.type,
      count: cached?.length || 0,
      last_updated: cached ? new Date().toISOString() : "never",
      status: cached ? ("ok" as const) : ("stale" as const),
    };
  });
}
