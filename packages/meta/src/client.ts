import { mapMetaHttpError, MetaClientError } from "./errors";

export type MetaQueryValue = string | number | boolean | null | undefined;

export type MetaRequestOptions = Readonly<{
  method?: "GET" | "POST" | "DELETE";
  query?: Readonly<Record<string, MetaQueryValue>>;
  body?: unknown;
}>;

export type MetaClientOptions = Readonly<{
  graphVersion: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}>;

export class MetaClient {
  private readonly graphVersion: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: MetaClientOptions) {
    this.graphVersion = options.graphVersion.replace(/^\/+|\/+$/g, "");
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async request<T>(path: string, options: MetaRequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    return this.requestAbsolute<T>(url, options);
  }

  async requestUrl<T>(url: URL): Promise<T> {
    if (url.protocol !== "https:" || url.hostname !== "graph.facebook.com") {
      throw new MetaClientError(
        "META_API_ERROR",
        "Meta Graph pagination URL must use https://graph.facebook.com"
      );
    }

    const safeUrl = new URL(url.toString());
    safeUrl.searchParams.set("access_token", this.accessToken);
    return this.requestAbsolute<T>(safeUrl, { method: "GET" });
  }

  private async requestAbsolute<T>(url: URL, options: MetaRequestOptions): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const init: RequestInit = {
        method: options.method ?? "GET",
        signal: controller.signal
      };

      if (options.body !== undefined) {
        init.headers = { "content-type": "application/json" };
        init.body = JSON.stringify(options.body);
      }

      const response = await this.fetchImpl(url, init);
      const payload = await this.readJson(response);

      if (!response.ok) {
        throw mapMetaHttpError(response.status, payload);
      }

      return payload as T;
    } catch (error: unknown) {
      if (error instanceof MetaClientError) throw error;

      if (this.isAbortError(error)) {
        throw new MetaClientError("META_API_ERROR", "Meta Graph request timed out", { cause: error });
      }

      throw new MetaClientError("META_API_ERROR", "Meta Graph transport request failed", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: Readonly<Record<string, MetaQueryValue>>): URL {
    const cleanPath = path.replace(/^\/+/, "");
    const url = new URL(`https://graph.facebook.com/${this.graphVersion}/${cleanPath}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    url.searchParams.set("access_token", this.accessToken);
    return url;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) return null;

    try {
      return JSON.parse(text) as unknown;
    } catch (error: unknown) {
      throw new MetaClientError("META_API_ERROR", "Meta Graph returned invalid JSON", {
        status: response.status,
        cause: error
      });
    }
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }
}
