import type {
  Resource,
  ResourceType,
  DataSource,
  SearchInput,
  SearchOutput,
  BrowseInput,
} from '../types.js';
import { fetchGithubPlugins, getGithubPluginsSources } from './github-plugins.js';
import { fetchGlamaMcpServers, getGlamaSource } from './glama.js';
import { fetchAwesomeLists, getAwesomeListsSources } from './awesome-lists.js';
import { searchSkillsmp, getSkillsmpSource, isSkillsmpAvailable } from './skillsmp.js';
import { fetchSmitheryServers, getSmitherySource } from './smithery.js';
import { fetchMcpRegistry, getMcpRegistrySource } from './mcp-registry.js';
import {
  fetchNpmMcpPackages,
  fetchNpmPluginPackages,
  getNpmMcpSource,
  getNpmPluginSource,
} from './npm-registry.js';
import { fetchAwesomeClaudeCode, getAwesomeClaudeCodeSource } from './awesome-claude-code.js';
import { fetchAwesomeSkills, getAwesomeSkillsSource } from './awesome-skills.js';
import { fetchPlaybooksServers, getPlaybooksSource } from './playbooks.js';
import { fetchWong2AwesomeMcp, getWong2AwesomeMcpSource } from './awesome-mcp-wong2.js';
import { fetchJmanAwesomeClaude, getJmanAwesomeClaudeSource } from './awesome-claude-jman.js';
import { fetchCollabnixAwesomeMcp, getCollabnixAwesomeMcpSource } from './awesome-mcp-collabnix.js';
import { searchGithub, getGithubSearchSource, consumeGithubWarning } from './github-search.js';
import { searchWeb, getWebSearchSource } from './web-search.js';

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
  const category = resource.category?.toLowerCase() || '';
  const keywords = resource.keywords?.map((k) => k?.toLowerCase() || '').filter((k) => k) || [];

  let score = 0;

  // Full-query matching (exact multi-word match is high signal)
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 50;
  else if (name.includes(q)) score += 30;

  if (desc.includes(q)) score += 20;
  if (category.includes(q)) score += 15;

  const tokens = q.split(/\s+/).filter((t) => t.length > 0);

  // Keyword matching — for multi-word queries, skip q.includes(kw) since token scoring covers it
  for (const kw of keywords) {
    if (kw.includes(q)) score += 10;
    else if (tokens.length < 2 && q.includes(kw)) score += 10;
  }

  // Per-token scoring for multi-word queries
  // "xcode swift iOS" → score each of "xcode", "swift", "ios" independently
  if (tokens.length >= 2) {
    for (const token of tokens) {
      if (name.includes(token)) score += 15;
      if (desc.includes(token)) score += 8;
      if (category.includes(token)) score += 5;
      if (keywords.some((kw) => kw.includes(token))) score += 5;
    }

    // Token coverage bonus — reward matching ALL query tokens (industry standard #1 signal)
    const matchedTokens = new Set<string>();
    for (const token of tokens) {
      if (
        name.includes(token) ||
        desc.includes(token) ||
        category.includes(token) ||
        keywords.some((kw) => kw.includes(token))
      ) {
        matchedTokens.add(token);
      }
    }
    const coverage = matchedTokens.size / tokens.length;
    if (coverage === 1.0) score *= 1.5;
    else if (coverage >= 0.66) score *= 1.2;
  }

  // Popularity multiplies text relevance (1x–2.5x) — popular tools rank higher
  // when text relevance is close, but can't override poor matches.
  // Uses stars (GitHub) or popularity_score (NPM downloads, SkillsMP) as fallback.
  const popularity = resource.stars || resource.popularity_score || 0;
  if (score > 0 && popularity > 0) {
    score *= 1 + Math.min(Math.log10(popularity) * 0.35, 1.5);
  }

  return score;
}

/**
 * Filter resources by type
 */
function filterByType(resources: Resource[], type: ResourceType | 'all'): Resource[] {
  if (type === 'all') return resources;
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
    if (result.status === 'fulfilled') {
      allResources.push(...result.value);
    } else {
      console.error('Source fetch failed:', result.reason);
    }
  }

  // Filter for valid resources with non-empty name and description
  return deduplicate(allResources).filter(
    (r) =>
      typeof r.name === 'string' &&
      r.name.trim() !== '' &&
      typeof r.description === 'string' &&
      r.description.trim() !== '',
  );
}

/**
 * Search across all sources
 */
export async function search(input: SearchInput): Promise<SearchOutput> {
  const { query, type = 'all', semantic = false, limit = 5 } = input;
  const sourcesSearched: string[] = [];
  const results: Resource[] = [];
  // If semantic search requested and SkillsMP available, search there first
  if (semantic && isSkillsmpAvailable()) {
    const skillsmpResults = await searchSkillsmp(query, { semantic: true, limit });
    results.push(...skillsmpResults);
    sourcesSearched.push('skillsmp (semantic)');
  }

  // Fetch registry sources + query-based sources in parallel
  const [registryResult, githubResult, webResult] = await Promise.allSettled([
    fetchAllResources(),
    searchGithub(query),
    searchWeb(query),
  ]);

  const allResources = registryResult.status === 'fulfilled' ? registryResult.value : [];
  const githubResources = githubResult.status === 'fulfilled' ? githubResult.value : [];
  const webResources = webResult.status === 'fulfilled' ? webResult.value : [];

  if (registryResult.status === 'rejected')
    console.error('Registry fetch failed:', registryResult.reason);
  if (githubResult.status === 'rejected')
    console.error('GitHub search failed:', githubResult.reason);
  if (webResult.status === 'rejected') console.error('Web search failed:', webResult.reason);

  sourcesSearched.push(
    'github-plugins',
    'glama.ai',
    'awesome-lists',
    'smithery.ai',
    'modelcontextprotocol.io',
    'npmjs.com',
    'awesome-claude-code',
    'awesome-agent-skills',
    'playbooks.com',
    'wong2/awesome-mcp-servers',
    'jmanhype/awesome-claude-code',
    'collabnix/awesome-mcp-lists',
    'github (search)',
    'web (search)',
  );

  // Filter by type
  const filtered = filterByType(allResources, type);
  const filteredGithub = filterByType(githubResources, type);
  const filteredWeb = filterByType(webResources, type);

  // Score registry + GitHub results at normal priority
  const scored = [...filtered, ...filteredGithub]
    .map((r) => ({ resource: r, score: matchScore(query, r) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ resource }) => resource);

  // Score web results with 0.5x penalty — they fill gaps, not compete
  const scoredWeb = filteredWeb
    .map((r) => ({ resource: r, score: matchScore(query, r) * 0.5 }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ resource }) => resource);

  // Merge: SkillsMP interleaved with scored, then web results at the end
  const merged: Resource[] = [];
  const maxLen = Math.max(results.length, scored.length);
  for (let i = 0; i < maxLen && merged.length < limit; i++) {
    if (i < results.length) merged.push(results[i]!);
    if (i < scored.length && merged.length < limit) merged.push(scored[i]!);
  }
  // Append web results — they only surface when registries have gaps
  for (const wr of scoredWeb) {
    if (merged.length >= limit) break;
    merged.push(wr);
  }

  // Final deduplication
  const finalResults = deduplicate(merged).slice(0, limit);

  // Surface GitHub rate-limit warnings to the user
  const warnings: string[] = [];
  const ghWarning = consumeGithubWarning();
  if (ghWarning) warnings.push(ghWarning);

  return {
    results: finalResults,
    sources_searched: sourcesSearched,
    total_available: allResources.length,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

/**
 * Browse by category or list popular items
 */
export async function browse(input: BrowseInput): Promise<SearchOutput> {
  const { category, type = 'all', sort = 'popular', limit = 10 } = input;
  const sourcesSearched: string[] = [
    'github-plugins',
    'glama.ai',
    'awesome-lists',
    'smithery.ai',
    'modelcontextprotocol.io',
    'npmjs.com',
    'awesome-claude-code',
    'awesome-agent-skills',
    'playbooks.com',
    'wong2/awesome-mcp-servers',
    'jmanhype/awesome-claude-code',
    'collabnix/awesome-mcp-lists',
  ];

  const allResources = await fetchAllResources();
  let filtered = filterByType(allResources, type);

  // Filter by category if specified
  if (category) {
    const cat = category.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.category?.toLowerCase().includes(cat) ||
        r.keywords?.some((k) => k?.toLowerCase().includes(cat)),
    );
  }

  // Sort
  if (sort === 'popular') {
    filtered.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (sort === 'recent') {
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
    getGithubSearchSource(),
    getWebSearchSource(),
  ];

  const total = sources.reduce((sum, s) => sum + s.count, 0);

  return { sources, total };
}
