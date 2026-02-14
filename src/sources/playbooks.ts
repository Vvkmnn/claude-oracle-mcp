import { XMLParser } from "fast-xml-parser";
import type { Resource, DataSource } from "../types.js";
import { cache, TTL } from "../cache.js";

const PLAYBOOKS_SITEMAPS = [
  "https://playbooks.com/mcp/sitemap/0.xml",
  "https://playbooks.com/mcp/sitemap/1.xml",
  "https://playbooks.com/mcp/sitemap/2.xml",
];
const CACHE_KEY = "playbooks:mcp-servers";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

interface SitemapUrlset {
  urlset: {
    url: SitemapUrl | SitemapUrl[];
  };
}

/**
 * Parse playbooks URL to extract owner and repo name
 */
function parsePlaybooksUrl(url: string): { owner: string; name: string } | null {
  // URL format: https://playbooks.com/mcp/{owner}/{repo-name}
  const match = url.match(/playbooks\.com\/mcp\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  return {
    owner: match[1],
    name: match[2],
  };
}

/**
 * Parse sitemap URL to unified Resource format
 */
function parseUrl(item: SitemapUrl): Resource | null {
  const parsed = parsePlaybooksUrl(item.loc);
  if (!parsed) return null;

  const { owner, name } = parsed;
  const displayName = name
    .replace(/-/g, " ")
    .replace(/mcp/gi, "MCP")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    name: displayName,
    description: `${displayName} MCP server by ${owner}`,
    type: "mcp",
    install_command: `# Visit playbooks.com for install instructions`,
    config_snippet: JSON.stringify(
      {
        mcpServers: {
          [name]: {
            command: "See installation docs",
            args: [],
          },
        },
      },
      null,
      2
    ),
    source: "playbooks.com",
    url: item.loc,
    last_updated: item.lastmod,
  };
}

/**
 * Fetch and parse a single sitemap
 */
async function fetchSitemap(url: string): Promise<Resource[]> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch Playbooks sitemap ${url}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const data = parser.parse(xml) as SitemapUrlset;
    const urls = data.urlset?.url;

    if (!urls) return [];

    const urlArray = Array.isArray(urls) ? urls : [urls];
    const resources = urlArray
      .map(parseUrl)
      .filter((r): r is Resource => r !== null);

    return resources;
  } catch (error) {
    console.error(`Error fetching Playbooks sitemap ${url}:`, error);
    return [];
  }
}

/**
 * Fetch all MCP servers from Playbooks sitemaps
 */
export async function fetchPlaybooksServers(): Promise<Resource[]> {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  if (cached) return cached;

  try {
    const results = await Promise.all(
      PLAYBOOKS_SITEMAPS.map(fetchSitemap)
    );

    const allServers = results.flat();
    cache.set(CACHE_KEY, allServers, TTL.PLAYBOOKS);
    return allServers;
  } catch (error) {
    console.error("Error fetching Playbooks servers:", error);
    return [];
  }
}

/**
 * Get source status for Playbooks
 */
export function getPlaybooksSource(): DataSource {
  const cached = cache.get<Resource[]>(CACHE_KEY);
  return {
    name: "playbooks.com",
    type: "mcp",
    count: cached?.length || 0,
    last_updated: cached ? new Date().toISOString() : "never",
    status: cached ? "ok" : "stale",
  };
}
