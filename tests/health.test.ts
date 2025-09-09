import { describe, it, expect } from "vitest";
import { healthTool } from "../src/tools/health.js";

describe("health tool", () => {
  it("echoes ping and returns ok", async () => {
    const res = await healthTool({ ping: "hello" });
    expect(res.ok).toBe(true);
    expect(res.echo).toBe("hello");
  });
});



