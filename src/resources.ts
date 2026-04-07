/**
 * Registers jambonz schema files and documentation as MCP resources.
 * Resolves all content from the @jambonz/schema package.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';
import { createRequire } from 'module';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const require = createRequire(import.meta.url);

/** Locate the @jambonz/schema package directory. */
function getSchemaPackageDir(): string {
  const schemaIndex = require.resolve('@jambonz/schema');
  // schemaIndex points to @jambonz/schema/index.js — parent dir is the package root
  return resolve(schemaIndex, '..');
}

export function registerResources(server: McpServer): void {
  const pkgDir = getSchemaPackageDir();
  const schemaDir = pkgDir; // schemas live at package root
  const agentsMdPath = resolve(pkgDir, 'AGENTS.md');

  // 1. AGENTS.md — the main documentation resource
  server.resource(
    'agents-guide',
    'jambonz://docs/agents-guide',
    {
      description: 'jambonz Agent Toolkit guide — explains the verb model, transport modes, core verbs, and common patterns',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: readFileSync(agentsMdPath, 'utf-8'),
        mimeType: 'text/markdown',
      }],
    }),
  );

  // 2. Root application schema
  const appSchemaPath = resolve(schemaDir, 'jambonz-app.schema.json');
  server.resource(
    'app-schema',
    'jambonz://schema/jambonz-app',
    {
      description: 'Root JSON Schema for a jambonz application — an array of verbs',
      mimeType: 'application/schema+json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: readFileSync(appSchemaPath, 'utf-8'),
        mimeType: 'application/schema+json',
      }],
    }),
  );

  // 3. Verb schemas
  const verbsDir = resolve(schemaDir, 'verbs');
  const verbFiles = readdirSync(verbsDir).filter((f) => f.endsWith('.schema.json'));

  for (const file of verbFiles) {
    const verbName = basename(file, '.schema.json');
    const filePath = resolve(verbsDir, file);

    server.resource(
      `verb-${verbName}`,
      `jambonz://schema/verbs/${verbName}`,
      {
        description: `JSON Schema for the "${verbName}" verb`,
        mimeType: 'application/schema+json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          text: readFileSync(filePath, 'utf-8'),
          mimeType: 'application/schema+json',
        }],
      }),
    );
  }

  // 4. Component schemas
  const componentsDir = resolve(schemaDir, 'components');
  const componentFiles = readdirSync(componentsDir).filter((f) => f.endsWith('.schema.json'));

  for (const file of componentFiles) {
    const componentName = basename(file, '.schema.json');
    const filePath = resolve(componentsDir, file);

    server.resource(
      `component-${componentName}`,
      `jambonz://schema/components/${componentName}`,
      {
        description: `JSON Schema for the "${componentName}" component`,
        mimeType: 'application/schema+json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          text: readFileSync(filePath, 'utf-8'),
          mimeType: 'application/schema+json',
        }],
      }),
    );
  }
}
