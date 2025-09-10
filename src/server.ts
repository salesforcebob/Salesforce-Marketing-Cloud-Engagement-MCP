import { z } from "zod";
import { healthTool } from "./tools/health.js";
import { loadConfigFromEnv } from "./core/config.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MceRestProvider } from "./providers/mce/rest.js";
import { MceSoapProvider } from "./providers/mce/soap.js";

export async function createServer() {
  const transport = new StdioServerTransport();
  const mcpServer = new McpServer(
    { name: "mce-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // Load config at startup (makes errors obvious early)
  loadConfigFromEnv();

  // Register health as a proper MCP tool with structuredContent (underscore-only)
  mcpServer.registerTool(
    "mce_v1_health",
    {
      description: "Health check tool. Echoes input and confirms server readiness.",
      inputSchema: {
        ping: z.string().default("pong").describe("Echo payload"),
      },
      outputSchema: {
        ok: z.boolean(),
        echo: z.string(),
      },
    },
    async ({ ping }) => {
      const out = await healthTool({ ping });
      return {
        content: [{ type: "text", text: `ok=${out.ok} echo=${out.echo}` }],
        structuredContent: out,
      };
    }
  );

  // Register generic REST tool (underscore-only)
  const restProvider = new MceRestProvider();
  mcpServer.registerTool(
    "mce_v1_rest_request",
    {
      description:
        "Generic REST request for Salesforce Marketing Cloud Engagement. Provide method, path, query, headers, and optional JSON body. OAuth is injected; retries and timeouts handled.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z
          .string()
          .describe("Path under REST base, e.g., /asset/v1/content/assets"),
        query: z.record(z.any()).optional(),
        headers: z.record(z.string()).optional(),
        body: z.any().optional(),
        timeoutMs: z.number().int().positive().optional(),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              mimeType: z.string(),
              dataBase64: z.string(),
            })
          )
          .optional(),
        asAttachment: z.boolean().default(false),
        raw: z.boolean().default(false),
        profile: z.string().optional(),
        businessUnitId: z.string().optional(),
      },
      outputSchema: {
        status: z.number(),
        headers: z.record(z.string()),
        data: z.any().optional(),
        attachment: z
          .object({ name: z.string(), mimeType: z.string(), dataBase64: z.string() })
          .optional(),
      },
    },
    async (args) => {
      const out = await restProvider.request(args as any);
      return {
        content: [
          {
            type: "text",
            text: `HTTP ${out.status} ${out.attachment ? "(attachment)" : ""}`.trim(),
          },
        ],
        structuredContent: out,
      };
    }
  );

  // Register generic SOAP tool (underscore-only)
  const soapProvider = new MceSoapProvider();
  mcpServer.registerTool(
    "mce_v1_soap_request",
    {
      description:
        "Generic SOAP request for Salesforce Marketing Cloud Engagement. Supports Create, Retrieve, Update, Delete, Perform, Configure. Either provide properties/filter/options or a raw XML payload.",
      inputSchema: {
        action: z.enum(["Create", "Retrieve", "Update", "Delete", "Perform", "Configure"]),
        objectType: z.string(),
        properties: z.record(z.any()).optional(),
        filter: z.any().optional(),
        options: z.record(z.any()).optional(),
        payloadRawXml: z.string().optional(),
        profile: z.string().optional(),
      },
      outputSchema: {
        status: z.number(),
        overallStatus: z.string().optional(),
        requestId: z.string().optional(),
        results: z.array(z.any()).optional(),
        rawXml: z.string().optional(),
      },
    },
    async (args) => {
      const out = await soapProvider.request(args as any);
      return {
        content: [{ type: "text", text: `SOAP status=${out.status}` }],
        structuredContent: out,
      };
    }
  );

  // Documentation tool: returns curated MCE doc links and MCP usage guide
  mcpServer.registerTool(
    "mce_v1_documentation",
    {
      description:
        "Returns Marketing Cloud Engagement documentation links and how to use this MCP server (tools, BU scoping, examples).",
      inputSchema: {},
      outputSchema: { doc: z.string() },
    },
    async () => {
      const doc = [
        "Marketing Cloud Engagement — Documentation & MCP Usage",
        "",
        "Authoritative MCE documentation (selected):",
        "- Marketing Cloud Engagement APIs and Programmatic Languages: https://developer.salesforce.com/docs/marketing/marketing-cloud/overview",
        "- Marketing Cloud Engagement Overview (Growth/Advanced): https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/overview",
        "- AMPScript for Marketing Cloud: https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/overview",
        "- Engagement Mobile SDK (MobilePush): https://developer.salesforce.com/docs/marketing/engagement-mobile-sdk/overview",
        "- REST Auth – Get Access Token (BU scoping via account_id): https://developer.salesforce.com/docs/marketing/marketing-cloud/references/mc_rest_auth?meta=getAccessToken",
        "",
        "Using this MCP server:",
        "Tools (underscore-only):",
        "- mce_v1_health: health check",
        "- mce_v1_rest_request: generic REST request",
        "- mce_v1_soap_request: generic SOAP request",
        "- mce_v1_documentation: this documentation response",
        "",
        "REST tool input:",
        "{ method, path, query?, headers?, body?, timeoutMs?, asAttachment?, raw?, profile?, businessUnitId? }",
        "Notes:",
        "- businessUnitId (MID) scopes the token using account_id as per REST auth docs.",
        "- Base URL is resolved from the token (rest_instance_url). ‘path’ is appended, e.g., /data/v1/customobjects.",
        "",
        "REST examples:",
        "1) Search Data Extensions in a BU:",
        "  method=GET path=/data/v1/customobjects query={ $search: 'Happy Birthday Email', page:1, pageSize:25 } businessUnitId=<MID>",
        "2) List journeys in a BU:",
        "  method=GET path=/interaction/v1/interactions query={ page:1, pageSize:200 } businessUnitId=<MID>",
        "3) Create HTML Email in Content Builder root:",
        "  method=POST path=/asset/v1/content/assets businessUnitId=<MID> body={ name, customerKey, assetType:{id:208,name:'htmlemail'}, category:{id:<folderId>}, views:{subjectline:{content:'...'}, preheader:{content:'...'}, html:{content:'<html>...'}} }",
        "  Tip: Find root Content Builder folder via GET /asset/v1/content/categories",
        "",
        "SOAP tool input:",
        "{ action:'Retrieve'|'Create'|'Update'|'Delete'|'Perform'|'Configure', objectType, properties?, filter?, options?, payloadRawXml?, profile?, businessUnitId? }",
        "Notes:",
        "- businessUnitId acquires a BU-scoped token; when provided, the tool suppresses ClientIDs in the envelope to avoid mixed context.",
        "- Alternatively, omit businessUnitId and pass options.clientIds:[<MID>] and/or options.queryAllAccounts:true to control context.",
        "- Endpoint is normalized to /Service.asmx; SOAPAction headers are set.",
        "",
        "SOAP examples:",
        "1) Retrieve DataFolder hierarchy for Email:",
        "  action: 'Retrieve', objectType:'DataFolder', properties:['ID','Name','CustomerKey','ContentType','ParentFolder.ID','ParentFolder.Name'], filter:{ property:'ContentType', operator:'equals', value:'email' }, businessUnitId:<MID>",
        "2) Retrieve a DataExtension by CustomerKey:",
        "  action:'Retrieve', objectType:'DataExtension', properties:['Name','CustomerKey','CategoryID','IsSendable'], filter:{ property:'CustomerKey', operator:'equals', value:'Email_HappyBirthday' }, businessUnitId:<MID>",
        "",
        "Operational guidance:",
        "- Prefer REST for assets and journeys; use SOAP for DataFolder and some retrieve-only objects.",
        "- Paginate REST using page/pageSize. SOAP can return MoreDataAvailable with a ContinueRequest token; (basic flows supported).",
        "- AssetType: htmlemail id=208. Category (folder) IDs via /asset/v1/content/categories.",
        "- Always least-privilege your Installed Package.",
      ].join('\n');

      return {
        content: [{ type: "text", text: doc }],
        structuredContent: { doc },
      } as any;
    }
  );


  await mcpServer.connect(transport);
}


