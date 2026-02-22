const API_BASE = process.env.PHILIDOR_API_URL || 'https://api.philidor.io';

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let message: string;
    try {
      const json = (await res.json()) as Record<string, any>;
      message = json?.error?.message || json?.message || JSON.stringify(json);
    } catch {
      message = res.statusText || `HTTP ${res.status}`;
    }
    throw new Error(`API ${res.status}: ${message}`);
  }
  const json = await res.json();
  return json as T;
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== false) sp.set(key, String(value));
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}
