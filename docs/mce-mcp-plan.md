## MCE MCP Server — Implementation Plan

### Document metadata
- **Name**: Marketing Cloud Engagement (MCE) MCP Server — Implementation Plan
- **Owners**: Engineering (MCP Platform), Marketing Cloud SME
- **Version**: 0.1 (Draft)
- **Last updated**: YYYY-MM-DD

### Architecture overview
- Language/runtime: TypeScript/Node.js LTS.
- Transports: stdio (default), HTTP, WebSocket using the official MCP server SDK.
- Modules:
  - `core/config`: profiles, secrets, validation.
  - `core/auth`: OAuth2 (Installed Package), token cache/refresh.
  - `core/http`: fetch wrapper, retry, backoff, circuit breaker, redaction.
  - `providers/mce/rest`: generic REST tool + generated typed tools.
  - `providers/mce/soap`: SOAP client (WSDL, envelope, pagination) + typed helpers.
  - `devtools/ampscript`: formatter, linter, explain, snippet generator, simulator.
  - `devtools/ssjs`: formatter, linter, `WSProxy` scaffolder, snippet generator, typehints, guarded remote execute.
  - `observability`: structured logging, metrics, tracing hooks.
  - `cli`: single binary entry for server run, profile mgmt, doctor.
- Data flow:
  - Client → MCP lifecycle handshake → tool discovery → tool invocation → auth manager issues token → REST/SOAP call → response normalization → return result/attachments.

### Tooling & dependencies
- MCP SDK: official Node SDK.
- HTTP: undici/fetch; SOAP: `strong-soap` or lightweight custom envelope builder + XML parser.
- Validation: zod + JSON Schema emit.
- Lint/format: Prettier (SSJS grammar extensions), ESLint custom rules, AMPScript lexer/formatter implemented in-house.
- Testing: Vitest/Jest, Playwright for E2E with MCP Inspector script harness.
- Build: pnpm, tsup or esbuild for bundling; Docker for distribution.

### Configuration & auth
- Environment-driven defaults: `MCE_PROFILE_DEFAULT`, `MCE_<PROFILE>_CLIENT_ID`, `MCE_<PROFILE>_CLIENT_SECRET`, `MCE_<PROFILE>_SUBDOMAIN`, `MCE_<PROFILE>_ACCOUNT_ID`.
- Config file support: `~/.mce-mcp/config.json` with encrypted secrets optional.
- Token cache: in-memory with disk-backed optional cache per profile; automatic refresh.
- BU switching: support `businessUnitId` for REST headers and SOAP `ClientID` context.

### Detailed work plan

Milestone M1 — Core foundation
1. Project scaffold (pnpm, TypeScript, lint/format, tsconfig, CI workflow).
2. MCP server skeleton with stdio transport; health tool.
3. Auth manager: token acquisition/refresh; profile registry; smoke tests.
4. HTTP client with retries/backoff, redaction, logging.
5. Generic tools:
   - `mce.v1.rest.request`
   - `mce.v1.soap.request`
6. Docs: Quickstart, Auth, Configuration; basic examples.

Milestone M2 — Developer experience & typed coverage
1. Codegen pipeline:
   - REST: import official Postman collections/specs; map to schemas; generate typed tools with doc links and examples.
   - SOAP: WSDL introspection; generate helpers for common objects and actions.
2. AMPScript devtools: formatter, linter, explain, snippet generator; unit tests.
3. SSJS devtools: formatter, linter, `WSProxy` scaffold, snippet generator, typehints; unit tests.
4. Observability: error envelope, correlation IDs, logs with redaction; OpenTelemetry hooks.
5. Docs: Tool catalog auto-generation; examples for top workflows.

Milestone M3 — Full coverage, attachments, hardening
1. Complete REST family coverage; add missing endpoints; ensure generic tool parity.
2. SOAP breadth: ensure Create/Retrieve/Update/Delete/Perform for key objects; pagination/ContinueRequest support.
3. Attachments: large downloads/uploads; streaming with MCP attachments; tests.
4. Security hardening: domain allowlist, size/time limits, guarded remote execute for SSJS; policy docs.
5. E2E tests: MCP Inspector scripts; sample agent flows; CI gating; coverage ≥ 85%.
6. Docker image, versioned release, changelog.

### Testing strategy
- Unit:
  - Auth manager (token, refresh, error paths).
  - REST client (retry matrix, rate limits, redaction).
  - SOAP client (envelope build/parse, pagination).
  - AMPScript/SSJS formatters/linters/snippets.
- Contract:
  - Generated schemas vs. real/recorded responses; schema drift alerts in CI.
- Integration (recorded):
  - Fixture-backed sequences for common flows; switchable to live.
- Live (opt-in):
  - Run against a sandbox MCE BU; masked outputs; never record secrets.
- E2E:
  - MCP Inspector-driven tasks: create DE row, read asset, run automation; snapshots.

### Security practices
- Secrets via env; optional OS keychain integration; zero secrets in logs.
- Principle of least privilege; read-only default profile example.
- Redact PII fields (email, phone) in logs by default.
- SSRF prevention: strict base URL construction, no dynamic hosts.
- Size/time caps; attachment content-type validation; checksum on upload/download (optional).

### Release & distribution
- Outputs: npm package, Docker image (`ghcr.io/<org>/mce-mcp:<version>`), binary via `pkg` (optional).
- Transports configurable by CLI flags; documented examples for IDEs (Cursor) and headless daemons.
- Versioning: semantic versions; tool namespace `mce.v1.*`; reserve `v2` for breaking changes.

### Developer ergonomics
- CLI commands: `mce-mcp serve`, `mce-mcp profiles add|list|test`, `mce-mcp doctor`.
- Autocomplete JSON schema examples in tool metadata.
- Rich error messages with remediation tips and doc links.

### Documentation plan
- Author and maintain: Quickstart, Auth, Config, Tool Catalog, AMPScript/SSJS Guides, Troubleshooting, Examples, FAQ.
- Auto-generate tool reference pages from codegen with examples.

### Acceptance checklist (DoD)
- Generic REST/SOAP tools function across all public endpoints/objects with validated inputs.
- ≥ 90% of endpoints have typed helpers with verbose docs and examples.
- AMPScript/SSJS tools deliver formatting, linting, snippets; optional guarded remote execute is policy-gated.
- E2E flows pass locally and in CI with fixtures; MCP Inspector validates interoperability.
- Docker image runs with minimal config; IDE integration guide works in Cursor.


