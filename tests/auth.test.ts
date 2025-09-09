import { describe, it, expect, vi } from "vitest";
import { AuthManager } from "../src/core/auth.js";
import { MceProfile } from "../src/core/config.js";

describe("AuthManager", () => {
  const profile: MceProfile = {
    name: "test",
    clientId: "id",
    clientSecret: "secret",
    subdomain: "mysubdomain",
  };

  it("fetches and caches token", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ access_token: "abc", token_type: "Bearer", expires_in: 3600 }),
      text: async () => "",
    });

    const am = new AuthManager(fakeFetch as any);
    const t1 = await am.getToken(profile);
    const t2 = await am.getToken(profile);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(t1.access_token).toBe("abc");
    expect(t2.access_token).toBe("abc");
  });
});



