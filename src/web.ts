import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer } from "./server.js";
import { buildDocumentationString } from "./tools/documentation.js";

type Json = Record<string, any>;

export async function startWebServer() {
  const port = Number(process.env.PORT || 3000);
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/docs", (_req, res) => res.status(200).json({ doc: buildDocumentationString() }));

  app.post("/mcp", async (req, res) => {
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req as any, res as any, req.body as any);
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`MCE MCP Express server listening on :${port}`);
  });
}


