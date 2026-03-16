#!/usr/bin/env node

import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { search, browse, getSources } from './sources/aggregator.js';
import type { SearchInput, BrowseInput } from './types.js';
import { formatSearchResults, formatBrowseResults, formatSources } from './formatter.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new McpServer(
  {
    name: 'claude-oracle-mcp',
    version,
    title: 'Claude Oracle',
    description: 'Skill, plugin, and MCP server discovery across 17 registries',
  },
  {
    instructions:
      'Claude Oracle discovers skills, plugins, and MCP servers from 17 sources. Use "search" to find tools by query, "browse" to explore by category, and "sources" to check data source status.',
  },
);

// ── search ───────────────────────────────────────────────────────

server.registerTool(
  'search',
  {
    title: 'Search Tools',
    description:
      'Search for Claude Code skills, plugins, and MCP servers. Returns install commands.',
    inputSchema: {
      query: z.string().describe('Search term or description'),
      type: z
        .enum(['skill', 'plugin', 'mcp', 'all'])
        .optional()
        .describe('Filter by resource type (default: all)'),
      semantic: z
        .boolean()
        .optional()
        .describe('Use AI semantic search (requires SKILLSMP_API_KEY)'),
      limit: z.number().optional().describe('Max results (default: 5, max: 20)'),
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const input = args as unknown as SearchInput;
      if (!input.query) {
        return {
          content: [{ type: 'text' as const, text: 'Error: query parameter is required' }],
          isError: true,
        };
      }

      const result = await search({
        query: input.query,
        type: input.type || 'all',
        semantic: input.semantic || false,
        limit: Math.min(input.limit || 5, 20),
      });

      return {
        content: [{ type: 'text' as const, text: formatSearchResults(result) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// ── browse ───────────────────────────────────────────────────────

server.registerTool(
  'browse',
  {
    title: 'Browse Tools',
    description: 'Browse skills, plugins, and MCP servers by category or popularity.',
    inputSchema: {
      category: z
        .string()
        .optional()
        .describe('Category filter (e.g., testing, database, security)'),
      type: z
        .enum(['skill', 'plugin', 'mcp', 'all'])
        .optional()
        .describe('Filter by resource type (default: all)'),
      sort: z.enum(['popular', 'recent']).optional().describe('Sort order (default: popular)'),
      limit: z.number().optional().describe('Max results (default: 10)'),
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const input = args as unknown as BrowseInput;
      const result = await browse({
        category: input.category,
        type: input.type || 'all',
        sort: input.sort || 'popular',
        limit: Math.min(input.limit || 10, 20),
      });

      return {
        content: [{ type: 'text' as const, text: formatBrowseResults(result, input.category) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// ── sources ──────────────────────────────────────────────────────

server.registerTool(
  'sources',
  {
    title: 'Data Sources',
    description: 'Show available data sources and their status.',
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  async () => {
    try {
      const { sources, total } = getSources();
      return {
        content: [{ type: 'text' as const, text: formatSources(sources, total) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// ── Start server ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('claude-oracle MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
