import { z } from "zod";
import { healthInputSchema, healthTool } from "./tools/health.js";
import { loadConfigFromEnv } from "./core/config.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MceRestProvider, restRequestInputSchema } from "./providers/mce/rest.js";
import { MceSoapProvider, soapRequestInputSchema } from "./providers/mce/soap.js";

export async function createServer() {
  const transport = new StdioServerTransport();
  const server = new Server(
    {
      name: "mce-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register health tool
  server.tool("mce.v1.health", {
    description: "Health check tool. Echoes input and confirms server readiness.",
    inputSchema: healthInputSchema,
    outputSchema: z.object({ ok: z.boolean(), echo: z.string() }),
    async handler(input) {
      return healthTool(input);
    },
  });

  // Register generic REST tool
  const restProvider = new MceRestProvider();
  server.tool("mce.v1.rest.request", {
    description:
      "Generic REST request tool for Marketing Cloud Engagement. Provide method, path, query, headers, and optional JSON body. Automatically injects OAuth tokens and handles retries. Path is relative to the REST base URL.",
    inputSchema: restRequestInputSchema,
    outputSchema: z.object({
      status: z.number(),
      headers: z.record(z.string()),
      data: z.any().optional(),
      attachment: z
        .object({ name: z.string(), mimeType: z.string(), dataBase64: z.string() })
        .optional(),
    }),
    async handler(input) {
      return restProvider.request(input);
    },
  });

  // Register generic SOAP tool
  const soapProvider = new MceSoapProvider();
  server.tool("mce.v1.soap.request", {
    description:
      "Generic SOAP request tool for Marketing Cloud Engagement. Supports Create, Retrieve, Update, Delete, Perform, Configure. Either provide fields or raw XML payload. OAuth token is injected in a Fuel header.",
    inputSchema: soapRequestInputSchema,
    outputSchema: z.object({
      status: z.number(),
      overallStatus: z.string().optional(),
      requestId: z.string().optional(),
      results: z.array(z.any()).optional(),
      rawXml: z.string().optional(),
    }),
    async handler(input) {
      return soapProvider.request(input);
    },
  });

  // Load config at startup (makes errors obvious early)
  loadConfigFromEnv();

  await server.connect(transport);
}


