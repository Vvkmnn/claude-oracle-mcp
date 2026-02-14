import type { Resource, DataSource } from "../types.js";
import { cache, TTL } from "../cache.js";

const WONG2_URL = "https://raw.githubusercontent.com/wong2/awesome-mcp-servers/main/README.md";
const CACHE_KEY = "awesome-mcp-wong2";

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
function parseMarkdown(content: string): Resource[] {
  const resources: Resource[] = [];
  const lines = content.split("\n");
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseMarkdownListItem(line);

    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());

      // Generate install command based on GitHub URL
      let install_command: string;
      let config_snippet: string | undefined;

      // Extract repo from GitHub URL
      const repoMatch = parsed.url.match(/github\.com\/([^/]+\/[^/]+)/);

      if (repoMatch) {
        const repo = repoMatch[1].replace(/\.git$/, "");
        install_command = `# See ${parsed.url} for installation instructions`;

        // Try to infer package name from repo
        const packageName = repo.split("/")[1];
        config_snippet = JSON.stringify(
          {
            mcpServers: {
              [packageName]: {
                command: "See repository for installation",
                args: [],
              },
            },
          },
          null,
          2
        );
      } else {
        install_command = `See: ${parsed.url}`;
      }

      resources.push({
        name: parsed.name,
        description: parsed.description || "No description",
        type: "mcp",
        install_command,
        config_snippet,
        source: "wong2/awesome-mcp-servers",
        url: parsed.url,
      });
    }
  }

  return resources;
}

/**
 * Fetch wong2/awesome-mcp-servers resources
 */
export async function fetchWong2AwesomeMcp(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const response = await fetch(WONG2_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch wong2/awesome-mcp-servers: ${response.status}`);
      return [];
    }

    const markdown = await response.text();
    const resources = parseMarkdown(markdown);

    cache.set(CACHE_KEY, resources, TTL.AWESOME_LISTS);
    return resources;
  } catch (error) {
    console.error("Error fetching wong2/awesome-mcp-servers:", error);
    return [];
  }
}

/**
 * Get source status for wong2/awesome-mcp-servers
 */
export function getWong2AwesomeMcpSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: "wong2/awesome-mcp-servers",
    type: "mcp",
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : "never",
    status: cached ? "ok" : "stale",
  };
}
