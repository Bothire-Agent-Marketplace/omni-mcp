export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  requestId?: string;
}

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 10000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await run(controller.signal);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function buildHeaders(opts?: HttpOptions): Record<string, string> {
  const headers: Record<string, string> = { ...(opts?.headers || {}) };
  if (opts?.requestId) headers["x-request-id"] = opts.requestId;
  return headers;
}

async function execute<T>(
  url: string,
  init: RequestInit,
  opts?: HttpOptions
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? 0);
  let attempt = 0;

  while (true) {
    try {
      const response = await withTimeout(
        (signal) => fetch(url, { ...init, signal }),
        opts?.timeoutMs
      );
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status} ${response.statusText} ${text}`
        );
      }
      return (await response.json()) as T;
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      attempt += 1;
      const backoffMs = 200 * attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

export async function getJson<T>(url: string, opts?: HttpOptions): Promise<T> {
  const headers = buildHeaders(opts);
  return execute<T>(
    url,
    {
      method: "GET",
      headers,
    },
    opts
  );
}

export async function postJson<T>(
  url: string,
  body: unknown,
  opts?: HttpOptions
): Promise<T> {
  const headers = { "Content-Type": "application/json", ...buildHeaders(opts) };
  return execute<T>(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
    opts
  );
}
