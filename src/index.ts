#!/usr/bin/env node

import { createRequire } from 'module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { search, browse, getSources } from './sources/aggregator.js';
import type { SearchInput, BrowseInput } from './types.js';
import { formatSearchResults, formatBrowseResults, formatSources } from './formatter.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new Server(
  {
    name: 'claude-oracle-mcp',
    version,
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      'Claude Oracle discovers skills, plugins, and MCP servers from 17 sources. Use "search" to find tools by query, "browse" to explore by category, and "sources" to check data source status.',
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search',
        description:
          'Search for Claude Code skills, plugins, and MCP servers. Returns install commands.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Search term or description',
            },
            type: {
              type: 'string',
              enum: ['skill', 'plugin', 'mcp', 'all'],
              description: 'Filter by resource type (default: all)',
            },
            semantic: {
              type: 'boolean',
              description: 'Use AI semantic search (requires SKILLSMP_API_KEY)',
            },
            limit: {
              type: 'number',
              description: 'Max results (default: 5, max: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'browse',
        description: 'Browse skills, plugins, and MCP servers by category or popularity.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            category: {
              type: 'string',
              description: 'Category filter (e.g., testing, database, security)',
            },
            type: {
              type: 'string',
              enum: ['skill', 'plugin', 'mcp', 'all'],
              description: 'Filter by resource type (default: all)',
            },
            sort: {
              type: 'string',
              enum: ['popular', 'recent'],
              description: 'Sort order (default: popular)',
            },
            limit: {
              type: 'number',
              description: 'Max results (default: 10)',
            },
          },
        },
      },
      {
        name: 'sources',
        description: 'Show available data sources and their status.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search': {
        const input = (args ?? {}) as unknown as SearchInput;
        if (!input.query) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: query parameter is required',
              },
            ],
          };
        }

        const result = await search({
          query: input.query,
          type: input.type || 'all',
          semantic: input.semantic || false,
          limit: Math.min(input.limit || 5, 20),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatSearchResults(result),
            },
          ],
        };
      }

      case 'browse': {
        const input = (args ?? {}) as unknown as BrowseInput;
        const result = await browse({
          category: input.category,
          type: input.type || 'all',
          sort: input.sort || 'popular',
          limit: Math.min(input.limit || 10, 20),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatBrowseResults(result, input.category),
            },
          ],
        };
      }

      case 'sources': {
        const { sources, total } = getSources();

        return {
          content: [
            {
              type: 'text' as const,
              text: formatSources(sources, total),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text' as const,
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${message}`,
        },
      ],
    };
  }
});

// Start server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('claude-oracle MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
