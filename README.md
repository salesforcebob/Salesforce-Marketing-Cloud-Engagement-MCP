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
npx @salesforcebob/salesforce-marketing-cloud-engagement-mcp serve
```
Or with pnpm dlx:
```
pnpm dlx @salesforcebob/salesforce-marketing-cloud-engagement-mcp serve
```

### Run locally (stdio)
```
pnpm dev
```
This starts an MCP stdio server. Use it with MCP-compatible clients.

## Using with Cursor
1. Open Cursor settings → MCP/Servers.
2. Add a new stdio server command:
   - Command: `npx @salesforcebob/salesforce-marketing-cloud-engagement-mcp serve`
   - Working directory: this repo
3. Save and reload tools. You should see tools:
   - `mce_v1_health`
   - `mce_v1_rest_request`
   - `mce_v1_soap_request`

Example tool call (REST — BU‑scoped):
```
{
  "tool": "mce_v1_rest_request",
  "input": {
    "method": "GET",
    "path": "/data/v1/customobjects",
    "query": { "$search": "Happy Birthday Email", "page": 1, "pageSize": 25 },
    "businessUnitId": "<MID>"
  }
}
```

### Things you can ask Cursor to do with this MCP
- List Data Extensions in a BU: “List all Data Extensions in BU 523027277.”
- Find a specific Data Extension: “Find the Data Extension named ‘Super Cool Data’ in BU 523027277.”
- Get Data Extension fields: “Show the fields for the Data Extension with CustomerKey SCD1 in BU 523027277.”
- Query DE folder hierarchy (SOAP): “Retrieve the Email folder hierarchy for BU 523027277.”
- Create an HTML Email: “Create an HTML email named ‘testMCEMCP’ in the 'Tinker' BU with a Salesforce‑branded hero and CTA, save to Content Builder root.”
- List Journeys: “List all journeys in the Tinker BU (MID 523027277).”
- Publish content variations: “Duplicate the email ‘testMCEMCP’, name it ‘testMCEMCP‑v2’, set subject to ‘Trailblaze with AI’, and save it to a ‘Campaigns’ subfolder in BU 523027277.”
- Retrieve Subscribers (SOAP): “SOAP retrieve Subscribers where Status = Active in BU 523027277.”
- Get DE rows by filter: “Return up to 50 rows from ‘Email_HappyBirthday’ where EmailAddress ends with ‘@example.com’ in BU 523027277.”
- Health check: “Ping the MCE server to verify it’s ready.”

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

## Available tools
- `mce_v1_health` — health check
- `mce_v1_rest_request` — generic REST request to MCE (supports BU scoping)
- `mce_v1_soap_request` — generic SOAP request to MCE (supports BU scoping)
- AMPScript: formatter/linter (local utilities)
- SSJS: formatter/linter (local utilities)

### Business Unit scoping
- REST: supply `businessUnitId` in the tool input to acquire a BU‑scoped token (`account_id`) before making the call.
- SOAP: either supply `businessUnitId` to acquire a BU‑scoped token, or omit it and pass `options.clientIds: [<MID>]` to set BU context in the SOAP envelope.

Auth reference: https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc_rest_auth?meta=getAccessToken

## Troubleshooting
- Token errors: verify Client ID/Secret/Subdomain and `MCE_PROFILE_DEFAULT`.
- Network issues: set `HTTPS_PROXY`/`HTTP_PROXY` if required by your environment.
- Inspect requests: increase logging in code or run client with verbose logs.

## More docs
- Quickstart and usage examples are maintained in this README.


