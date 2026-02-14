import type { Resource, ResourceType, DataSource, SearchInput, SearchOutput, BrowseInput } from "../types.js";
import { fetchGithubPlugins, getGithubPluginsSources } from "./github-plugins.js";
import { fetchGlamaMcpServers, getGlamaSource } from "./glama.js";
import { fetchAwesomeLists, getAwesomeListsSources } from "./awesome-lists.js";
import { searchSkillsmp, getSkillsmpSource, isSkillsmpAvailable } from "./skillsmp.js";
import { fetchSmitheryServers, getSmitherySource } from "./smithery.js";
import { fetchMcpRegistry, getMcpRegistrySource } from "./mcp-registry.js";
import { fetchNpmMcpPackages, fetchNpmPluginPackages, getNpmMcpSource, getNpmPluginSource } from "./npm-registry.js";
import { fetchAwesomeClaudeCode, getAwesomeClaudeCodeSource } from "./awesome-claude-code.js";
import { fetchAwesomeSkills, getAwesomeSkillsSource } from "./awesome-skills.js";
import { fetchPlaybooksServers, getPlaybooksSource } from "./playbooks.js";
import { fetchWong2AwesomeMcp, getWong2AwesomeMcpSource } from "./awesome-mcp-wong2.js";
import { fetchJmanAwesomeClaude, getJmanAwesomeClaudeSource } from "./awesome-claude-jman.js";
import { fetchCollabnixAwesomeMcp, getCollabnixAwesomeMcpSource } from "./awesome-mcp-collabnix.js";

/**
 * Simple fuzzy matching score
 */
function matchScore(query: string, resource: Resource): number {
  // Defensive null checks
  if (!query || !resource || !resource.name || !resource.description) {
    return 0;
  }

  const q = query.toLowerCase();
  const name = resource.name.toLowerCase();
  const desc = resource.description.toLowerCase();
  const category = resource.category?.toLowerCase() || "";
  const keywords = resource.keywords?.map((k) => k?.toLowerCase() || "").filter(k => k) || [];

  let score = 0;

  // Exact name match
  if (name === q) score += 100;
  // Name starts with query
  else if (name.startsWith(q)) score += 50;
  // Name contains query
  else if (name.includes(q)) score += 30;

  // Description contains query
  if (desc.includes(q)) score += 20;

  // Category match
  if (category.includes(q)) score += 15;

  // Keyword match
  for (const kw of keywords) {
    if (kw.includes(q) || q.includes(kw)) score += 10;
  }

  // Boost by quality signals
  if (resource.stars) score += Math.min(resource.stars / 100, 10);

  return score;
}

/**
 * Filter resources by type
 */
function filterByType(resources: Resource[], type: ResourceType | "all"): Resource[] {
  if (type === "all") return resources;
  return resources.filter((r) => r.type === type);
}

/**
 * Deduplicate resources by name + type
 */
function deduplicate(resources: Resource[]): Resource[] {
  const seen = new Map<string, Resource>();

  for (const resource of resources) {
    // Skip resources with invalid name or description
    if (!resource.name || !resource.description || !resource.type) {
      continue;
    }

    const key = `${resource.type}:${resource.name.toLowerCase()}`;
    const existing = seen.get(key);

    // Keep the one with more info (longer description or more metadata)
    if (!existing || resource.description.length > existing.description.length) {
      seen.set(key, resource);
    }
  }

  return Array.from(seen.values());
}

/**
 * Fetch all resources from all free sources
 */
async function fetchAllResources(): Promise<Resource[]> {
  const results = await Promise.allSettled([
    fetchGithubPlugins(),
    fetchGlamaMcpServers(),
    fetchAwesomeLists(),
    fetchSmitheryServers(),
    fetchMcpRegistry(),
    fetchNpmMcpPackages(),
    fetchNpmPluginPackages(),
    fetchAwesomeClaudeCode(),
    fetchAwesomeSkills(),
    fetchPlaybooksServers(),
    fetchWong2AwesomeMcp(),
    fetchJmanAwesomeClaude(),
    fetchCollabnixAwesomeMcp(),
  ]);

  const allResources: Resource[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allResources.push(...result.value);
    } else {
      console.error("Source fetch failed:", result.reason);
    }
  }

  // Filter for valid resources with non-empty name and description
  return deduplicate(allResources).filter(
    r => typeof r.name === "string" && r.name.trim() !== "" &&
         typeof r.description === "string" && r.description.trim() !== ""
  );
}

/**
 * Search across all sources
 */
export async function search(input: SearchInput): Promise<SearchOutput> {
  const { query, type = "all", semantic = false, limit = 5 } = input;
  const sourcesSearched: string[] = [];
  let results: Resource[] = [];
  let cached = true;

  // If semantic search requested and SkillsMP available, search there first
  if (semantic && isSkillsmpAvailable()) {
    const skillsmpResults = await searchSkillsmp(query, { semantic: true, limit });
    results.push(...skillsmpResults);
    sourcesSearched.push("skillsmp (semantic)");
  }

  // Fetch all free sources
  const allResources = await fetchAllResources();
  sourcesSearched.push(
    "github-plugins",
    "glama.ai",
    "awesome-lists",
    "smithery.ai",
    "modelcontextprotocol.io",
    "npmjs.com",
    "awesome-claude-code",
    "awesome-agent-skills",
    "playbooks.com",
    "wong2/awesome-mcp-servers",
    "jmanhype/awesome-claude-code",
    "collabnix/awesome-mcp-lists"
  );

  // Filter by type
  const filtered = filterByType(allResources, type);

  // Score and sort by relevance
  const scored = filtered
    .map((r) => ({ resource: r, score: matchScore(query, r) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ resource }) => resource);

  // Merge with SkillsMP results (interleave for variety)
  const merged: Resource[] = [];
  const maxLen = Math.max(results.length, scored.length);
  for (let i = 0; i < maxLen && merged.length < limit; i++) {
    if (i < results.length) merged.push(results[i]);
    if (i < scored.length && merged.length < limit) merged.push(scored[i]);
  }

  // Final deduplication
  const finalResults = deduplicate(merged).slice(0, limit);

  return {
    results: finalResults,
    sources_searched: sourcesSearched,
    total_available: allResources.length,
    cached,
  };
}

/**
 * Browse by category or list popular items
 */
export async function browse(input: BrowseInput): Promise<SearchOutput> {
  const { category, type = "all", sort = "popular", limit = 10 } = input;
  const sourcesSearched: string[] = [
    "github-plugins",
    "glama.ai",
    "awesome-lists",
    "smithery.ai",
    "modelcontextprotocol.io",
    "npmjs.com",
    "awesome-claude-code",
    "awesome-agent-skills",
    "playbooks.com",
    "wong2/awesome-mcp-servers",
    "jmanhype/awesome-claude-code",
    "collabnix/awesome-mcp-lists",
  ];

  const allResources = await fetchAllResources();
  let filtered = filterByType(allResources, type);

  // Filter by category if specified
  if (category) {
    const cat = category.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.category?.toLowerCase().includes(cat) ||
        r.keywords?.some((k) => k?.toLowerCase().includes(cat))
    );
  }

  // Sort
  if (sort === "popular") {
    filtered.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (sort === "recent") {
    filtered.sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA;
    });
  }

  return {
    results: filtered.slice(0, limit),
    sources_searched: sourcesSearched,
    total_available: allResources.length,
    cached: true,
  };
}

/**
 * Get all data source statuses
 */
export function getSources(): { sources: DataSource[]; total: number } {
  const sources: DataSource[] = [
    ...getGithubPluginsSources(),
    getGlamaSource(),
    ...getAwesomeListsSources(),
    getSkillsmpSource(),
    getSmitherySource(),
    getMcpRegistrySource(),
    getNpmMcpSource(),
    getNpmPluginSource(),
    getAwesomeClaudeCodeSource(),
    getAwesomeSkillsSource(),
    getPlaybooksSource(),
    getWong2AwesomeMcpSource(),
    getJmanAwesomeClaudeSource(),
    getCollabnixAwesomeMcpSource(),
  ];

  const total = sources.reduce((sum, s) => sum + s.count, 0);

  return { sources, total };
}
