import { scrubSecrets, scrubThrown } from './lib/key-material';

const API_BASE = process.env.PHILIDOR_API_URL || 'https://api.philidor.io';

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
