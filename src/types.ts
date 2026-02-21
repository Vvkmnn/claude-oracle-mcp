/**
 * Resource types supported by claude-oracle
 */
export type ResourceType = 'skill' | 'plugin' | 'mcp';

/**
 * Unified resource schema for skills, plugins, and MCP servers
 */
export interface Resource {
  // Identity
  name: string;
  description: string;
  type: ResourceType;

  // Installation
  install_command: string;
  config_snippet?: string;

  // Metadata
  source: string;
  url?: string;
  category?: string;
  keywords?: string[];
  author?: string;
  version?: string;

  // Quality signals
  stars?: number;
  last_updated?: string;
  verified?: boolean;
  quality_score?: number;
  popularity_score?: number;
}

/**
 * Source status for health checks
 */
export type SourceStatus = 'ok' | 'stale' | 'error' | 'no_key';

/**
 * Data source metadata
 */
export interface DataSource {
  name: string;
  type: ResourceType;
  count: number;
  last_updated: string;
  status: SourceStatus;
}

/**
 * Cache entry with TTL tracking
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Search input parameters
 */
export interface SearchInput {
  query: string;
  type?: ResourceType | 'all';
  semantic?: boolean;
  limit?: number;
}

/**
 * Search output response
 */
export interface SearchOutput {
  results: Resource[];
  sources_searched: string[];
  total_available: number;
}

/**
 * Browse input parameters
 */
export interface BrowseInput {
  category?: string;
  type?: ResourceType | 'all';
  sort?: 'popular' | 'recent';
  limit?: number;
}

/**
 * Sources output response
 */
export interface SourcesOutput {
  sources: DataSource[];
  total: number;
}

/**
 * Marketplace plugin entry (from GitHub marketplace.json)
 */
export interface MarketplacePlugin {
  name: string;
  description?: string;
  version?: string;
  source?: string | { source: string; url: string };
  category?: string;
  keywords?: string[];
  author?: { name: string; email?: string; url?: string };
  repository?: string;
  strict?: boolean;
}

/**
 * Marketplace JSON structure
 */
export interface MarketplaceJson {
  name?: string;
  metadata?: { description?: string; version?: string };
  plugins: MarketplacePlugin[];
}

/**
 * Glama.ai RSS feed item
 */
export interface GlamaRssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  category?: string;
}

/**
 * SkillsMP API response
 */
export interface SkillsmpResult {
  id: string;
  name: string;
  description: string;
  category?: string;
  marketplace?: string;
  github_url?: string;
  rating?: number;
  downloads?: number;
}

export interface SkillsmpResponse {
  results: SkillsmpResult[];
  total: number;
  page: number;
}
