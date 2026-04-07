# @jambonz/mcp-schema-server

MCP server that provides jambonz verb schemas and documentation to AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/).

## How It Works

This server exposes the schemas and developer guide from the [@jambonz/schema](https://github.com/jambonz/schema) package as MCP tools. AI coding agents can query verb definitions, component types, callback payloads, and the full developer guide without needing local access to the schema files.

## Tools

| Tool | Description |
|------|-------------|
| `jambonz_developer_toolkit` | Returns the full developer guide and schema index. Call this first before writing any jambonz code. |
| `get_jambonz_schema` | Fetch the JSON Schema for any verb, component, or callback (e.g. `verb:say`, `component:synthesizer`, `callback:gather`, `guide:session-commands`). |

## Usage

### stdio transport

```bash
npx @jambonz/mcp-schema-server
```

### HTTP transport

```bash
npx @jambonz/mcp-schema-server --http --port 3000
```

## Configuration

### Claude Code CLI

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "jambonz": {
      "command": "npx",
      "args": ["-y", "@jambonz/mcp-schema-server"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "jambonz": {
      "command": "npx",
      "args": ["-y", "@jambonz/mcp-schema-server"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "jambonz": {
      "command": "npx",
      "args": ["-y", "@jambonz/mcp-schema-server"]
    }
  }
}
```

### Remote Hosted Server

A hosted instance is available at:

```
https://mcp-server.jambonz.app/mcp
```

To use the remote server in `.mcp.json`:

```json
{
  "mcpServers": {
    "jambonz": {
      "type": "url",
      "url": "https://mcp-server.jambonz.app/mcp"
    }
  }
}
```

## Links

- [@jambonz/schema](https://github.com/jambonz/schema) -- schema package this server exposes
- [jambonz.org](https://jambonz.org) -- platform documentation
- [GitHub](https://github.com/jambonz/mcp-server)

## License

MIT
