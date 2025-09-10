<div align="center">

# Marketing Cloud Engagement MCP Server

Model Context Protocol (MCP) server for Salesforce Marketing Cloud Engagement (MCE)

<br/>

[![npm version](https://img.shields.io/npm/v/%40salesforcebob/salesforce-marketing-cloud-engagement-mcp?color=0176d3&label=npm)](https://www.npmjs.com/package/@salesforcebob/salesforce-marketing-cloud-engagement-mcp)
[![node](https://img.shields.io/badge/node-%E2%89%A518.17-333?logo=node.js)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-00b1e4.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Server-4327ff)](https://github.com/modelcontextprotocol)

<sub>Underscore tool names. BU‑scoped tokens for REST and SOAP. Plug‑and‑play with Cursor/Claude Desktop or run on Heroku with a click.</sub>

</div>

---

### What you get

- Generic tools for all Marketing Cloud Engagement REST and SOAP APIs
- BU‑scoped authentication (account_id) and SOAP ClientIDs support
- Content Builder utilities (create assets like HTML emails)
- AMPScript and SSJS developer utilities (format/lint)

---

### Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Configure authentication](#configure-authentication)
- [Run via npx](#run-via-npx-recommended)
- [Using with Cursor](#using-with-cursor)
- [Things you can ask Cursor to do](#things-you-can-ask-cursor-to-do-with-this-mcp)
- [Available tools](#available-tools)
- [Business Unit scoping](#business-unit-scoping)
- [Troubleshooting](#troubleshooting)
- [More docs](#more-docs)
 - [Disclaimer](#disclaimer)

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

Example (REST — BU‑scoped):
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

Quick JSON examples

List journeys in a BU
```
{
  "tool": "mce_v1_rest_request",
  "input": {
    "method": "GET",
    "path": "/interaction/v1/interactions",
    "query": { "page": 1, "pageSize": 200 },
    "businessUnitId": "<MID>"
  }
}
```

Retrieve Email folders via SOAP
```
{
  "tool": "mce_v1_soap_request",
  "input": {
    "action": "Retrieve",
    "objectType": "DataFolder",
    "properties": ["ID","Name","CustomerKey","ContentType","ParentFolder.ID","ParentFolder.Name"],
    "filter": { "property": "ContentType", "operator": "equals", "value": "email" },
    "businessUnitId": "<MID>"
  }
}
```

## Using with Claude Code (Claude Desktop)
1. Open Claude Desktop → Settings → MCP Servers.
2. Add a stdio server entry with command `pnpm dev` and working directory as the repo.
3. Save and restart Claude Desktop. Tools appear under MCP tools.

## Running remotely (Hosted / HTTP)
This server includes an Express HTTP transport wired via `StreamableHTTPServerTransport`.

### Local HTTP (for testing)
```
pnpm web
# Endpoints
# GET  http://localhost:3000/health → { ok: true }
# GET  http://localhost:3000/docs   → { doc: "..." }
# POST http://localhost:3000/mcp    → MCP HTTP endpoint for clients that support HTTP transport
```

### One‑click deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/salesforcebob/Salesforce-Marketing-Cloud-Engagement-MCP)

After clicking Deploy:
- Set required env vars (at minimum): `MCE_PROFILE_DEFAULT`, `MCE_DEV_CLIENT_ID`, `MCE_DEV_CLIENT_SECRET`, `MCE_DEV_SUBDOMAIN` (and optionally `MCE_DEV_ACCOUNT_ID`).
- Deploy and open the app. Verify:
  - `GET /health` returns `{ ok: true }`
  - `GET /docs` returns a documentation payload
  - `POST /mcp` is the MCP HTTP endpoint for tools

Notes:
- Heroku assigns `PORT` dynamically; the server reads `process.env.PORT` automatically.

Using with HTTP‑capable MCP clients:
- Point the client at `<your-app-url>/mcp` as the MCP HTTP endpoint.
- Tools available: `mce_v1_health`, `mce_v1_rest_request`, `mce_v1_soap_request`, `mce_v1_documentation`.

Security notes:
- Scope your Installed Package to least privilege.
- Treat `.env` as sensitive; store secrets securely in production.
- You'll probably want JWT or other additional security layer in front of this. Don't run this as a server on a open/public route, or anyone could pwn your MCE account.

## Available tools
- `mce_v1_health` — health check
- `mce_v1_rest_request` — generic REST request to MCE (supports BU scoping)
- `mce_v1_soap_request` — generic SOAP request to MCE (supports BU scoping)
 - `mce_v1_documentation` — returns curated MCE docs and MCP usage guide
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
- Run `mce_v1_documentation` in your MCP client to see curated docs and usage.



## Disclaimer
- This repository and MCP server are provided "as is" without warranties or guarantees of any kind, express or implied, including but not limited to functionality, security, merchantability, or fitness for a particular purpose.
- Use at your own risk. Review the source, perform a security assessment, and harden before any production deployment.
- Do not expose the HTTP endpoints publicly without proper authentication/authorization, rate limiting, logging, and monitoring.
- You are solely responsible for the protection of your credentials, secrets, data, and compliance with your organization’s security policies.
