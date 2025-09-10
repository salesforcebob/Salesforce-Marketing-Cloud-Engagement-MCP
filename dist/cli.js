#!/usr/bin/env node

// src/cli.ts
import "dotenv/config";

// src/server.ts
import { z as z5 } from "zod";

// src/tools/health.ts
import { z } from "zod";
var healthInputSchema = z.object({
  ping: z.string().default("pong")
});
async function healthTool(input) {
  return { ok: true, echo: input.ping };
}

// src/core/config.ts
function loadConfigFromEnv(env = process.env) {
  const defaultProfile = env.MCE_PROFILE_DEFAULT || void 0;
  const profiles = {};
  const profileNames = /* @__PURE__ */ new Set();
  for (const key of Object.keys(env)) {
    const match = /^MCE_(.+)_(CLIENT_ID|CLIENT_SECRET|SUBDOMAIN|ACCOUNT_ID|BUSINESS_UNIT_ID)$/.exec(key);
    if (match) {
      profileNames.add(match[1].toLowerCase());
    }
  }
  for (const name of profileNames) {
    const upper = name.toUpperCase();
    const clientId = env[`MCE_${upper}_CLIENT_ID`];
    const clientSecret = env[`MCE_${upper}_CLIENT_SECRET`];
    const subdomain = env[`MCE_${upper}_SUBDOMAIN`];
    const accountId = env[`MCE_${upper}_ACCOUNT_ID`];
    const businessUnitId = env[`MCE_${upper}_BUSINESS_UNIT_ID`];
    if (!clientId || !clientSecret || !subdomain) {
      continue;
    }
    profiles[name] = {
      name,
      clientId,
      clientSecret,
      subdomain,
      accountId,
      businessUnitId
    };
  }
  return { defaultProfile, profiles };
}
function getActiveProfile(config, preferred) {
  const name = preferred || config.defaultProfile;
  if (name && config.profiles[name]) return config.profiles[name];
  const first = Object.values(config.profiles)[0];
  return first;
}

// src/server.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// src/providers/mce/rest.ts
import { z as z3 } from "zod";

// src/core/http.ts
var HttpClient = class {
  maxRetries;
  baseDelayMs;
  timeoutMs;
  redactions;
  fetchImpl;
  constructor(opts = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 300;
    this.timeoutMs = opts.timeoutMs ?? 3e4;
    this.redactions = opts.redactions ?? [];
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }
  redact(input) {
    let out = input;
    for (const r of this.redactions) {
      out = out.replace(r.pattern, r.replacement ?? "<redacted>");
    }
    return out;
  }
  async delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  computeDelay(attempt) {
    const base = this.baseDelayMs * 2 ** attempt;
    const jitter = Math.random() * this.baseDelayMs;
    return base + jitter;
  }
  async request(input, init) {
    let attempt = 0;
    let lastErr;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(input, { ...init, signal: controller.signal });
        if (res.status === 429 || res.status >= 500 && res.status < 600) {
          if (attempt === this.maxRetries) return res;
          const retryAfter = Number(res.headers.get("retry-after"));
          const delayMs = !Number.isNaN(retryAfter) ? retryAfter * 1e3 : this.computeDelay(attempt);
          await this.delay(delayMs);
          attempt++;
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt === this.maxRetries) throw err;
        await this.delay(this.computeDelay(attempt));
        attempt++;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastErr;
  }
};

// src/core/auth.ts
import { z as z2 } from "zod";
var TokenResponse = z2.object({
  access_token: z2.string(),
  token_type: z2.string().default("Bearer"),
  expires_in: z2.number(),
  scope: z2.string().optional(),
  soap_instance_url: z2.string().url().optional(),
  rest_instance_url: z2.string().url().optional()
});
var AuthManager = class {
  constructor(fetchImpl = fetch) {
    this.fetchImpl = fetchImpl;
  }
  tokens = /* @__PURE__ */ new Map();
  key(profile2) {
    const context = profile2.businessUnitId || profile2.accountId || "";
    return `${profile2.name}:${context}`;
  }
  isExpired(token) {
    const now = Date.now();
    const ageSec = (now - token.acquiredAt) / 1e3;
    return ageSec >= token.expires_in - 60;
  }
  async getToken(profile2) {
    const key = this.key(profile2);
    const existing = this.tokens.get(key);
    if (existing && !this.isExpired(existing)) return existing;
    const next = await this.fetchToken(profile2);
    this.tokens.set(key, next);
    return next;
  }
  async fetchToken(profile2) {
    const url = `https://${profile2.subdomain}.auth.marketingcloudapis.com/v2/token`;
    const body = {
      grant_type: "client_credentials",
      client_id: profile2.clientId,
      client_secret: profile2.clientSecret,
      // Prefer Business Unit MID when provided; falls back to top-level Account MID
      account_id: profile2.businessUnitId || profile2.accountId
    };
    if (!profile2.accountId && !profile2.businessUnitId) delete body.account_id;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token request failed: ${res.status} ${res.statusText} - ${text}`);
    }
    const json = await res.json();
    const parsed = TokenResponse.parse(json);
    return { ...parsed, acquiredAt: Date.now() };
  }
};

// src/providers/mce/rest.ts
var restRequestInputSchema = z3.object({
  method: z3.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z3.string().describe("Path under the REST base, e.g. /hub/v1/dataevents/key:Orders/rowset"),
  query: z3.record(z3.any()).optional(),
  headers: z3.record(z3.string()).optional(),
  body: z3.any().optional(),
  timeoutMs: z3.number().int().positive().optional(),
  attachments: z3.array(
    z3.object({ name: z3.string(), mimeType: z3.string(), dataBase64: z3.string() })
  ).optional(),
  asAttachment: z3.boolean().default(false).describe("If true, stream response as attachment when large"),
  raw: z3.boolean().default(false).describe("If true, return raw response body without normalization"),
  profile: z3.string().optional().describe("Named auth profile to use"),
  businessUnitId: z3.string().optional().describe("Optional BU MID to scope token (account_id)")
});
var MceRestProvider = class {
  http;
  auth;
  config;
  constructor(http = new HttpClient(), auth = new AuthManager(), config = loadConfigFromEnv()) {
    this.http = http;
    this.auth = auth;
    this.config = config;
  }
  buildUrl(base, path, query) {
    const url = new URL(path, base);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === void 0 || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
  async request(input) {
    const profile2 = getActiveProfile(this.config, input.profile);
    if (!profile2) {
      throw new Error("No active profile configured. Set env vars MCE_<PROFILE>_* or MCE_PROFILE_DEFAULT.");
    }
    const effectiveProfile = input.businessUnitId ? { ...profile2, businessUnitId: input.businessUnitId } : profile2;
    const token = await this.auth.getToken(effectiveProfile);
    const restBase = token.rest_instance_url || `https://${effectiveProfile.subdomain}.rest.marketingcloudapis.com/`;
    const url = this.buildUrl(restBase, input.path, input.query);
    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      "content-type": input.body ? "application/json" : void 0,
      ...input.headers || {}
    };
    if (!headers["content-type"]) delete headers["content-type"];
    const res = await this.http.request(url, {
      method: input.method,
      headers,
      body: input.body ? JSON.stringify(input.body) : void 0
    });
    const outHeaders = {};
    for (const [k, v] of res.headers.entries()) outHeaders[k] = v;
    if (input.asAttachment) {
      const array = new Uint8Array(await res.arrayBuffer());
      const b64 = Buffer.from(array).toString("base64");
      return {
        status: res.status,
        headers: outHeaders,
        attachment: {
          name: "response.bin",
          mimeType: res.headers.get("content-type") || "application/octet-stream",
          dataBase64: b64
        }
      };
    }
    const contentType = res.headers.get("content-type") || "";
    if (input.raw) {
      const text2 = await res.text();
      return { status: res.status, headers: outHeaders, data: text2 };
    }
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return { status: res.status, headers: outHeaders, data };
    }
    const text = await res.text();
    return { status: res.status, headers: outHeaders, data: text };
  }
};

// src/providers/mce/soap.ts
import { z as z4 } from "zod";
import { XMLParser } from "fast-xml-parser";
var soapRequestInputSchema = z4.object({
  action: z4.enum(["Create", "Retrieve", "Update", "Delete", "Perform", "Configure"]).describe("SOAP action"),
  objectType: z4.string().describe("SOAP object type, e.g., DataExtensionObject"),
  properties: z4.union([z4.array(z4.string()), z4.record(z4.any())]).optional(),
  filter: z4.any().optional(),
  options: z4.record(z4.any()).optional(),
  payloadRawXml: z4.string().optional().describe("Optional raw XML payload to send as-is"),
  profile: z4.string().optional(),
  businessUnitId: z4.string().optional().describe("Optional BU MID to scope SOAP token (account_id)")
});
function buildSoapEnvelope(token, bodyXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
      <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
    </s:Header>
    <s:Body>${bodyXml}</s:Body>
  </s:Envelope>`;
}
function buildActionBody(input) {
  const ns = "http://exacttarget.com/wsdl/partnerAPI";
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (input.payloadRawXml) return input.payloadRawXml;
  switch (input.action) {
    case "Retrieve": {
      const props = Array.isArray(input.properties) ? input.properties : input.properties ? Object.keys(input.properties) : [];
      const propsXml = props.map((p) => `<Properties>${esc(p)}</Properties>`).join("");
      const opt = input.options || {};
      const ids = opt.clientIds ? Array.isArray(opt.clientIds) ? opt.clientIds : [opt.clientIds] : [];
      const clientIdsXml = ids.length ? `<ClientIDs>${ids.map((id) => `<ClientID><ID>${esc(String(id))}</ID></ClientID>`).join("")}</ClientIDs>` : "";
      const queryAllXml = opt.queryAllAccounts ? `<QueryAllAccounts>true</QueryAllAccounts>` : "";
      const continueXml = opt.continueRequest ? `<ContinueRequest>${esc(String(opt.continueRequest))}</ContinueRequest>` : "";
      const f = input.filter;
      const filterXml = f ? `<Filter xsi:type="SimpleFilterPart" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
               <Property>${esc(String(f.property || f.Property || "CustomerKey"))}</Property>
               <SimpleOperator>${esc(String(f.operator || f.SimpleOperator || "equals"))}</SimpleOperator>
               <Value>${esc(String(f.value ?? f.Value ?? ""))}</Value>
             </Filter>` : "";
      return `<RetrieveRequestMsg xmlns="${ns}">
          <RetrieveRequest>
            <ObjectType>${esc(input.objectType)}</ObjectType>
            ${propsXml}
            ${clientIdsXml}
            ${queryAllXml}
            ${continueXml}
            ${filterXml}
          </RetrieveRequest>
        </RetrieveRequestMsg>`;
    }
    case "Create":
      return `<CreateRequest xmlns="${ns}">
        <Objects xsi:type="${esc(input.objectType)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></Objects>
      </CreateRequest>`;
    default:
      return `<${input.action}Request xmlns="${ns}"></${input.action}Request>`;
  }
}
var MceSoapProvider = class {
  constructor(http = new HttpClient(), auth = new AuthManager(), config = loadConfigFromEnv()) {
    this.http = http;
    this.auth = auth;
    this.config = config;
  }
  async request(input) {
    const baseProfile = getActiveProfile(this.config, input.profile);
    if (!baseProfile) throw new Error("No active profile configured.");
    const effectiveProfile = input.businessUnitId ? { ...baseProfile, businessUnitId: input.businessUnitId } : baseProfile;
    const token = await this.auth.getToken(effectiveProfile);
    let soapBase = token.soap_instance_url || `https://${profile.subdomain}.soap.marketingcloudapis.com/Service.asmx`;
    try {
      const u = new URL(soapBase);
      if (!/Service\.asmx$/i.test(u.pathname)) {
        u.pathname = (u.pathname.endsWith("/") ? u.pathname : u.pathname + "/") + "Service.asmx";
      }
      soapBase = u.toString();
    } catch {
    }
    const adjustedInput = input.businessUnitId ? { ...input, options: { ...input.options || {}, clientIds: void 0 } } : input;
    const bodyXml = buildActionBody(adjustedInput);
    const envelope = buildSoapEnvelope(token.access_token, bodyXml);
    const res = await this.http.request(soapBase, {
      method: "POST",
      headers: {
        "content-type": "text/xml; charset=utf-8",
        SOAPAction: input.action === "Retrieve" ? "Retrieve" : input.action
      },
      body: envelope
    });
    const rawXml = await res.text();
    let overallStatus;
    let requestId;
    let results;
    try {
      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const parsed = parser.parse(rawXml);
      const body = parsed?.Envelope?.Body || parsed?.Body || parsed;
      const resp = body?.RetrieveResponseMsg || body?.RetrieveResponse || body;
      overallStatus = resp?.OverallStatus;
      requestId = resp?.RequestID || resp?.RequestId;
      let r = resp?.Results;
      if (r) {
        results = Array.isArray(r) ? r : [r];
      }
    } catch {
    }
    return { status: res.status, overallStatus, requestId, results, rawXml };
  }
};

// src/server.ts
async function createServer() {
  const transport = new StdioServerTransport();
  const mcpServer = new McpServer(
    { name: "mce-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  loadConfigFromEnv();
  mcpServer.registerTool(
    "mce_v1_health",
    {
      description: "Health check tool. Echoes input and confirms server readiness.",
      inputSchema: {
        ping: z5.string().default("pong").describe("Echo payload")
      },
      outputSchema: {
        ok: z5.boolean(),
        echo: z5.string()
      }
    },
    async ({ ping }) => {
      const out = await healthTool({ ping });
      return {
        content: [{ type: "text", text: `ok=${out.ok} echo=${out.echo}` }],
        structuredContent: out
      };
    }
  );
  const restProvider = new MceRestProvider();
  mcpServer.registerTool(
    "mce_v1_rest_request",
    {
      description: "Generic REST request for Salesforce Marketing Cloud Engagement. Provide method, path, query, headers, and optional JSON body. OAuth is injected; retries and timeouts handled.",
      inputSchema: {
        method: z5.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z5.string().describe("Path under REST base, e.g., /asset/v1/content/assets"),
        query: z5.record(z5.any()).optional(),
        headers: z5.record(z5.string()).optional(),
        body: z5.any().optional(),
        timeoutMs: z5.number().int().positive().optional(),
        attachments: z5.array(
          z5.object({
            name: z5.string(),
            mimeType: z5.string(),
            dataBase64: z5.string()
          })
        ).optional(),
        asAttachment: z5.boolean().default(false),
        raw: z5.boolean().default(false),
        profile: z5.string().optional(),
        businessUnitId: z5.string().optional()
      },
      outputSchema: {
        status: z5.number(),
        headers: z5.record(z5.string()),
        data: z5.any().optional(),
        attachment: z5.object({ name: z5.string(), mimeType: z5.string(), dataBase64: z5.string() }).optional()
      }
    },
    async (args) => {
      const out = await restProvider.request(args);
      return {
        content: [
          {
            type: "text",
            text: `HTTP ${out.status} ${out.attachment ? "(attachment)" : ""}`.trim()
          }
        ],
        structuredContent: out
      };
    }
  );
  const soapProvider = new MceSoapProvider();
  mcpServer.registerTool(
    "mce_v1_soap_request",
    {
      description: "Generic SOAP request for Salesforce Marketing Cloud Engagement. Supports Create, Retrieve, Update, Delete, Perform, Configure. Either provide properties/filter/options or a raw XML payload.",
      inputSchema: {
        action: z5.enum(["Create", "Retrieve", "Update", "Delete", "Perform", "Configure"]),
        objectType: z5.string(),
        properties: z5.record(z5.any()).optional(),
        filter: z5.any().optional(),
        options: z5.record(z5.any()).optional(),
        payloadRawXml: z5.string().optional(),
        profile: z5.string().optional()
      },
      outputSchema: {
        status: z5.number(),
        overallStatus: z5.string().optional(),
        requestId: z5.string().optional(),
        results: z5.array(z5.any()).optional(),
        rawXml: z5.string().optional()
      }
    },
    async (args) => {
      const out = await soapProvider.request(args);
      return {
        content: [{ type: "text", text: `SOAP status=${out.status}` }],
        structuredContent: out
      };
    }
  );
  await mcpServer.connect(transport);
}

// src/cli.ts
async function main() {
  const [, , cmd = "serve"] = process.argv;
  if (cmd === "serve") {
    await createServer();
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
