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

  // Register health as a proper MCP tool with structuredContent
  mcpServer.registerTool(
    "mce.v1.health",
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

  // Register generic REST tool
  const restProvider = new MceRestProvider();
  mcpServer.registerTool(
    "mce.v1.rest.request",
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

  // Register generic SOAP tool
  const soapProvider = new MceSoapProvider();
  mcpServer.registerTool(
    "mce.v1.soap.request",
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

  await mcpServer.connect(transport);
}


