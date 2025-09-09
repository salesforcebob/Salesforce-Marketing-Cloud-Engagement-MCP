import { describe, it, expect } from "vitest";
import { loadConfigFromEnv, getActiveProfile } from "../src/core/config.js";

describe("config loader", () => {
  it("loads profiles from env variables", () => {
    const env = {
      MCE_PROFILE_DEFAULT: "prod",
      MCE_PROD_CLIENT_ID: "id",
      MCE_PROD_CLIENT_SECRET: "secret",
      MCE_PROD_SUBDOMAIN: "mcsubdomain",
      MCE_PROD_ACCOUNT_ID: "12345",
    } as any;
    const cfg = loadConfigFromEnv(env);
    expect(cfg.defaultProfile).toBe("prod");
    expect(Object.keys(cfg.profiles)).toContain("prod");
    const profile = getActiveProfile(cfg);
    expect(profile?.clientId).toBe("id");
    expect(profile?.subdomain).toBe("mcsubdomain");
  });
});



