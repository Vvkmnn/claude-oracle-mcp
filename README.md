# claude-oracle-mcp

![claude-oracle-mcp](demo/demo.gif)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for discovering [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills, plugins, and MCP servers. Search 15,000+ resources from 17 sources with zero setup.

[![npm version](https://img.shields.io/npm/v/claude-oracle-mcp.svg)](https://www.npmjs.com/package/claude-oracle-mcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/) [![Claude](https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff)](#) [![GitHub stars](https://img.shields.io/github/stars/Vvkmnn/claude-oracle-mcp?style=social)](https://github.com/Vvkmnn/claude-oracle-mcp)

## install

Requirements:

> [Claude Code](https://claude.ai/code)

**From shell:**

```bash
claude mcp add claude-oracle-mcp -- npx claude-oracle-mcp
```

**From inside Claude** (restart required):

```
Add this to our global mcp config: npx claude-oracle-mcp

Install this mcp: https://github.com/Vvkmnn/claude-oracle-mcp
```

**From any manually configurable `mcp.json`**: (Cursor, Windsurf, etc.)

```json
{
  "mcpServers": {
    "claude-oracle-mcp": {
      "command": "npx",
      "args": ["claude-oracle-mcp"],
      "env": {
        "SKILLSMP_API_KEY": "optional-for-semantic-search"
      }
    }
  }
}
```

That's it; there is **no `npm install` required** as there are no external dependencies or local databases, only search algorithms.

However, in the unlikely event that you pull the wrong package / `npx` registry is out of date, you can force resolution issues in certain environments with:

```bash
npm install -g claude-oracle-mcp
```

## skill

Optionally, install the skill to teach Claude when to proactively use oracle:

```bash
npx skills add Vvkmnn/claude-oracle-mcp --skill claude-oracle --global
```

This makes Claude automatically search for relevant tools before planning, when encountering errors, or at session start. The MCP works without the skill, but the skill improves discoverability.

## features

[MCP server](https://modelcontextprotocol.io/) that gives Claude access to 15,000+ skills, plugins, and MCP servers from 17 sources. Fast discovery with smart prioritization.

Runs locally (with crystal vision `🔮`):

#### `search`

Search across all resources for relevant tools and solutions.

```
🔮 search query=<query>
  > "Are there any MCP servers for PostgreSQL?"
  > "What testing frameworks exist for React?"
  > "Do we have authentication plugins?"
```

```
🔮 search | postgres

┌─ 🔮  ──────────────────────────── Found 5 ─┐
│ • postgres-mcp (mcp)                        │
│   PostgreSQL database access                │
│   smithery.ai • ⭐ verified                 │
│   Install: npx postgres-mcp                 │
│                                             │
│ • postgresql-mcp (mcp)                      │
│   PostgreSQL MCP server                     │
│   npmjs.com • ✨ quality                    │
│   Install: npx @scope/postgresql-mcp        │
│                                             │
│ Total: 17 sources • 15,000+ resources       │
└─────────────────────────────────────────────┘
```

#### `browse`

Browse resources by category, type, or popularity.

```
🔮 browse category=<category>
  > "Browse testing tools"
  > "Show MCP servers only"
  > "Find security-related skills"
```

```
🔮 browse | testing

┌─ 🔮  ──────────────────────────── Found 8 ─┐
│ • tdd-workflows (plugin)                    │
│   Test-driven development workflow          │
│   claude-code-plugins-plus • 258 plugins    │
│                                             │
│ • pytest-mcp (mcp)                          │
│   Python testing framework                  │
│   smithery.ai • ⭐ verified                 │
│                                             │
│ Total: 17 sources • 15,000+ resources       │
└─────────────────────────────────────────────┘
```

#### `sources`

Show all available data sources and their status.

```
🔮 sources
  > "Which sources are available?"
  > "Check data source health"
```

```
🔮 sources | 17 total

┌─ 🔮  ───────────────────────────── 15,000+ total ─┐
│ Plugins (303):
│   • claude-code-plugins-plus: 258 ✓
│   • claude-plugins-official: 45 ✓
│
│ MCP Servers (14,358):
│   • smithery.ai: 500 ✓
│   • playbooks.com: 1,000+ ✓
│   • npmjs.com: 250 ✓
│   • modelcontextprotocol.io: 248 ✓
│   • glama.ai: 662 ✓
│   • wong2/awesome-mcp-servers: 200+ ✓
│   • punkpeye/awesome-mcp-servers: 400+ ✓
│   • collabnix/awesome-mcp-lists: 100+ ✓
│
│ Skills (339):
│   • awesome-agent-skills: 339 ✓
│   • awesome-claude-code: 200+ ✓
│   • jmanhype/awesome-claude-code: 50+ ✓
│   • skillsmp: 25,000 (optional key)
└──────────────────────────────────────────────────────┘
```

## how it works

Ask a question, get install commands:

```
 User: "What MCP servers exist for PostgreSQL?"
                        ↓
              ┌─────────────────────┐
              │  🔮 claude-oracle   │
              │     MCP Server      │
              └─────────┬───────────┘
                        │
         ┌──────────────┼──────────────┐
         │   PARALLEL SEARCH (17)       │
         └──────────────┬───────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
┌───▼────┐        ┌────▼─────┐       ┌────▼─────┐
│Smithery│        │  npm     │       │ Glama.ai │
│  500   │        │  250     │       │   662    │
└────────┘        └──────────┘       └──────────┘
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
              ┌─────────▼───────────┐
              │   DEDUPLICATE &     │
              │   RANK RESULTS      │
              └─────────┬───────────┘
                        │
              ┌─────────▼───────────┐
              │  FORMAT & RETURN    │
              │   🔮 Beautiful      │
              │   Bordered Output   │
              └─────────────────────┘
```

**Core features:**

- **17 sources**: Smithery, npm, Glama.ai, GitHub, awesome lists + more
- **15,000+ resources**: Skills, plugins, and MCP servers in one search
- **Parallel fetching**: All sources searched simultaneously (~3 seconds)
- **Smart caching**: In-memory TTL cache (6-24 hour expiry)
- **Keyword scoring**: Weighted matching (exact > starts with > contains)
- **Quality signals**: Stars, verified badges, quality scores boost ranking
- **Beautiful formatting**: Bordered output with 🔮 identifier

## data sources

**Zero-config sources (16/17):**

| Source | Type | Count | Method |
|--------|------|-------|--------|
| Smithery Registry | MCP | 500 | REST API (5 pages) |
| Playbooks | MCP | 1,000+ | XML Sitemaps |
| Official MCP Registry | MCP | 248 | REST API (3 iterations) |
| npm Registry | MCP/Plugin | 250 | Search API (1 page) |
| Glama.ai | MCP | 662 | RSS Feed |
| wong2/awesome-mcp-servers | MCP | 200+ | GitHub Markdown |
| punkpeye/awesome-mcp-servers | MCP | 400+ | GitHub Markdown |
| collabnix/awesome-mcp-lists | MCP | 100+ | GitHub Markdown |
| jmanhype/awesome-claude-code | Plugin/Skill | 50+ | GitHub Markdown |
| hesreallyhim/awesome-claude-code | Skill | 200+ | GitHub Markdown |
| awesome-agent-skills | Skill | 339 | GitHub Markdown |
| claude-code-plugins-plus | Plugin | 258 | Marketplace JSON |
| claude-plugins-official | Plugin | 45 | Marketplace JSON |
| superpowers-marketplace | Plugin | - | Marketplace JSON |

**Optional (requires API key):**
- **SkillsMP**: 25,000+ skills with semantic search ([get key](https://skillsmp.com))

> **Note:** Pagination is limited for faster responses (~3s). Full datasets available through caching on subsequent searches.

## development

```bash
git clone https://github.com/Vvkmnn/claude-oracle-mcp
cd claude-oracle-mcp
npm install
npm run build
```

**Package requirements:**

- **Node.js**: >=20.0.0 (ES modules)
- **npm**: >=10.0.0 (package-lock v3)
- **Runtime**: `@modelcontextprotocol/sdk`, `fast-xml-parser`
- **Zero external databases** - works with `npx`

**Development workflow:**

```bash
npm run build          # TypeScript compilation
npm run watch          # Watch mode with tsc --watch
node dist/index.js     # Run MCP server directly (stdio)
```

**Contributing:**

- Fork the repository and create feature branches
- Test with multiple data sources before submitting PRs
- Follow TypeScript strict mode and [MCP protocol](https://modelcontextprotocol.io/specification)

## license

[MIT](LICENSE)

---

![Oracle of Delphi](https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/John_Collier_-_Priestess_of_Delphi.jpg/512px-John_Collier_-_Priestess_of_Delphi.jpg)

_Priestess of Delphi (1891) by John Collier - The Oracle who divined the future_
