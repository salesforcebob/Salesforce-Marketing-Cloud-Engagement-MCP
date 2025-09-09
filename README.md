## MCE MCP Server

Model Context Protocol (MCP) server for Salesforce Marketing Cloud Engagement (MCE). Provides:
- Generic tools for all MCE REST and SOAP APIs
- AMPScript and SSJS developer utilities (format/lint)

### Prerequisites
- Node.js 18.17+
- pnpm 10+
- Marketing Cloud Installed Package (Client ID/Secret)

### Install
```
pnpm install
```

### Configure authentication
Option A — .env (recommended):
1) Copy `docs/QUICKSTART.md` env section or the example below to a `.env` at repo root.
```
MCE_PROFILE_DEFAULT=dev
MCE_DEV_CLIENT_ID=your_client_id
MCE_DEV_CLIENT_SECRET=your_client_secret
MCE_DEV_SUBDOMAIN=your_subdomain
MCE_DEV_ACCOUNT_ID=your_mid
```

Option B — Shell envs:
```
export MCE_PROFILE_DEFAULT=dev
export MCE_DEV_CLIENT_ID=your_client_id
export MCE_DEV_CLIENT_SECRET=your_client_secret
export MCE_DEV_SUBDOMAIN=your_subdomain
export MCE_DEV_ACCOUNT_ID=your_mid
```

### Run via npx (recommended)
```
npx mce-mcp serve
```
Or install globally:
```
pnpm dlx mce-mcp serve
```

### Run locally (stdio)
```
pnpm dev
```
This starts an MCP stdio server. Use it with MCP-compatible clients.

## Using with Cursor
1. Open Cursor settings → MCP/Servers.
2. Add a new stdio server command:
   - Command: `npx mce-mcp serve`
   - Working directory: this repo
3. Save and reload tools. You should see tools:
   - `mce.v1.health`
   - `mce.v1.rest.request`
   - `mce.v1.soap.request`

Example tool call (REST):
```
{
  "tool": "mce.v1.rest.request",
  "input": {
    "method": "GET",
    "path": "/asset/v1/content/assets",
    "query": { "$page": 1, "$pagesize": 5 }
  }
}
```

## Using with Claude Code (Claude Desktop)
1. Open Claude Desktop → Settings → MCP Servers.
2. Add a stdio server entry with command `pnpm dev` and working directory as the repo.
3. Save and restart Claude Desktop. Tools appear under MCP tools.

## Running remotely (HTTP/WebSocket)
This project currently defaults to stdio. To run as a service, you can use a process manager and expose stdio via a wrapper or extend transports to HTTP/WebSocket in code (see PRD/plan for transport support). For basic remote usage:
- Run the server with `pnpm dev` under a supervisor (systemd/pm2) and configure your MCP client to run it on the host (SSH remote command) or adapt the transport to HTTP.

Security notes:
- Scope your Installed Package to least privilege.
- Treat `.env` as sensitive; store secrets securely in production.

## Available tools (initial)
- `mce.v1.health` — health check
- `mce.v1.rest.request` — generic REST request to MCE
- `mce.v1.soap.request` — generic SOAP request to MCE
- AMPScript: formatter/linter (local utilities)
- SSJS: formatter/linter (local utilities)

## Troubleshooting
- Token errors: verify Client ID/Secret/Subdomain and `MCE_PROFILE_DEFAULT`.
- Network issues: set `HTTPS_PROXY`/`HTTP_PROXY` if required by your environment.
- Inspect requests: increase logging in code or run client with verbose logs.

## More docs
- Quickstart: `docs/QUICKSTART.md`
- PRD: `docs/mce-mcp-prd.md`
- Plan: `docs/mce-mcp-plan.md`


