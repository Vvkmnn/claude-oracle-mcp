# Skill Discovery MCP Server - TODO

**Project Goal**: Build an MCP server that enables Claude to dynamically discover and suggest Claude Code skills, similar to how 1mcpserver works for MCP servers.

**Status**: Planning Phase
**Created**: 2025-12-20
**Priority**: High - Fills critical gap in Claude Code ecosystem

---

## Problem Statement

### Current Limitation
Claude **cannot** dynamically discover or install skills from marketplaces. The workflow is entirely manual:

1. User manually browses marketplace websites
2. User manually runs `/plugin install skill-name@marketplace`
3. User manually restarts Claude Code
4. Claude can then auto-trigger the skill

### The Gap
- **1mcpserver exists** for MCP server discovery ✅
- **SkillsMP.com has 25,000+ skills** with REST API ✅
- **NO MCP server wraps the SkillsMP API** ❌
- **Claude can't search/suggest skills dynamically** ❌

### What Users Want
"I need a skill for X" → Claude searches → Claude suggests options → User installs

---

## Current Ecosystem Analysis

### What Exists

#### 1. **1mcpserver** (MCP Server Discovery)
- **Package**: `@particlefuture/1mcpserver`
- **Purpose**: Search and discover MCP servers
- **Database**: Dynamic (searches multiple registries)
- **Installation**: `npx -y @particlefuture/1mcpserver`
- **Use Case**: "Find me an MCP server for PostgreSQL"
- **Source**: https://github.com/particlefuture/1mcpserver

#### 2. **Meta Discovery MCP** (Alternative to 1mcpserver)
- **Database**: 800+ MCP servers
- **Package**: `@particlefuture/meta-discovery-mcp`
- **Source**: https://mcpmarket.com/server/meta-discovery

#### 3. **SkillsMP API** (Skills Database)
- **Database**: 25,000+ Agent Skills
- **API Endpoints**:
  - Keyword Search: `https://skillsmp.com/api/v1/skills/search?q=SEO`
  - AI Semantic Search: `https://skillsmp.com/api/v1/skills/ai-search?q=How+to+create+a+web+scraper`
- **Authentication**: Bearer token (`sk_live_your_api_key`)
- **Format**: REST API (JSON responses)
- **Source**: https://skillsmp.com/docs/api

#### 4. **Claude Code Marketplaces**
- Plugin marketplaces are JSON catalogs of available plugins
- Skills are bundled within plugins
- Installation: `/plugin marketplace add` → `/plugin install`
- Auto-update: Per-marketplace toggle available
- **Source**: https://code.claude.com/docs/en/plugin-marketplaces

### What's Missing
**A "SkillsMP MCP Server"** that:
- Wraps the SkillsMP API as an MCP server
- Provides tools Claude can call to search skills
- Returns structured results with installation commands
- Enables dynamic discovery workflow

---

## Technical Specifications

### MCP Server Design

#### Name
`skillsmp-mcp` or `claude-skills-discovery-mcp`

#### Purpose
Enable Claude Code to dynamically search and suggest Agent Skills from SkillsMP.com via MCP protocol

#### Tools to Provide

**1. `search_skills`**
- **Input**:
  - `query` (string, required): Search keyword or description
  - `limit` (number, optional, default: 10): Max results to return
  - `semantic` (boolean, optional, default: false): Use AI semantic search
- **Output**: Array of skill objects with:
  - `name`: Skill name
  - `description`: What the skill does
  - `marketplace`: Which marketplace it's from
  - `install_command`: Exact `/plugin install` command
  - `url`: GitHub/source URL
  - `category`: Skill category (e.g., "Git", "Testing", "Code Review")
  - `rating`: Community rating (if available)

**2. `get_skill_details`**
- **Input**: `skill_id` (string)
- **Output**: Full skill details including:
  - Complete description
  - Required dependencies
  - Configuration requirements
  - Usage examples
  - Author information

**3. `search_by_category`**
- **Input**:
  - `category` (string): Category name (e.g., "API & Backend", "Testing")
  - `limit` (number, optional)
- **Output**: Same as `search_skills`

**4. `list_categories`**
- **Input**: None
- **Output**: Array of available categories

#### Implementation Language
**TypeScript** (preferred for consistency with Claude Code ecosystem)

#### Dependencies
- `@modelcontextprotocol/sdk`: MCP SDK
- `axios` or `fetch`: HTTP requests to SkillsMP API
- Environment variable for API key: `SKILLSMP_API_KEY`

#### Configuration Example
```json
{
  "mcpServers": {
    "skillsmp": {
      "command": "npx",
      "args": ["-y", "skillsmp-mcp"],
      "env": {
        "SKILLSMP_API_KEY": "sk_live_your_api_key"
      },
      "transport": "stdio"
    }
  }
}
```

---

## API Integration Details

### SkillsMP API Endpoints

#### Keyword Search
```bash
GET https://skillsmp.com/api/v1/skills/search?q=SEO
Authorization: Bearer sk_live_your_api_key
```

**Response Structure**:
```json
{
  "results": [
    {
      "id": "skill_123",
      "name": "SEO Optimizer",
      "description": "Optimize content for search engines",
      "category": "Marketing",
      "marketplace": "anthropics/skills",
      "github_url": "https://github.com/...",
      "rating": 4.5,
      "downloads": 1234
    }
  ],
  "total": 45,
  "page": 1
}
```

#### AI Semantic Search
```bash
GET https://skillsmp.com/api/v1/skills/ai-search?q=How+to+create+a+web+scraper
Authorization: Bearer sk_live_your_api_key
```

**Use Case**: Natural language queries get better semantic matching

#### Categories Endpoint (likely exists)
```bash
GET https://skillsmp.com/api/v1/categories
Authorization: Bearer sk_live_your_api_key
```

---

## User Workflow (After Implementation)

### Current (Manual) Workflow
```
User: "I need a skill for code review"
Claude: "I can't search for skills. Try browsing https://skillsmp.com or your marketplaces"
User: [Manually browses, finds skill, installs, restarts]
```

### Ideal Workflow (With skillsmp-mcp)
```
User: "I need a skill for code review"
Claude: [Calls search_skills("code review")]
Claude: "Found 3 relevant skills:
  1. pr-review-toolkit - Comprehensive PR review with multiple agents
     Install: /plugin install pr-review-toolkit@claude-code-plugins
  2. code-reviewer - Security and quality checks
     Install: /plugin install code-reviewer@superpowers-marketplace
  3. git-review-assistant - Automated code review comments
     Install: /plugin install git-review-assistant@anthropics/skills

  Which would you like to install?"
User: "Install #1"
User: [Manually runs install command, restarts]
```

### What This Enables
✅ Dynamic discovery
✅ Claude can suggest relevant skills
✅ Users get exact install commands
❌ Still requires manual installation (by design for security)

---

## Implementation Phases

### Phase 1: Basic MCP Server (MVP)
**Goal**: Get keyword search working

**Tasks**:
- [ ] Set up TypeScript MCP server boilerplate
- [ ] Implement `search_skills` tool with SkillsMP API integration
- [ ] Add API key authentication via environment variable
- [ ] Return structured results with install commands
- [ ] Test with Claude Code locally
- [ ] Package for npm distribution

**Estimated Complexity**: Medium (2-3 days)

### Phase 2: Enhanced Search
**Goal**: Add semantic search and categorization

**Tasks**:
- [ ] Implement `search_skills` with semantic search option
- [ ] Add `search_by_category` tool
- [ ] Add `list_categories` tool
- [ ] Improve result ranking/sorting
- [ ] Add caching for frequently searched terms

**Estimated Complexity**: Low (1 day)

### Phase 3: Detailed Information
**Goal**: Provide comprehensive skill details

**Tasks**:
- [ ] Implement `get_skill_details` tool
- [ ] Parse skill README/documentation
- [ ] Show dependencies and requirements
- [ ] Include usage examples
- [ ] Add compatibility checks (Claude Code version)

**Estimated Complexity**: Medium (2 days)

### Phase 4: Intelligence Layer
**Goal**: Make Claude smarter about suggestions

**Tasks**:
- [ ] Track which skills user has installed (read from config)
- [ ] Avoid suggesting already-installed skills
- [ ] Suggest complementary skills
- [ ] Learn from user's installed skills to improve recommendations

**Estimated Complexity**: High (3-4 days)

---

## Security & Privacy Considerations

### API Key Management
- Never hardcode API keys
- Use environment variables
- Document API key acquisition process
- Consider rate limiting awareness

### User Privacy
- Don't track searches (unless user opts in)
- No telemetry without consent
- Local caching only (no external logging)

### Marketplace Trust
- Only return skills from verified marketplaces
- Display source/author information
- Warn about unverified skills
- Respect user's marketplace preferences

---

## Testing Strategy

### Unit Tests
- API response parsing
- Error handling (network failures, rate limits)
- Search query formatting
- Result filtering/sorting

### Integration Tests
- Full MCP server startup
- Tool invocation from Claude
- API key authentication
- Response format validation

### Manual Testing with Claude Code
```bash
# Test cases
1. "Find skills for testing"
2. "Search for git automation"
3. "Show me code review skills"
4. "What skills are available for API development?"
5. "Find skills in the Testing category"
```

---

## Distribution & Documentation

### Package Distribution
- **npm package**: `skillsmp-mcp`
- **GitHub repo**: Consider open-sourcing to community
- **NPM registry**: Public package for easy installation

### Documentation Needed
1. **README.md**:
   - What it does
   - Installation instructions
   - API key setup
   - Usage examples

2. **Configuration Guide**:
   - How to add to Claude Code
   - Environment variables
   - Troubleshooting

3. **API Reference**:
   - All tools with parameters
   - Example requests/responses
   - Error codes

### Community Engagement
- Submit to MCP marketplace directories
- Announce on Claude Code forums/Discord
- Create demo video
- Blog post about the implementation

---

## Alternative Approaches Considered

### Approach 1: Direct SkillsMP Integration (Chosen)
✅ Pros: Uses existing comprehensive database
✅ Pros: API already exists
❌ Cons: Requires API key
❌ Cons: Dependent on external service

### Approach 2: Scrape GitHub Marketplaces
❌ Pros: No API dependency
❌ Cons: Brittle (breaks with marketplace changes)
❌ Cons: Incomplete data
❌ Cons: Rate limiting issues

### Approach 3: Local Skills Index
❌ Pros: Fast, no network
❌ Cons: Stale data
❌ Cons: Maintenance burden
❌ Cons: Missing new skills

**Decision**: Approach 1 (SkillsMP API) is best balance

---

## Success Metrics

### Technical Metrics
- Response time: < 2 seconds for search
- Uptime: > 99% availability
- API error rate: < 1%
- Cache hit rate: > 70% for common queries

### User Metrics
- Adoption: Installs per week
- Usage: Searches per active user
- Success rate: % of searches leading to skill installation
- User feedback: Ratings/reviews

### Ecosystem Impact
- Number of skills discovered through this tool
- Reduction in manual marketplace browsing
- Community contributions/forks

---

## Resources & References

### Documentation
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Claude Code MCP Guide**: https://docs.anthropic.com/en/docs/claude-code/mcp
- **Agent Skills Spec**: https://github.com/agentskills/agentskills
- **Plugin Marketplaces**: https://code.claude.com/docs/en/plugin-marketplaces

### API & Services
- **SkillsMP**: https://skillsmp.com/
- **SkillsMP API**: https://skillsmp.com/docs/api
- **MCP.so Registry**: https://mcp.so
- **MCP Market**: https://mcpmarket.com

### Existing Implementations (for reference)
- **1mcpserver**: https://github.com/particlefuture/1mcpserver
- **Meta Discovery**: https://mcpmarket.com/server/meta-discovery
- **AppleScript MCP**: https://github.com/peakmojo/applescript-mcp
- **SkillsMP GitHub**: https://github.com/agentskills/agentskills

### Technical Guides
- **MCP Server Best Practices**: https://www.marktechpost.com/2025/07/23/7-mcp-server-best-practices-for-scalable-ai-integrations-in-2025/
- **MCP Marketplace Guide**: https://skywork.ai/skypage/en/MCP-Server-Marketplace-The-Definitive-Guide-for-AI-Engineers-in-2025/1972506919577780224
- **Building MCP Servers**: https://github.com/modelcontextprotocol/servers
- **Agent Skills Deep Dive**: https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/

### Community Resources
- **Awesome MCP Servers**: https://github.com/punkpeye/awesome-mcp-servers
- **Awesome Claude Skills**: https://github.com/travisvn/awesome-claude-skills
- **Claude Code Plugins Plus**: https://github.com/jeremylongshore/claude-code-plugins-plus

---

## Quick Start Development Template

### Minimal MCP Server Structure
```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SKILLSMP_API_KEY = process.env.SKILLSMP_API_KEY;
const SKILLSMP_API_BASE = "https://skillsmp.com/api/v1";

const server = new Server(
  {
    name: "skillsmp-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: search_skills
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "search_skills") {
    const { query, limit = 10, semantic = false } = request.params.arguments;

    const endpoint = semantic
      ? `${SKILLSMP_API_BASE}/skills/ai-search`
      : `${SKILLSMP_API_BASE}/skills/search`;

    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${SKILLSMP_API_KEY}`,
      },
    });

    const data = await response.json();

    // Transform results to include install commands
    const results = data.results.slice(0, limit).map(skill => ({
      name: skill.name,
      description: skill.description,
      marketplace: skill.marketplace,
      install_command: `/plugin install ${skill.name}@${skill.marketplace}`,
      url: skill.github_url,
      category: skill.category,
      rating: skill.rating,
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
});

// List available tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "search_skills",
        description: "Search for Claude Code Agent Skills from SkillsMP marketplace",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (keyword or natural language)",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10,
            },
            semantic: {
              type: "boolean",
              description: "Use AI semantic search (default: false)",
              default: false,
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SkillsMP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

### Package.json Template
```json
{
  "name": "skillsmp-mcp",
  "version": "0.1.0",
  "description": "MCP server for discovering Claude Code Agent Skills",
  "bin": {
    "skillsmp-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "keywords": [
    "mcp",
    "claude",
    "skills",
    "agent-skills",
    "claude-code"
  ]
}
```

---

## Next Steps

### Immediate Actions
1. [ ] Get SkillsMP API key from https://skillsmp.com
2. [ ] Test API endpoints manually with curl/Postman
3. [ ] Set up TypeScript MCP server project
4. [ ] Implement basic `search_skills` tool
5. [ ] Test locally with Claude Code

### Research Needed
- [ ] Confirm SkillsMP API rate limits
- [ ] Verify API response structure (may differ from docs)
- [ ] Check if API supports filtering by marketplace
- [ ] Investigate caching strategies for API responses

### Community Engagement
- [ ] Post in Claude Code Discord about planned tool
- [ ] Ask SkillsMP team for API access/best practices
- [ ] Check if similar projects exist (avoid duplication)

---

## Notes & Ideas

### Future Enhancements
- **Skill Compatibility Checker**: Verify skill works with current Claude Code version
- **Installation Helper**: Generate full install script (marketplace add + install + restart reminder)
- **Personalized Recommendations**: Based on user's coding patterns
- **Skill Collections**: Bundle related skills ("Testing Toolkit", "Git Master")
- **Offline Mode**: Cache popular skills for offline discovery

### Integration Opportunities
- **1mcpserver**: Could merge into single "discovery hub" (MCP servers + skills)
- **Claude Code Plugin**: Build native UI for skill browsing (beyond MCP)
- **VS Code Extension**: Skill discovery in IDE sidebar

### Open Questions
- Should this support multiple skill registries? (SkillsMP, GitHub, custom)
- How to handle skills that require paid API keys?
- Should we track skill popularity/usage stats?
- Community moderation for skill quality?

---

## Contact & Collaboration

**Maintainer**: v (vvkmnn+claude@gmail.com)
**Project Location**: ~/Projects/claude-trainer/
**Status**: Planning → Ready for implementation

**Looking for**:
- TypeScript developers interested in MCP
- Beta testers with Claude Code
- SkillsMP API experts
- Community feedback on design

---

**Last Updated**: 2025-12-20
**Version**: 1.0 (Planning Document)