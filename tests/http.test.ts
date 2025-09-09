import { describe, it, expect, vi } from "vitest";
import { HttpClient } from "../src/core/http.js";

describe("HttpClient", () => {
  it("retries on 500 and eventually returns response", async () => {
    const r500 = new Response("server error", { status: 500 });
    const r200 = new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    const fakeFetch = vi.fn()
      .mockResolvedValueOnce(r500)
      .mockResolvedValueOnce(r200);
    const http = new HttpClient({ fetchImpl: fakeFetch as any, baseDelayMs: 1, maxRetries: 2 });
    const res = await http.request("https://example.com");
    expect(res.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });
});



