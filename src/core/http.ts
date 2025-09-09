export type RedactionRule = {
  pattern: RegExp;
  replacement?: string;
};

export type HttpClientOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  redactions?: RedactionRule[];
  fetchImpl?: typeof fetch;
};

export class HttpClient {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly timeoutMs: number;
  private readonly redactions: RedactionRule[];
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpClientOptions = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 300;
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.redactions = opts.redactions ?? [];
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private redact(input: string): string {
    let out = input;
    for (const r of this.redactions) {
      out = out.replace(r.pattern, r.replacement ?? "<redacted>");
    }
    return out;
  }

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private computeDelay(attempt: number): number {
    const base = this.baseDelayMs * 2 ** attempt;
    const jitter = Math.random() * this.baseDelayMs;
    return base + jitter;
  }

  async request(input: RequestInfo, init?: RequestInit): Promise<Response> {
    let attempt = 0;
    let lastErr: any;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(input, { ...init, signal: controller.signal });
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          if (attempt === this.maxRetries) return res;
          const retryAfter = Number(res.headers.get("retry-after"));
          const delayMs = !Number.isNaN(retryAfter) ? retryAfter * 1000 : this.computeDelay(attempt);
          await this.delay(delayMs);
          attempt++;
          continue;
        }
        return res;
      } catch (err: any) {
        lastErr = err;
        if (attempt === this.maxRetries) throw err;
        await this.delay(this.computeDelay(attempt));
        attempt++;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastErr;
  }
}



