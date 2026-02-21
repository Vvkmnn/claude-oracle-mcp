<img align="right" src="claude-oracle.svg" alt="claude-oracle-mcp" width="220">

# claude-oracle-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for discovering [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills, plugins, and MCP servers. Search 15,000+ resources from 17 sources with zero setup.

<br clear="right">

![claude-oracle-mcp](demo/demo.gif)

[![npm version](https://img.shields.io/npm/v/claude-oracle-mcp.svg)](https://www.npmjs.com/package/claude-oracle-mcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/) [![Claude](https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff)](#) [![GitHub stars](https://img.shields.io/github/stars/Vvkmnn/claude-oracle-mcp?style=social)](https://github.com/Vvkmnn/claude-oracle-mcp)

---

## install

**Requirements:**

[![Claude Code](https://img.shields.io/badge/Claude_Code-555?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOCAxMCIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj4KICA8IS0tIENsYXdkOiBDbGF1ZGUgQ29kZSBtYXNjb3QgLS0+CiAgPCEtLSBEZWNvZGVkIGZyb206IOKWkOKWm+KWiOKWiOKWiOKWnOKWjCAvIOKWneKWnOKWiOKWiOKWiOKWiOKWiOKWm+KWmCAvIOKWmOKWmCDilp3ilp0gLS0+CiAgPCEtLSBTdWItcGl4ZWxzIGFyZSAxIHdpZGUgeCAyIHRhbGwgdG8gbWF0Y2ggdGVybWluYWwgY2hhciBjZWxsIGFzcGVjdCByYXRpbyAtLT4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIzIiAgeT0iMCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIzIiAgeT0iMiIgd2lkdGg9IjIiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSI2IiAgeT0iMiIgd2lkdGg9IjYiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIxMyIgeT0iMiIgd2lkdGg9IjIiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIxIiAgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIzIiAgeT0iNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSI0IiAgeT0iOCIgd2lkdGg9IjEiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSI2IiAgeT0iOCIgd2lkdGg9IjEiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIxMSIgeT0iOCIgd2lkdGg9IjEiICBoZWlnaHQ9IjIiLz4KICA8cmVjdCBmaWxsPSIjZDk3NzU3IiB4PSIxMyIgeT0iOCIgd2lkdGg9IjEiICBoZWlnaHQ9IjIiLz4KPC9zdmc+Cg==)](https://claude.ai/code)

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

## plugin

For automated tool discovery with hooks, install from the [claude-emporium](https://github.com/Vvkmnn/claude-emporium) marketplace:

```bash
/plugin marketplace add Vvkmnn/claude-emporium
/plugin install claude-oracle@claude-emporium
```

The **claude-oracle** plugin provides:

**Hooks** (targeted, fires before external searches):

- Before WebSearch/WebFetch → Check oracle for existing tools first
- Before EnterPlanMode → Search for relevant plugins/skills

**Command:** `/oracle-search <query>`

Requires the MCP server installed first. See the emporium for other Claude Code plugins and MCPs.

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

╭─ 🔮 ─────────────────────────────── Found 5 ─╮
│ • postgres-mcp (mcp)                         │
│   PostgreSQL database access                 │
│   smithery.ai • ⭐ verified                  │
│   Install: npx postgres-mcp                  │
│                                              │
│ • postgresql-mcp (mcp)                       │
│   PostgreSQL MCP server                      │
│   npmjs.com • ✨ quality                     │
│   Install: npx @scope/postgresql-mcp         │
│                                              │
│ Total: 17 sources • 15,000+ resources        │
╰──────────────────────────────────────────────╯
```

```json
{
  "results": [
    {
      "name": "postgres-mcp",
      "type": "mcp",
      "description": "PostgreSQL database access",
      "source": "smithery.ai",
      "install_command": "npx postgres-mcp",
      "verified": true,
      "stars": 142
    },
    {
      "name": "postgresql-mcp",
      "type": "mcp",
      "description": "PostgreSQL MCP server",
      "source": "npmjs.com",
      "install_command": "npx @scope/postgresql-mcp",
      "quality_score": 0.85
    }
  ],
  "sources_searched": ["smithery.ai", "npmjs.com", "glama.ai", "modelcontextprotocol.io"],
  "total_available": 15000,
  "cached": false
}
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

╭─ 🔮 ─────────────────────────────── Found 8 ─╮
│ • tdd-workflows (plugin)                     │
│   Test-driven development workflow           │
│   claude-code-plugins-plus • 258 plugins     │
│                                              │
│ • pytest-mcp (mcp)                           │
│   Python testing framework                   │
│   smithery.ai • ⭐ verified                  │
│                                              │
│ Total: 17 sources • 15,000+ resources        │
╰──────────────────────────────────────────────╯
```

```json
{
  "results": [
    {
      "name": "tdd-workflows",
      "type": "plugin",
      "description": "Test-driven development workflow",
      "source": "claude-code-plugins-plus",
      "install_command": "git clone https://github.com/user/tdd-workflows ~/.claude/plugins/tdd-workflows",
      "category": "testing"
    },
    {
      "name": "pytest-mcp",
      "type": "mcp",
      "description": "Python testing framework",
      "source": "smithery.ai",
      "install_command": "npx pytest-mcp",
      "verified": true
    }
  ],
  "sources_searched": ["claude-code-plugins-plus", "smithery.ai", "npmjs.com"],
  "total_available": 15000,
  "cached": true
}
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

╭─ 🔮 ─────────────────────────────── 15,000+ total ─╮
│ Plugins (303):                                     │
│   • claude-code-plugins-plus: 258 ✓                │
│   • claude-plugins-official: 45 ✓                  │
│                                                    │
│ MCP Servers (14,358):                              │
│   • smithery.ai: 500 ✓                             │
│   • playbooks.com: 1,000+ ✓                        │
│   • npmjs.com: 250 ✓                               │
│   • modelcontextprotocol.io: 248 ✓                 │
│   • glama.ai: 662 ✓                                │
│   • wong2/awesome-mcp-servers: 200+ ✓              │
│   • punkpeye/awesome-mcp-servers: 400+ ✓           │
│   • collabnix/awesome-mcp-lists: 100+ ✓            │
│                                                    │
│ Skills (339):                                      │
│   • awesome-agent-skills: 339 ✓                    │
│   • awesome-claude-code: 200+ ✓                    │
│   • jmanhype/awesome-claude-code: 50+ ✓            │
│   • skillsmp: 25,000 (optional key)                │
╰────────────────────────────────────────────────────╯
```

```json
{
  "sources": [
    { "name": "claude-code-plugins-plus", "type": "plugin", "count": 258, "status": "ok" },
    { "name": "claude-plugins-official", "type": "plugin", "count": 45, "status": "ok" },
    { "name": "smithery.ai", "type": "mcp", "count": 500, "status": "ok" },
    { "name": "playbooks.com", "type": "mcp", "count": 1000, "status": "ok" },
    { "name": "npmjs.com", "type": "mcp", "count": 250, "status": "ok" },
    { "name": "modelcontextprotocol.io", "type": "mcp", "count": 248, "status": "ok" },
    { "name": "glama.ai", "type": "mcp", "count": 662, "status": "ok" },
    { "name": "awesome-agent-skills", "type": "skill", "count": 339, "status": "ok" },
    { "name": "skillsmp", "type": "skill", "count": 25000, "status": "no_key" }
  ],
  "total": 15000
}
```

## methodology

How [claude-oracle-mcp](https://github.com/Vvkmnn/claude-oracle-mcp) [works](https://github.com/Vvkmnn/claude-oracle-mcp/tree/master/src):

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

**Data sources (zero-config, 16/17):**

| Source                           | Type         | Count  | Method                  |
| -------------------------------- | ------------ | ------ | ----------------------- |
| Smithery Registry                | MCP          | 500    | REST API (5 pages)      |
| Playbooks                        | MCP          | 1,000+ | XML Sitemaps            |
| Official MCP Registry            | MCP          | 248    | REST API (3 iterations) |
| npm Registry                     | MCP/Plugin   | 250    | Search API (1 page)     |
| Glama.ai                         | MCP          | 662    | RSS Feed                |
| wong2/awesome-mcp-servers        | MCP          | 200+   | GitHub Markdown         |
| punkpeye/awesome-mcp-servers     | MCP          | 400+   | GitHub Markdown         |
| collabnix/awesome-mcp-lists      | MCP          | 100+   | GitHub Markdown         |
| jmanhype/awesome-claude-code     | Plugin/Skill | 50+    | GitHub Markdown         |
| hesreallyhim/awesome-claude-code | Skill        | 200+   | GitHub Markdown         |
| awesome-agent-skills             | Skill        | 339    | GitHub Markdown         |
| claude-code-plugins-plus         | Plugin       | 258    | Marketplace JSON        |
| claude-plugins-official          | Plugin       | 45     | Marketplace JSON        |
| superpowers-marketplace          | Plugin       | -      | Marketplace JSON        |

**Optional (requires API key):**

- **SkillsMP**: 25,000+ skills with semantic search ([get key](https://skillsmp.com))

> **Note:** Pagination is limited for faster responses (~3s). Full datasets available through caching on subsequent searches.

## alternatives

Every MCP discovery tool either searches a single registry or requires separate accounts per source. Oracle aggregates 17 sources in one command.

| Feature             | **oracle**                                     | 1mcpserver              | Single registry                   |
| ------------------- | ---------------------------------------------- | ----------------------- | --------------------------------- |
| **Resource types**  | **MCP + plugins + skills**                     | MCP servers only        | Usually one type                  |
| **Sources**         | **17 (registries + awesome lists + marketplaces)** | Registry searches   | One source at a time              |
| **Skills/plugins**  | **Yes (339 skills, 303 plugins)**              | No                      | Usually no                        |
| **Setup**           | **One MCP, one command**                       | One MCP, one command    | Separate account/API per registry |
| **Cross-source**    | **Deduplicated, ranked results**               | Per-registry            | Manual comparison                 |
| **Caching**         | **In-memory TTL (6-24h)**                      | Per-request             | Varies                            |
| **Install commands**| **Included in results**                        | Included in results     | Varies                            |

**[1mcpserver](https://github.com/particlefuture/1mcpserver)** — MCP server discovery from multiple registries. Searches MCP servers only — no plugins, no skills. Per-registry results without cross-source dedup or ranking. No caching between requests.

**[Smithery](https://smithery.ai)**, **[Glama](https://glama.ai)**, **[SkillsMP](https://skillsmp.com)** — Individual registries, each searchable independently. Requires separate accounts or API access per registry. Each covers a subset of the ecosystem — no single source has everything. Manual comparison across registries to find the best option. Oracle aggregates all of these (and 14 more sources) with deduplicated, ranked results in one query.

## development

```bash
git clone https://github.com/Vvkmnn/claude-oracle-mcp && cd claude-oracle-mcp
npm install && npm run build
npm test
```

**Package requirements:**

- **Node.js**: >=20.0.0 (ES modules)
- **Runtime**: `@modelcontextprotocol/sdk`, `fast-xml-parser`
- **Zero external databases** — works with `npx`

**Development workflow:**

```bash
npm run build          # TypeScript compilation with executable permissions
npm run dev            # Watch mode with tsc --watch
npm run start          # Run the MCP server directly
npm run lint           # ESLint code quality checks
npm run lint:fix       # Auto-fix linting issues
npm run format         # Prettier formatting (src/)
npm run format:check   # Check formatting without changes
npm run typecheck      # TypeScript validation without emit
npm run test           # Lint + type check
npm run prepublishOnly # Pre-publish validation (build + lint + format:check)
```

**Git hooks (via Husky):**

- **pre-commit**: Auto-formats staged `.ts` files with Prettier and ESLint

Contributing:

- Fork the repository and create feature branches
- Test with multiple data sources before submitting PRs
- Follow TypeScript strict mode and [MCP protocol](https://modelcontextprotocol.io/specification) standards

Learn from examples:

- [Official MCP servers](https://github.com/modelcontextprotocol/servers) for reference implementations
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for best practices
- [Creating Node.js modules](https://docs.npmjs.com/creating-node-js-modules) for npm package development

## license

[MIT](LICENSE)

<hr>

<p align="center">
<a href="https://en.wikipedia.org/wiki/Cumaean_Sibyl"><img src="logo/oracle.jpg" alt="Aeneas and the Cumaean Sibyl — Claude Mellan" width="340"></a>
</p>

_**[Aeneas and the Cumaean Sibyl](https://en.wikipedia.org/wiki/Cumaean_Sibyl)** by **[Claude Mellan](https://en.wikipedia.org/wiki/Claude_Mellan)**. The oracle who guided Aeneas through the underworld._
