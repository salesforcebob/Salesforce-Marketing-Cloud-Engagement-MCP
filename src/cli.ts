#!/usr/bin/env node
import "dotenv/config";
import { createServer } from "./server.js";
import { startWebServer } from "./web.js";

async function main() {
  const [, , cmd = "serve"] = process.argv;
  if (cmd === "serve") {
    await createServer();
  } else if (cmd === "web") {
    await startWebServer();
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


