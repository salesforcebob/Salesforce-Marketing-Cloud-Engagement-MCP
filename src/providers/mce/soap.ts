import { z } from "zod";
import { AuthManager } from "../../core/auth.js";
import { AppConfig, getActiveProfile, loadConfigFromEnv } from "../../core/config.js";
import { HttpClient } from "../../core/http.js";
import { XMLParser } from "fast-xml-parser";

export const soapRequestInputSchema = z.object({
  action: z.enum(["Create", "Retrieve", "Update", "Delete", "Perform", "Configure"]).describe("SOAP action"),
  objectType: z.string().describe("SOAP object type, e.g., DataExtensionObject"),
  properties: z.union([z.array(z.string()), z.record(z.any())]).optional(),
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
      {
        const props: string[] = Array.isArray(input.properties)
          ? (input.properties as string[])
          : input.properties
          ? Object.keys(input.properties as Record<string, unknown>)
          : [];
        const propsXml = props.map((p) => `<Properties>${esc(p)}</Properties>`).join("");
        const opt = (input.options || {}) as Record<string, any>;
        const ids = opt.clientIds
          ? (Array.isArray(opt.clientIds) ? opt.clientIds : [opt.clientIds])
          : [];
        const clientIdsXml = ids.length
          ? `<ClientIDs>${ids
              .map((id: any) => `<ClientID><ID>${esc(String(id))}</ID></ClientID>`)
              .join("")}</ClientIDs>`
          : "";
        const queryAllXml = opt.queryAllAccounts ? `<QueryAllAccounts>true</QueryAllAccounts>` : "";
        const continueXml = opt.continueRequest ? `<ContinueRequest>${esc(String(opt.continueRequest))}</ContinueRequest>` : "";
        const f = input.filter as any;
        const filterXml = f
          ? `<Filter xsi:type="SimpleFilterPart" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
               <Property>${esc(String(f.property || f.Property || "CustomerKey"))}</Property>
               <SimpleOperator>${esc(String(f.operator || f.SimpleOperator || "equals"))}</SimpleOperator>
               <Value>${esc(String(f.value ?? f.Value ?? ""))}</Value>
             </Filter>`
          : "";
        return `<RetrieveRequestMsg xmlns="${ns}">
          <RetrieveRequest>
            <ObjectType>${esc(input.objectType)}</ObjectType>
            ${propsXml}
            ${clientIdsXml}
            ${queryAllXml}
            ${continueXml}
            ${filterXml}
          </RetrieveRequest>
        </RetrieveRequestMsg>`;
      }
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
    // Normalize SOAP endpoint to /Service.asmx
    let soapBase = token.soap_instance_url || `https://${profile.subdomain}.soap.marketingcloudapis.com/Service.asmx`;
    try {
      const u = new URL(soapBase);
      if (!/Service\.asmx$/i.test(u.pathname)) {
        u.pathname = (u.pathname.endsWith("/") ? u.pathname : u.pathname + "/") + "Service.asmx";
      }
      soapBase = u.toString();
    } catch {}

    const bodyXml = buildActionBody(input);
    const envelope = buildSoapEnvelope(token.access_token, bodyXml);
    const res = await this.http.request(soapBase, {
      method: "POST",
      headers: {
        "content-type": "text/xml; charset=utf-8",
        SOAPAction:
          input.action === "Retrieve"
            ? "Retrieve"
            : input.action,
      },
      body: envelope,
    });
    const rawXml = await res.text();

    // Parse minimal fields from SOAP response if possible
    let overallStatus: string | undefined;
    let requestId: string | undefined;
    let results: any[] | undefined;
    try {
      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const parsed = parser.parse(rawXml);
      const body = parsed?.Envelope?.Body || parsed?.Body || parsed;
      const resp = body?.RetrieveResponseMsg || body?.RetrieveResponse || body;
      overallStatus = resp?.OverallStatus;
      requestId = resp?.RequestID || resp?.RequestId;
      let r = resp?.Results;
      if (r) {
        results = Array.isArray(r) ? r : [r];
      }
    } catch {
      // swallow parse errors; rawXml remains available
    }

    return { status: res.status, overallStatus, requestId, results, rawXml };
  }
}



