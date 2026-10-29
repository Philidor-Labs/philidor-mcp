import { scrubSecrets, scrubThrown } from './lib/key-material';

const API_BASE = process.env.PHILIDOR_API_URL || 'https://api.philidor.io';

/** Typed, sanitized upstream failure for structured policy refusals. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = '',
    readonly body: unknown = undefined
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function philidorApiOrigin(): string {
  return API_BASE.replace(/\/$/, '');
}

/** Match the hosted client's envelope semantics. Paginated results stay wrapped. */
export function unwrapData<T>(json: unknown): T {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Unexpected API response shape');
  }
  if ('data' in json && !('meta' in json) && Object.keys(json).length === 1) {
    return json.data as T;
  }
  return json as T;
}

/** Policy attestations only. Never builds, signs or broadcasts transactions. */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
  const apiKey = process.env.PHILIDOR_API_KEY?.trim();
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`);
  let res: Response;
  try {
    res = await fetch(`${philidorApiOrigin()}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw scrubThrown(error);
  }
  if (!res.ok) {
    let failure: any;
    try { failure = scrubSecrets(await res.json()); } catch { /* Non-JSON refusal. */ }
    const raw = failure?.error;
    const code = typeof raw?.code === 'string' ? raw.code : '';
    // Do not embed raw upstream statusText/body in an exception or log.
    throw new ApiClientError(`API ${res.status}`, res.status, code, failure);
  }
  return await res.json() as T;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      let message: string;
      try {
        const json = scrubSecrets((await res.json()) as Record<string, any>);
        message = json?.error?.message || json?.message || JSON.stringify(json);
      } catch {
        message = res.statusText || `HTTP ${res.status}`;
      }
      throw new Error(`API ${res.status}: ${message}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    // Some callers embed caught errors in successful tool/prompt/resource
    // content. Sanitize before those callers can interpolate the exception.
    throw scrubThrown(error);
  }
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    sp.set(key, String(value));
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}
