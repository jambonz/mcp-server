/**
 * Registers MCP tools for jambonz schema and documentation access.
 * Resolves all content from the @jambonz/schema package.
 *
 * Two tools:
 *  1. jambonz_developer_toolkit — returns the full guide (AGENTS.md) plus
 *     a verb/component/callback/guide index.
 *  2. get_jambonz_schema — returns the full JSON Schema for a single verb,
 *     component, or callback on demand.  If a usage guide exists in docs/
 *     it is appended automatically.  Also supports guide:<name> for fetching
 *     in-depth markdown guides from docs/guides/.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { createRequire } from 'module';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const require = createRequire(import.meta.url);

/** Locate the @jambonz/schema package directory. */
function getSchemaPackageDir(): string {
  const schemaIndex = require.resolve('@jambonz/schema');
  return resolve(schemaIndex, '..');
}

/** List schema files in a directory, returning names without .schema.json suffix. */
function listSchemas(dir: string, exclude: string[] = []): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) => basename(f, '.schema.json'))
    .filter((n) => !exclude.includes(n));
}

/** List markdown guides in a directory, returning names without .md suffix. */
function listGuides(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => basename(f, '.md'));
}

export function registerTools(server: McpServer): void {
  const pkgDir = getSchemaPackageDir();
  const agentsMdPath = resolve(pkgDir, 'AGENTS.md');
  const docsDir = resolve(pkgDir, 'docs');

  const verbsDir = resolve(pkgDir, 'verbs');
  const componentsDir = resolve(pkgDir, 'components');
  const callbacksDir = resolve(pkgDir, 'callbacks');
  const guidesDir = resolve(docsDir, 'guides');

  const verbNames = listSchemas(verbsDir);
  const componentNames = listSchemas(componentsDir);
  const callbackNames = listSchemas(callbacksDir, ['base']);
  const guideNames = existsSync(guidesDir) ? listGuides(guidesDir) : [];

  // Build the index suffix (static — names don't change at runtime)
  const indexParts = [
    '\n---\n',
    '# Available JSON Schemas\n',
    'Use the get_jambonz_schema tool to fetch the full JSON Schema for any verb or component listed below.\n',
    `\n## Verbs\n${verbNames.join(', ')}\n`,
    `\n## Components\n${componentNames.join(', ')}\n`,
  ];
  if (callbackNames.length > 0) {
    indexParts.push(
      `\n## Callbacks (actionHook payloads)\n${callbackNames.join(', ')}\n`
    );
  }
  if (guideNames.length > 0) {
    indexParts.push(
      `\n## Guides\nIn-depth documentation on specific topics. Fetch with \`guide:<name>\`.\n${guideNames.join(', ')}\n`
    );
  }
  const indexSuffix = indexParts.join('\n');

  // Tool 1: Guide + index (reads AGENTS.md fresh each call for development)
  server.tool(
    'jambonz_developer_toolkit',
    // eslint-disable-next-line max-len
    'REQUIRED: call this before writing jambonz code. Returns the developer guide (verb model, transports, SDK API, patterns) and lists all available schemas.',
    {},
    async() => ({
      content: [{
        type: 'text' as const,
        text: readFileSync(agentsMdPath, 'utf-8') + indexSuffix,
      }],
    }),
  );

  // Tool 2: Individual schema lookup
  const allNames = [
    ...verbNames.map((n) => `verb:${n}`),
    ...componentNames.map((n) => `component:${n}`),
    ...callbackNames.map((n) => `callback:${n}`),
    ...guideNames.map((n) => `guide:${n}`),
  ];
  server.tool(
    'get_jambonz_schema',
    `Get the JSON Schema for a jambonz verb or component. Available: ${allNames.join(', ')}`,
    {
      name: z.string().describe(
        'Verb or component name (e.g. "say", "gather", "recognizer")'
      ),
    },
    async({ name }) => {
      // Strip optional prefix (e.g. "verb:say" -> "say", "component:recognizer" -> "recognizer")
      const prefixMatch = name.match(/^(verb|component|callback|guide):(.*)/);
      const bare = prefixMatch ? prefixMatch[2] : name;

      // Guide lookup — guides are markdown files, not JSON schemas
      if (prefixMatch?.[1] === 'guide' && existsSync(guidesDir)) {
        const guidePath = resolve(guidesDir, `${bare}.md`);
        if (existsSync(guidePath)) {
          const text = readFileSync(guidePath, 'utf-8');
          return { content: [{ type: 'text' as const, text }] };
        }
        const msg = `Unknown guide "${bare}". Available: ${guideNames.join(', ')}`;
        return {
          content: [{ type: 'text' as const, text: msg }],
          isError: true,
        };
      }

      // All categories in search order
      const allCategories = [
        { prefix: 'verb', dir: verbsDir, names: verbNames, docsSubdir: 'verbs' },
        { prefix: 'component', dir: componentsDir, names: componentNames, docsSubdir: 'components' },
        { prefix: 'callback', dir: callbacksDir, names: callbackNames, docsSubdir: 'callbacks' },
      ] as const;

      // If prefix was explicit, only search that category; otherwise search all
      const categories = prefixMatch
        ? allCategories.filter((c) => c.prefix === prefixMatch[1])
        : allCategories;

      for (const { dir, names, docsSubdir } of categories) {
        if ((names as readonly string[]).includes(bare)) {
          let text = readFileSync(resolve(dir, `${bare}.schema.json`), 'utf-8');

          // Append usage docs if available (read fresh each call for easy editing)
          if (existsSync(docsDir)) {
            const docsPath = resolve(docsDir, docsSubdir, `${bare}.md`);
            if (existsSync(docsPath)) {
              const docs = readFileSync(docsPath, 'utf-8');
              text += `\n\n---\n# Usage Guide\n\n${docs}`;
            }
          }

          return { content: [{ type: 'text' as const, text }] };
        }
      }
      return {
        content: [{ type: 'text' as const, text: `Unknown schema "${name}". Available: ${allNames.join(', ')}` }],
        isError: true,
      };
    },
  );
}
