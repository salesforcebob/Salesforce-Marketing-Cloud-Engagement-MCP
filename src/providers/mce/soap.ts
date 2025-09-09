import { z } from "zod";
import { AuthManager } from "../../core/auth.js";
import { AppConfig, getActiveProfile, loadConfigFromEnv } from "../../core/config.js";
import { HttpClient } from "../../core/http.js";

export const soapRequestInputSchema = z.object({
  action: z.enum(["Create", "Retrieve", "Update", "Delete", "Perform", "Configure"]).describe("SOAP action"),
  objectType: z.string().describe("SOAP object type, e.g., DataExtensionObject"),
  properties: z.record(z.any()).optional(),
  filter: z.any().optional(),
  options: z.record(z.any()).optional(),
  payloadRawXml: z.string().optional().describe("Optional raw XML payload to send as-is"),
  profile: z.string().optional(),
});

export type SoapRequestInput = z.infer<typeof soapRequestInputSchema>;

export type SoapRequestOutput = {
  status: number;
  overallStatus?: string;
  requestId?: string;
  results?: any[];
  rawXml?: string;
};

function buildSoapEnvelope(token: string, bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
      <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
    </s:Header>
    <s:Body>${bodyXml}</s:Body>
  </s:Envelope>`;
}

function buildActionBody(input: SoapRequestInput): string {
  // Minimal generic mapping for core actions; typed helpers will provide richer variants later.
  const ns = "http://exacttarget.com/wsdl/partnerAPI";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (input.payloadRawXml) return input.payloadRawXml;
  switch (input.action) {
    case "Retrieve":
      return `<RetrieveRequestMsg xmlns="${ns}">
        <RetrieveRequest>
          <ObjectType>${esc(input.objectType)}</ObjectType>
        </RetrieveRequest>
      </RetrieveRequestMsg>`;
    case "Create":
      return `<CreateRequest xmlns="${ns}">
        <Objects xsi:type="${esc(input.objectType)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></Objects>
      </CreateRequest>`;
    default:
      return `<${input.action}Request xmlns="${ns}"></${input.action}Request>`;
  }
}

export class MceSoapProvider {
  constructor(
    private http = new HttpClient(),
    private auth = new AuthManager(),
    private config: AppConfig = loadConfigFromEnv()
  ) {}

  async request(input: SoapRequestInput): Promise<SoapRequestOutput> {
    const profile = getActiveProfile(this.config, input.profile);
    if (!profile) throw new Error("No active profile configured.");
    const token = await this.auth.getToken(profile);
    const soapBase = token.soap_instance_url || `https://${profile.subdomain}.soap.marketingcloudapis.com/Service.asmx`;

    const bodyXml = buildActionBody(input);
    const envelope = buildSoapEnvelope(token.access_token, bodyXml);
    const res = await this.http.request(soapBase, {
      method: "POST",
      headers: { "content-type": "text/xml; charset=utf-8" },
      body: envelope,
    });
    const rawXml = await res.text();
    return { status: res.status, rawXml };
  }
}



