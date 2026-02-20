import type { CacheEntry } from './types.js';

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache value with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { entries: number; keys: string[] } {
    return {
      entries: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton cache instance
export const cache = new Cache();

// TTL constants
export const TTL = {
  PLUGINS: 24 * 60 * 60 * 1000, // 24 hours
  MCP_SERVERS: 6 * 60 * 60 * 1000, // 6 hours
  AWESOME_LISTS: 12 * 60 * 60 * 1000, // 12 hours
  SKILLSMP: 60 * 60 * 1000, // 1 hour
  SMITHERY: 6 * 60 * 60 * 1000, // 6 hours
  MCP_REGISTRY: 6 * 60 * 60 * 1000, // 6 hours
  NPM_REGISTRY: 12 * 60 * 60 * 1000, // 12 hours
  PLAYBOOKS: 12 * 60 * 60 * 1000, // 12 hours
} as const;
