## Changelog

### 2025-09-09
- Enable npm publishability: added `bin` (`mce-mcp`), `files` whitelist, and `publishConfig` to `package.json` so the server can be run via `npx mce-mcp serve` without a local checkout.
- Added `prepublishOnly` script to ensure builds occur before publish.
- Updated `README.md` and `docs/QUICKSTART.md` with `npx`/`pnpm dlx` usage and Cursor setup commands.

### YYYY-MM-DD
- Added initial PRD (`mce-mcp-prd.md`) outlining goals, requirements, coverage (REST/SOAP), AMPScript/SSJS devtools, security, testing, and documentation.
- Added implementation plan (`mce-mcp-plan.md`) detailing architecture, modules, milestones (M1–M3), testing, security, and release strategy.


