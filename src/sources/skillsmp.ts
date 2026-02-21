import type { Resource, DataSource, SkillsmpResponse, SkillsmpResult } from '../types.js';
import { cache, TTL } from '../cache.js';

const SKILLSMP_BASE_URL = 'https://skillsmp.com/api/v1/skills';

/**
 * Get API key from environment
 */
function getApiKey(): string | undefined {
  return process.env.SKILLSMP_API_KEY;
}

/**
 * Check if SkillsMP is available (API key present)
 */
export function isSkillsmpAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Parse SkillsMP result to unified Resource format
 */
function parseSkillsmpResult(result: SkillsmpResult): Resource {
  const marketplace = result.marketplace || 'skillsmp';

  return {
    name: result.name,
    description: result.description?.slice(0, 200) || 'No description',
    type: 'skill',
    install_command: `/plugin install ${result.name}@${marketplace}`,
    source: 'skillsmp',
    url: result.github_url,
    category: result.category,
    stars: result.rating, // Use rating as quality signal; downloads tracked separately
    popularity_score: result.downloads,
  };
}

/**
 * Search SkillsMP for skills
 */
export async function searchSkillsmp(
  query: string,
  options: { semantic?: boolean; limit?: number } = {},
): Promise<Resource[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  const { semantic = false, limit = 10 } = options;
  const cacheKey = `skillsmp:${semantic ? 'ai' : 'kw'}:${query}:${limit}`;

  const cached = cache.get<Resource[]>(cacheKey);
  if (cached) return cached;

  try {
    const endpoint = semantic ? 'ai-search' : 'search';
    const url = `${SKILLSMP_BASE_URL}/${endpoint}?q=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('SkillsMP: Invalid API key');
      } else {
        console.error(`SkillsMP error: ${response.status}`);
      }
      return [];
    }

    const data = (await response.json()) as SkillsmpResponse;
    const skills = data.results?.map(parseSkillsmpResult) || [];

    cache.set(cacheKey, skills, TTL.SKILLSMP);
    return skills;
  } catch (error) {
    console.error('Error searching SkillsMP:', error);
    return [];
  }
}

/**
 * Get source status for SkillsMP
 */
export function getSkillsmpSource(): DataSource {
  const hasKey = isSkillsmpAvailable();
  return {
    name: 'skillsmp',
    type: 'skill' as const,
    count: hasKey ? 25000 : 0, // Estimated
    last_updated: new Date().toISOString(),
    status: hasKey ? ('ok' as const) : ('no_key' as const),
  };
}
