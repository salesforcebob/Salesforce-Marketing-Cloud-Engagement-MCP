import { describe, it, expect, vi } from "vitest";
import { MceSoapProvider } from "../src/providers/mce/soap.js";
import { AuthManager } from "../src/core/auth.js";
import { AppConfig } from "../src/core/config.js";

describe("MceSoapProvider", () => {
  it("wraps payload in SOAP envelope and posts", async () => {
    const fakeAuth = {
      getToken: vi.fn().mockResolvedValue({
        access_token: "tkn",
        token_type: "Bearer",
        expires_in: 3600,
        acquiredAt: Date.now(),
        soap_instance_url: "https://example.soap.marketingcloudapis.com/Service.asmx",
      }),
    } as unknown as AuthManager;

    const fakeFetch = vi.fn().mockResolvedValue(new Response("<Envelope/>", { status: 200 }));

    const provider = new MceSoapProvider(
      new (class extends (await import("../src/core/http.js")).HttpClient {
        constructor() { super({ fetchImpl: fakeFetch as any, baseDelayMs: 1 }); }
      })(),
      fakeAuth,
      { defaultProfile: "dev", profiles: { dev: { name: "dev", clientId: "id", clientSecret: "sec", subdomain: "sub" } } } as AppConfig
    );

    const out = await provider.request({ action: "Retrieve", objectType: "DataExtensionObject" });
    expect(out.status).toBe(200);
    expect(out.rawXml).toContain("Envelope");
    const body = (fakeFetch.mock.calls[0][1] as any).body as string;
    expect(body).toContain("fueloauth");
    expect(body).toContain("RetrieveRequest");
  });
});



