## MCE MCP Server — Product Requirements Document (PRD)

### Document metadata
- **Name**: Marketing Cloud Engagement (MCE) MCP Server — PRD
- **Author**: Engineering (MCP Platform), Marketing Cloud SME
- **Version**: 0.1 (Draft)
- **Last updated**: YYYY-MM-DD

### Summary
Build a Model Context Protocol (MCP) server that exposes comprehensive, production-grade tools for Salesforce Marketing Cloud Engagement (MCE), covering 100% of public REST and SOAP APIs, plus Assistant-grade developer tools for AMPScript and Server-Side JavaScript (SSJS). The server must be MCP-spec compliant, easy to install and run across common MCP client environments (IDEs like Cursor, local CLI, remote daemon), secure-by-default, well-tested, and thoroughly documented.

References:
- MCP docs: getting started, lifecycle, schema, security, auth, SDKs, architecture, server/client concepts, versioning best practices.
- Marketing Cloud Engagement: Overview; Marketing Cloud Engagement APIs and Programmatic Languages; AMPScript docs.

### Goals
- Provide MCP tools that cover every public MCE REST and SOAP endpoint (breadth-first, then depth for convenience/ergonomics via typed helpers).
- Provide AMPScript and SSJS authoring tools: format, lint, explain, scaffold/snippet generation, static analysis and safe remote execution hooks.
- First-class MCP compliance (latest 2025-06-18 spec), with secure transport(s), rich tool descriptions, schemas, attachments, and resource streaming where applicable.
- Run-anywhere: stdio for IDEs, HTTP/WebSocket for remote server usage, and Docker container distribution.
- High reliability: robust auth, retries, rate limiting, circuit breaking, cache, idempotency when feasible.
- High test coverage: unit, contract, integration (opt-in live), and E2E via MCP Inspector/clients.
- Excellent documentation, examples, and quickstarts.

### Non-goals
- Replacing Salesforce official SDKs or UIs.
- Unlimited local execution of SSJS/AMPScript in a true MCE runtime (provide static analysis and explicit, guarded remote execution only).
- Vendor-locked deployment tooling; the server remains portable.

### Personas
- **Marketing Cloud Developer**: Needs to query/update assets, data extensions, automations, journeys; write AMPScript/SSJS; troubleshoot.
- **Marketing Ops/Analyst**: Needs read/reporting; safely run automations; export data.
- **AI Agent Builder**: Needs stable MCP tools with strong schemas and error handling to integrate into agents.

### User stories (selected)
- As a developer, I can call any MCE REST endpoint via a typed MCP tool with validated inputs and get structured outputs.
- As a developer, I can invoke SOAP operations (Create, Retrieve, Update, Delete, Perform) on any supported object through a single generic tool and typed helpers.
- As a developer, I can format and lint AMPScript/SSJS and get actionable diagnostics with fix suggestions.
- As a developer, I can scaffold SSJS `WSProxy` and AMPScript snippets for common tasks (DE CRUD, Triggered Sends, Asset CRUD, Automation run).
- As a developer, I can securely configure auth using Installed Packages and reuse tokens across tools with automatic refresh.
- As a developer, I can stream large downloads (asset binaries, exports) as MCP attachments.
- As an engineer, I can run E2E tests locally (without real creds) using recorded fixtures; optionally run live tests by setting environment variables.

### Assumptions & constraints
- Authentication uses MCE Installed Package credentials. Token acquisition lives at `https://<subdomain>.auth.marketingcloudapis.com/v2/token`, producing REST and SOAP base URLs.
- REST base: `https://<subdomain>.rest.marketingcloudapis.com`; SOAP base: `https://<subdomain>.soap.marketingcloudapis.com`.
- Rate limits vary by endpoint; implement adaptive retry with randomized exponential backoff and respect `Retry-After`/429/5xx semantics.
- Some REST resources lack authoritative OpenAPI; we will ingest official Postman collections (where available) plus curated specs.
- SOAP is driven by official WSDL; SSJS `WSProxy` mirrors SOAP operations; we provide typed helpers for common objects.

## Functional requirements

### 1) Comprehensive MCE REST coverage
- Provide a generic tool: `mce.rest.request`
  - Inputs: `method`, `path`, `query`, `headers`, `body`, `timeoutMs`, `attachments` (for upload), `asAttachment` (download behavior), `raw` (bypass normalization), `profile` (named auth profile).
  - Outputs: `status`, `headers`, `data` (JSON), optional `attachment` handle(s).
  - Behavior: resolves full URL from configured base, injects OAuth token, handles retries, redaction, and streaming.
- Provide generated typed tools for each REST family with verbose descriptions and zod/JSON Schema-validated inputs (examples):
  - Data Extensions: rows CRUD, keys, fields, queries.
  - Journey Builder: interactions/definitions/versions; entry events; state.
  - Automations: list, schedule, start/stop, status.
  - Assets (Content Builder): assets CRUD, folders, queries, binaries.
  - Transactional Messaging: email and sms send endpoints.
  - Contacts and Audiences, Event Definitions, Campaigns, Folders, Audit, MobilePush, MobileConnect (SMS), Push.
  - Additional families as documented under “Marketing Cloud Engagement APIs and Programmatic Languages”.
- Tool descriptions must include: endpoint summary, parameter tables, auth notes, rate-limit hints, example requests/responses, error codes, and links to official docs.

### 2) Comprehensive MCE SOAP coverage
- Provide a generic tool: `mce.soap.request`
  - Inputs: `action` (Create/Retrieve/Update/Delete/Perform/Configure etc.), `objectType`, `properties`, `filter`, `options`, `payloadRawXml` (optional), `profile`.
  - Outputs: SOAP envelope parsing result with `overallStatus`, `requestId`, `results[]`, raw XML (optional), warnings.
  - Behavior: token injection, WSDL-driven validation, chunking for large Retrieve, pagination via `ContinueRequest`.
- Provide typed helpers (generated):
  - Examples: `mce.soap.retrieveDataExtensionObject`, `mce.soap.createSubscriber`, `mce.soap.performTriggeredSend`, `mce.soap.updateAsset`, etc.
  - Each helper describes SOAP object fields, constraints, and examples; includes `WSProxy` equivalents for SSJS reference.

### 3) AMPScript developer tools
- `ampscript.format`: opinionated formatter respecting AMPScript syntax.
- `ampscript.lint`: semantic checks (undeclared variables, DE field mismatch hints, deprecated functions).
- `ampscript.explain`: line-by-line explanation with safe output rendering.
- `ampscript.snippet.generate`: templates for DE CRUD, personalization strings, conditional content, lookups.
- `ampscript.simulate`: dry-run evaluator for deterministic subsets (pure string/regex/date/math/logical); never executes HTTP/file I/O.

### 4) SSJS developer tools
- `ssjs.format`: Prettier-based with SSJS grammar extensions.
- `ssjs.lint`: ESLint profile for SSJS globals (`Platform`, `Script.Util`, `WSProxy`, `Core`), security rules, and best practices.
- `ssjs.wsproxy.scaffold`: generate `WSProxy` patterns for common SOAP objects.
- `ssjs.snippet.generate`: common patterns (DE CRUD, Triggered Send, Asset CRUD, Automation run, REST invocation).
- `ssjs.typehints`: inline JSDoc typings for SSJS globals to improve IDE completion.
- Optional guarded `ssjs.remote.execute`: executes Script Activity via REST when explicitly enabled; redacts outputs; requires `allowRemoteExecution=true` and separate credentials policy.

### 5) Authentication & configuration
- Support multiple named profiles (multi-tenant, multi-BU) with: `clientId`, `clientSecret`, `subdomain`, `accountId` (MID), `businessUnitId` (if applicable), scopes.
- Secure secret storage: environment variables by default; optional OS keychain or file-based KMS integration.
- Auto token acquisition and refresh; cache tokens per profile and BU.
- Proxy support (HTTP(S), corporate proxies) and custom CA bundles.

### 6) Observability & error handling
- Structured logs with redaction; correlation IDs; per-request tracing; optional OpenTelemetry hooks.
- Consistent error envelope for all tools with `type`, `message`, `hint`, `docsUrl`, `statusCode`, `requestId`, `retryable`.
- Adaptive retry on 429/5xx with jitter; configurable max attempts and circuit breaking.

### 7) Data handling & attachments
- Streaming downloads for large exports and asset binaries; surfaced as MCP attachments.
- Large uploads via multipart with progress reporting when client supports it.
- JSON normalization for common patterns (e.g., REST list result pagination fields) while preserving `raw` mode opt-out.

### 8) Security & compliance
- Follow MCP Security Best Practices: principle of least privilege, explicit tool enablement, rate limiting, and redaction.
- Domain allowlist to prevent SSRF; strict URL construction (never trust input for hostnames).
- Content sniffing disabled on attachments; size limits and timeouts.
- Versioned tool namespaces to allow safe upgrades (e.g., `mce.v1.*`).

### 9) Documentation
- `docs/` includes: Quickstart, Auth guide, Configuration, Tool catalog (auto-generated index), AMPScript/SSJS guides, Troubleshooting, FAQ, Examples.
- Rich examples for common workflows: import CSV to DE, trigger email, clone an asset, run automation, retrieve journey status.
- Cross-links to official Salesforce docs for each tool.

### 10) Testing & quality
- Unit tests for: auth manager, rest client, soap client, codegen, formatters/linters, tool registries.
- Contract tests auto-generated from REST/Soap specs for shape validation.
- Integration tests (opt-in live) gated by `MCE_TEST_LIVE=true` and credentialed profiles.
- E2E tests using MCP Inspector and a sample agent script; snapshot key flows.
- Code coverage target ≥ 85% for core modules; CI gate at 80%.

## Protocol & interoperability requirements
- MCP compliant with spec 2025-06-18: lifecycle, schema, tool description verbosity, resource/attachments, authorization handshake.
- Transports: stdio (default), HTTP, WebSocket; selectable via CLI.
- Tool metadata must include examples, types, and authoritative docs URLs.
- Backwards-compatible versioning: semantic server version; tool namespace version increments when breaking.

## Performance & scalability
- Concurrency controls per profile; connection pooling; HTTP keep-alive.
- Caching of reference metadata (e.g., folder tree) with TTL.
- Typical call p50 < 300ms (network excluded), retries bounded, memory footprint < 200MB idle.

## Milestones & acceptance criteria
- M1: Core skeleton, auth manager, generic REST/SOAP tools, docs Quickstart; smoke tests passing.
- M2: Generated REST typed tools (top-20 families), SOAP typed helpers, AMPScript/SSJS format/lint; unit+contract tests ≥ 70%.
- M3: Full REST coverage, SOAP breadth; attachments streaming; E2E tests; docs catalog; coverage ≥ 85%.
- GA: Hardening (perf, security review), Docker image, release notes, versioned docs, MCP Inspector validation.

Acceptance criteria:
- 100% REST/SOAP coverage (public endpoints/objects) via generic tools; ≥ 90% have typed helpers.
- AMPScript/SSJS tools deliver useful diagnostics and formatting.
- MCP Inspector can discover and execute tools; clients can stream attachments.
- Documentation enables a new developer to configure and successfully call 5 example workflows in < 30 minutes.

## Risks & mitigations
- Incomplete/undocumented REST coverage → ingest Postman collections, curate missing bits, and allow generic tool fallback.
- SOAP object complexity → rely on WSDL introspection and reusable filters/options builders.
- Credential misuse → strict separation of profiles, redaction, optional policy requiring read-only by default.
- Rate limiting/backoffs → adaptive retry and per-tool guidance.


