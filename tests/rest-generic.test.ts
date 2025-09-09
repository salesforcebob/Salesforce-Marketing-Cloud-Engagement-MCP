import { describe, it, expect, vi } from "vitest";
import { MceRestProvider } from "../src/providers/mce/rest.js";
import { AuthManager } from "../src/core/auth.js";
import { AppConfig } from "../src/core/config.js";

describe("MceRestProvider", () => {
  it("builds URL, injects token, returns JSON", async () => {
    const fakeAuth = {
      getToken: vi.fn().mockResolvedValue({
        access_token: "tkn",
        token_type: "Bearer",
        expires_in: 3600,
        acquiredAt: Date.now(),
        rest_instance_url: "https://example.rest.marketingcloudapis.com/",
      }),
    } as unknown as AuthManager;

    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hello: "world" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const provider = new MceRestProvider(
      new (class extends (await import("../src/core/http.js")).HttpClient {
        constructor() { super({ fetchImpl: fakeFetch as any, baseDelayMs: 1 }); }
      })(),
      fakeAuth,
      { defaultProfile: "dev", profiles: { dev: { name: "dev", clientId: "id", clientSecret: "sec", subdomain: "sub" } } } as AppConfig
    );

    const out = await provider.request({ method: "GET", path: "/some/path", query: { a: 1 } });
    expect(out.status).toBe(200);
    expect(out.data.hello).toBe("world");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const reqUrl = (fakeFetch.mock.calls[0][0] as string);
    expect(reqUrl).toContain("/some/path");
    expect(reqUrl).toContain("a=1");
  });
});



