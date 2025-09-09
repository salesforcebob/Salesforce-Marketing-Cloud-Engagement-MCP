## MCE MCP Server — Quickstart

### Prerequisites
- Node.js 18.17+ (LTS recommended)
- pnpm 10+
- Marketing Cloud Installed Package with Client ID/Secret

### Install
```
pnpm install
```

### Configure an auth profile
Option A — .env file (recommended for local dev):
1. Copy `docs/env.example` to `.env` in project root and fill values.
2. The server auto-loads `.env` via dotenv.

Option B — Shell env vars:
```
export MCE_PROFILE_DEFAULT=dev
export MCE_DEV_CLIENT_ID=your_client_id
export MCE_DEV_CLIENT_SECRET=your_client_secret
export MCE_DEV_SUBDOMAIN=your_subdomain
export MCE_DEV_ACCOUNT_ID=your_mid   # optional
```

### Run via npx (no local checkout required)
```
npx mce-mcp serve
```
Or with pnpm dlx:
```
pnpm dlx mce-mcp serve
```

### Run in dev
```
pnpm dev
```
This starts an MCP stdio server. In an IDE supporting MCP (e.g., Cursor), register the server’s command (`pnpm dev`) per the client’s configuration.

### Tools
- `mce.v1.health`: simple health check.
- `mce.v1.rest.request`: generic REST invocation. Inputs include `method`, `path`, `query`, `headers`, `body`.
- `mce.v1.soap.request`: generic SOAP invocation. Inputs include `action`, `objectType`, and optional `payloadRawXml`.
- AMPScript/SSJS utilities (format/lint): local developer tools for code quality.

### Example
Invoke `mce.v1.rest.request` with:
```
{
  "method": "GET",
  "path": "/asset/v1/content/assets",
  "query": { "$page": 1, "$pagesize": 10 }
}
```

### Troubleshooting
- Ensure `MCE_*` environment variables are present and correct.
- Some corporate networks require `HTTPS_PROXY`/`HTTP_PROXY` to be set.


