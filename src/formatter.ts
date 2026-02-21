import type { Resource, DataSource, SearchOutput } from './types.js';

/**
 * Oracle MCP formatter - beautiful bordered output with 🔮 identifier
 * Pattern: Mirrors historian/praetorian formatting with unique oracle branding
 */

const ORACLE_EMOJI = '🔮';
const TOP_LEFT = '╭─';
const TOP_RIGHT = '─╮';
const SIDE = '│';
const BOTTOM_LEFT = '╰─';
const BOTTOM_RIGHT = '─╯';
const HORIZONTAL = '─';

/**
 * Wrap a line to fit within maxWidth, preserving leading indent
 */
function wrapLine(line: string, maxWidth: number): string[] {
  if (line.length <= maxWidth) return [line];
  const indent = line.match(/^(\s*)/)?.[0] ?? '';
  const words = line.trim().split(/\s+/);
  const wrapped: string[] = [];
  let current = indent;
  for (const word of words) {
    const test = current.length === indent.length ? `${current}${word}` : `${current} ${word}`;
    if (test.length > maxWidth && current.length > indent.length) {
      wrapped.push(current);
      current = `${indent}  ${word}`;
    } else {
      current = test;
    }
  }
  if (current.trim()) wrapped.push(current);
  return wrapped;
}

/**
 * Create a bordered box with header
 */
function createBox(header: string, content: string[], width = 65): string {
  // Wrap content lines to fit box width (width - 2 for "│ " prefix)
  const innerWidth = width - 2;
  const wrappedContent: string[] = [];
  for (const line of content) {
    wrappedContent.push(...wrapLine(line, innerWidth));
  }

  const topBorder = `${TOP_LEFT} ${ORACLE_EMOJI}  ${HORIZONTAL.repeat(width - header.length - 8)}${header} ${TOP_RIGHT}`;
  const bottomBorder = `${BOTTOM_LEFT}${HORIZONTAL.repeat(width)}${BOTTOM_RIGHT}`;

  const lines = [topBorder];
  for (const line of wrappedContent) {
    lines.push(`${SIDE} ${line}`);
  }
  lines.push(bottomBorder);

  return lines.join('\n');
}

/**
 * Format search results
 */
export function formatSearchResults(output: SearchOutput): string {
  const { results, sources_searched, total_available } = output;

  if (results.length === 0) {
    return createBox('No results', [
      'No matching resources found.',
      '',
      `Searched: ${sources_searched.length} sources • ${total_available.toLocaleString()} total available`,
    ]);
  }

  const content: string[] = [];

  for (const resource of results) {
    // Resource name and type
    content.push(`• ${resource.name} (${resource.type})`);

    // Description
    if (resource.description) {
      content.push(`  ${resource.description}`);
    }

    // URL for research/follow-up
    if (resource.url) {
      content.push(`  ${resource.url}`);
    }

    // Install command
    if (resource.install_command) {
      content.push(`  Install: ${resource.install_command}`);
    }

    // Compact metadata line: source + author + signals (raw values, no decoration)
    const meta: string[] = [resource.source];
    if (resource.author) meta.push(`by ${resource.author}`);
    if (resource.stars) meta.push(`${resource.stars} stars`);
    if (resource.popularity_score) meta.push(`${resource.popularity_score} downloads`);
    if (resource.quality_score) meta.push(`quality: ${resource.quality_score}`);
    if (resource.verified) meta.push('verified');
    if (resource.version) meta.push(`v${resource.version}`);
    if (resource.category) meta.push(resource.category);
    content.push(`  [${meta.join(' | ')}]`);
    content.push(''); // Empty line between results
  }

  // Summary
  content.push(
    `Total: ${sources_searched.length} sources • ${total_available.toLocaleString()} resources available`,
  );

  return createBox(`Found ${results.length}`, content);
}

/**
 * Format browse results (similar to search but with category context)
 */
export function formatBrowseResults(output: SearchOutput, _category?: string): string {
  return formatSearchResults({ ...output });
}

/**
 * Format sources status
 */
export function formatSources(sources: DataSource[], total: number): string {
  const content: string[] = [];

  // Group by type
  const byType = sources.reduce(
    (acc, source) => {
      if (!acc[source.type]) acc[source.type] = [];
      acc[source.type]!.push(source);
      return acc;
    },
    {} as Record<string, DataSource[]>,
  );

  // Plugin sources
  if (byType.plugin) {
    const pluginTotal = byType.plugin.reduce((sum, s) => sum + s.count, 0);
    content.push(`Plugins (${pluginTotal}):`);
    for (const source of byType.plugin) {
      const status = source.status === 'ok' ? '✓' : source.status === 'no_key' ? '(no key)' : '⚠';
      content.push(`  • ${source.name}: ${source.count.toLocaleString()} ${status}`);
    }
    content.push('');
  }

  // MCP sources
  if (byType.mcp) {
    const mcpTotal = byType.mcp.reduce((sum, s) => sum + s.count, 0);
    content.push(`MCP Servers (${mcpTotal}):`);
    for (const source of byType.mcp) {
      const status = source.status === 'ok' ? '✓' : '⚠';
      content.push(`  • ${source.name}: ${source.count.toLocaleString()} ${status}`);
    }
    content.push('');
  }

  // Skill sources
  if (byType.skill) {
    const skillTotal = byType.skill.reduce((sum, s) => sum + s.count, 0);
    content.push(`Skills (${skillTotal}):`);
    for (const source of byType.skill) {
      const status = source.status === 'ok' ? '✓' : source.status === 'no_key' ? '(no key)' : '⚠';
      content.push(`  • ${source.name}: ${source.count.toLocaleString()} ${status}`);
    }
  }

  return createBox(`${total.toLocaleString()} total`, content);
}

/**
 * Format install command in compact format
 */
export function formatInstallCommand(resource: Resource): string {
  const lines = [
    `**${resource.name}** (${resource.type})`,
    resource.description,
    '',
    `Install: \`${resource.install_command}\``,
  ];

  if (resource.url) {
    lines.push(`Docs: ${resource.url}`);
  }

  return lines.join('\n');
}
