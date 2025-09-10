import { z } from "zod";
import { HttpClient } from "../../core/http.js";
import { AuthManager } from "../../core/auth.js";
import { AppConfig, getActiveProfile, loadConfigFromEnv } from "../../core/config.js";

export const restRequestInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().describe("Path under the REST base, e.g. /hub/v1/dataevents/key:Orders/rowset"),
  query: z.record(z.any()).optional(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeoutMs: z.number().int().positive().optional(),
  attachments: z
    .array(
      z.object({ name: z.string(), mimeType: z.string(), dataBase64: z.string() })
    )
    .optional(),
  asAttachment: z.boolean().default(false).describe("If true, stream response as attachment when large"),
  raw: z.boolean().default(false).describe("If true, return raw response body without normalization"),
  profile: z.string().optional().describe("Named auth profile to use")
});

export type RestRequestInput = z.infer<typeof restRequestInputSchema>;

export type RestRequestOutput = {
  status: number;
  headers: Record<string, string>;
  data?: any;
  attachment?: { name: string; mimeType: string; dataBase64: string };
};

export class MceRestProvider {
  private http: HttpClient;
  private auth: AuthManager;
  private config: AppConfig;

  constructor(http = new HttpClient(), auth = new AuthManager(), config = loadConfigFromEnv()) {
    this.http = http;
    this.auth = auth;
    this.config = config;
  }

  private buildUrl(base: string, path: string, query?: Record<string, any>): string {
    const url = new URL(path, base);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async request(input: RestRequestInput): Promise<RestRequestOutput> {
    const profile = getActiveProfile(this.config, input.profile);
    if (!profile) {
      throw new Error("No active profile configured. Set env vars MCE_<PROFILE>_* or MCE_PROFILE_DEFAULT.");
    }
    const token = await this.auth.getToken(profile);
    const restBase = token.rest_instance_url || `https://${profile.subdomain}.rest.marketingcloudapis.com/`;
    const url = this.buildUrl(restBase, input.path, input.query);

    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      "content-type": input.body ? "application/json" : undefined,
      // If a BU is configured, pass the override header so REST routes to that BU
      ...(profile.businessUnitId ? { "x-mc-override-usermid": String(profile.businessUnitId) } : {}),
      ...(input.headers || {}),
    } as Record<string, string>;
    if (!headers["content-type"]) delete headers["content-type"];

    const res = await this.http.request(url, {
      method: input.method,
      headers,
      body: input.body ? JSON.stringify(input.body) : undefined,
    });

    const outHeaders: Record<string, string> = {};
    for (const [k, v] of res.headers.entries()) outHeaders[k] = v;

    if (input.asAttachment) {
      const array = new Uint8Array(await res.arrayBuffer());
      const b64 = Buffer.from(array).toString("base64");
      return {
        status: res.status,
        headers: outHeaders,
        attachment: {
          name: "response.bin",
          mimeType: res.headers.get("content-type") || "application/octet-stream",
          dataBase64: b64,
        },
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (input.raw) {
      const text = await res.text();
      return { status: res.status, headers: outHeaders, data: text };
    }
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return { status: res.status, headers: outHeaders, data };
    }
    const text = await res.text();
    return { status: res.status, headers: outHeaders, data: text };
  }
}



