import { z } from "zod";
import { MceProfile } from "./config.js";

const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string().default("Bearer"),
  expires_in: z.number(),
  scope: z.string().optional(),
  soap_instance_url: z.string().url().optional(),
  rest_instance_url: z.string().url().optional(),
});

export type TokenInfo = z.infer<typeof TokenResponse> & {
  acquiredAt: number;
};

export class AuthManager {
  private tokens = new Map<string, TokenInfo>();

  constructor(private fetchImpl: typeof fetch = fetch) {}

  private key(profile: MceProfile) {
    // Include BU/Account context in cache key so tokens are distinct per context
    const context = profile.businessUnitId || profile.accountId || "";
    return `${profile.name}:${context}`;
  }

  private isExpired(token: TokenInfo): boolean {
    const now = Date.now();
    const ageSec = (now - token.acquiredAt) / 1000;
    // Refresh 60s before expiry
    return ageSec >= token.expires_in - 60;
  }

  async getToken(profile: MceProfile): Promise<TokenInfo> {
    const key = this.key(profile);
    const existing = this.tokens.get(key);
    if (existing && !this.isExpired(existing)) return existing;
    const next = await this.fetchToken(profile);
    this.tokens.set(key, next);
    return next;
  }

  async fetchToken(profile: MceProfile): Promise<TokenInfo> {
    const url = `https://${profile.subdomain}.auth.marketingcloudapis.com/v2/token`;
    const body = {
      grant_type: "client_credentials",
      client_id: profile.clientId,
      client_secret: profile.clientSecret,
      // Prefer Business Unit MID when provided; falls back to top-level Account MID
      account_id: profile.businessUnitId || profile.accountId,
    } as Record<string, unknown>;
    if (!profile.accountId && !profile.businessUnitId) delete body.account_id;

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token request failed: ${res.status} ${res.statusText} - ${text}`);
    }
    const json = await res.json();
    const parsed = TokenResponse.parse(json);
    return { ...parsed, acquiredAt: Date.now() };
  }
}



