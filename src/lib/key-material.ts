import { BIP39_ENGLISH } from './bip39-english';

/**
 * Non-custodial gate (PHI-343). Philidor must never accept, echo, or store a
 * private key, session key, or seed. Detection runs on raw tool arguments
 * before Zod (Zod error text repeats the input) and before any handler.
 *
 * A 32-byte private key and a bytes32 id are the same hex shape. Identifier
 * fields therefore accept a bytes32 only when the whole value matches that
 * field's documented shape. Anywhere else, a 32-byte hex token is rejected.
 *
 * Residual risk: a raw key pasted into an identifier field that accepts
 * bytes32 (vault `address`, Uniswap v4 pool id) is forwarded as a lookup.
 * The API 404s. Those values are still redacted from MCP logs.
 */

export const KEY_REFUSAL_MESSAGE = 'Philidor never accepts keys';

const REDACTED = '[redacted]';

/** 12, 15, 18, 21, or 24 words. Longest first so a 24-word seed is one hit. */
const MNEMONIC_LENGTHS = [24, 21, 18, 15, 12] as const;

/**
 * After lowercasing and stripping `_` and `-`, a field is secret when its
 * name contains one of these stems. `seedPhrase`, `sessionKeys`, and
 * `privateKeyHex` match. The stem is not echoed back to the caller.
 */
const SECRET_STEMS = ['privatekey', 'sessionkey', 'secretkey', 'mnemonic', 'seed'] as const;

type IdShape = 'vault-address' | 'slug' | 'bytes32';

/**
 * Per tool or prompt: identifier fields and the shape of the whole value.
 * `*` is one array index. A bytes32 is not accepted as an extra array item.
 */
const FIELD_SHAPES: Record<string, Array<[pattern: string, shape: IdShape]>> = {
  get_vault: [
    ['id', 'slug'],
    ['address', 'vault-address'],
  ],
  get_vault_risk_breakdown: [['address', 'vault-address']],
  compare_vaults: [['vaults.*.address', 'vault-address']],
  vault_due_diligence: [['address', 'vault-address']],
  get_market: [['marketId', 'slug']],
  get_market_events: [['marketId', 'slug']],
  check_loop_venue: [['marketId', 'slug']],
  review_loop_venue: [['marketId', 'slug']],
  portfolio_positions: [
    ['*.address', 'vault-address'],
    ['*.network', 'slug'],
  ],
};

/** Exact-shape names that are not tied to one tool. Not applied inside `_meta`. */
const GLOBAL_BYTES32 = new Set(['policyhash', 'attestationid']);
const GLOBAL_SLUG = new Set(['marketid']);

export interface KeyRefusal {
  error: {
    code: 'BAD_REQUEST';
    message: typeof KEY_REFUSAL_MESSAGE;
    refusal: {
      restricted_fields: string[];
      family: 'keys';
      required_plan: null;
      upgrade_url: null;
      x402_price: null;
    };
  };
}

export interface ScanMode {
  /** Tool or prompt name. Omitted for free text (`_meta`, unknown callers). */
  tool?: string;
  /** Ignore identifier shapes. Used for `_meta` and resource URIs. */
  free?: boolean;
}

interface Token {
  word: string;
  start: number;
  end: number;
}

interface Span {
  start: number;
  end: number;
}

export function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[_-]/g, '');
}

export function isSecretFieldName(name: string): boolean {
  const normalized = normalizeFieldName(name);
  return SECRET_STEMS.some((stem) => normalized.includes(stem));
}

function tokenizeWords(value: string): Token[] {
  const tokens: Token[] = [];
  const re = /[a-zA-Z]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    tokens.push({
      word: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

/** Non-overlapping BIP-39 English phrases of a legal length. */
export function findMnemonicSpans(value: string): Span[] {
  const tokens = tokenizeWords(value);
  const spans: Span[] = [];
  let index = 0;
  while (index < tokens.length) {
    let matched = false;
    for (const length of MNEMONIC_LENGTHS) {
      if (index + length > tokens.length) continue;
      const slice = tokens.slice(index, index + length);
      if (slice.every((token) => BIP39_ENGLISH.has(token.word))) {
        spans.push({ start: slice[0].start, end: slice[length - 1].end });
        index += length;
        matched = true;
        break;
      }
    }
    if (!matched) index += 1;
  }
  return spans;
}

export function containsMnemonic(value: string): boolean {
  return findMnemonicSpans(value).length > 0;
}

/**
 * Hex digit runs of 64 or more. A 32-byte key hidden in a longer run
 * (`a0x<64>`, `0x<64>e`, `0x<64>0x<64>`) still matches. 20-byte addresses
 * (40 hex digits) do not.
 */
export function findPrivateKeyHexSpans(value: string): Span[] {
  const spans: Span[] = [];
  const re = /[0-9a-fA-F]{64,}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

export function containsPrivateKeyHex(value: string): boolean {
  return findPrivateKeyHexSpans(value).length > 0;
}

/** WIF: base58, 51 to 53 chars, leading 5, K, or L. */
export function findWifSpans(value: string): Span[] {
  return findBoundedSpans(value, /[5KL][1-9A-HJ-NP-Za-km-z]{50,52}/g, /[1-9A-HJ-NP-Za-km-z]/);
}

/**
 * Long base58 tokens. Solana addresses are 32-44 chars and are not matched.
 * A Solana secret key is 87-88 chars. The same length is also a Solana
 * signature, so a pasted signature in free text is refused too.
 */
export function findLongBase58Spans(value: string): Span[] {
  return findBoundedSpans(value, /[1-9A-HJ-NP-Za-km-z]{64,}/g, /[1-9A-HJ-NP-Za-km-z]/);
}

/** BIP-32 extended private keys (xprv, tprv, yprv, zprv). */
export function findExtendedPrivateKeySpans(value: string): Span[] {
  return findBoundedSpans(value, /[xtyz]prv[1-9A-HJ-NP-Za-km-z]{10,}/gi, /[1-9A-HJ-NP-Za-km-z]/i);
}

function findBoundedSpans(value: string, re: RegExp, alphabet: RegExp): Span[] {
  const spans: Span[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const start = match.index;
    const end = start + match[0].length;
    const before = start > 0 ? value.charAt(start - 1) : '';
    const after = end < value.length ? value.charAt(end) : '';
    if ((before && alphabet.test(before)) || (after && alphabet.test(after))) {
      if (re.lastIndex === start) re.lastIndex += 1;
      continue;
    }
    spans.push({ start, end });
  }
  return spans;
}

export function findPemSpans(value: string): Span[] {
  const spans: Span[] = [];
  const re = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

/** Long base64 blobs. Short tokens and 20-byte addresses are left alone. */
export function findLongBase64Spans(value: string): Span[] {
  return findBoundedSpans(value, /[A-Za-z0-9+/]{100,}={0,2}/g, /[A-Za-z0-9+/=]/);
}

function freeTextHasKey(value: string): boolean {
  return (
    containsMnemonic(value) ||
    containsPrivateKeyHex(value) ||
    findWifSpans(value).length > 0 ||
    findExtendedPrivateKeySpans(value).length > 0 ||
    findPemSpans(value).length > 0 ||
    findLongBase64Spans(value).length > 0 ||
    findLongBase58Spans(value).length > 0
  );
}

function isExactBytes32(value: string): boolean {
  return /^(?:0x)[0-9a-fA-F]{64}$/.test(value);
}

function isVaultAddress(value: string): boolean {
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return true;
  if (/^[0-9a-fA-F]{40}$/.test(value)) return true;
  // Uniswap v4 pool ids are published as 0x + 32 bytes. A bare 64-hex string is not.
  if (isExactBytes32(value)) return true;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function isSlugIdentifier(value: string): boolean {
  if (value.length < 3 || value.length > 200) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) return false;
  if (!value.includes('-')) return false;
  const parts = value.split('-');
  let embedded = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    if (part.length === 0 || part.length > 80) return false;
    // 20-byte address, as its own segment.
    if (/^0x[0-9a-fA-F]{40}$/i.test(part)) {
      embedded += 1;
      continue;
    }
    // Pool id only as the final `-0x` + exactly 64 hex. Anything longer stays a key.
    if (isLast && /^0x[0-9a-fA-F]{64}$/i.test(part)) {
      embedded += 1;
      continue;
    }
    if (/[0-9a-fA-F]{64,}/.test(part)) return false;
  }
  return embedded <= 1;
}

function matchesShape(value: string, shape: IdShape): boolean {
  if (shape === 'vault-address') return isVaultAddress(value);
  if (shape === 'bytes32') return isExactBytes32(value) || /^[0-9a-fA-F]{64}$/.test(value);
  return isSlugIdentifier(value);
}

function pathMatches(path: string[], pattern: string): boolean {
  const parts = pattern.split('.');
  if (parts.length !== path.length) return false;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '*') {
      if (!/^\d+$/.test(path[i])) return false;
      continue;
    }
    if (normalizeFieldName(parts[i]) !== normalizeFieldName(path[i])) return false;
  }
  return true;
}

function shapeFor(path: string[], mode: ScanMode): IdShape | undefined {
  if (mode.free) return undefined;
  const patterns = mode.tool ? FIELD_SHAPES[mode.tool] : undefined;
  if (patterns) {
    for (const [pattern, shape] of patterns) {
      if (pathMatches(path, pattern)) return shape;
    }
  }
  const last = path.length > 0 ? path[path.length - 1] : '';
  if (!last || /^\d+$/.test(last)) return undefined;
  const normalized = normalizeFieldName(last);
  if (GLOBAL_BYTES32.has(normalized)) return 'bytes32';
  if (GLOBAL_SLUG.has(normalized)) return 'slug';
  return undefined;
}

function stringIsSecret(value: string, path: string[], mode: ScanMode): boolean {
  const shape = shapeFor(path, mode);
  if (shape && matchesShape(value, shape)) {
    // The whole value is the documented id. A v4 pool id is also base58, so
    // that overlap is the identifier, not a second key. A mnemonic, WIF,
    // extended key, or PEM block inside the same value is still refused.
    return (
      containsMnemonic(value) ||
      findWifSpans(value).length > 0 ||
      findExtendedPrivateKeySpans(value).length > 0 ||
      findPemSpans(value).length > 0
    );
  }
  return freeTextHasKey(value);
}

function safeSegment(segment: string): string {
  // A 64-digit private key is all digits. Check key material before keeping it.
  if (isSecretFieldName(segment) || freeTextHasKey(segment)) return REDACTED;
  return segment;
}

function emitPath(path: string[]): string {
  if (path.length === 0) return '$';
  return path.map(safeSegment).join('.');
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Paths of arguments that carry key material. Secret field names and secret
 * values are replaced with `[redacted]` before they can be copied into a
 * refusal. An empty array means the value may proceed.
 */
export function findSecretPaths(
  value: unknown,
  path: string[] = [],
  mode: ScanMode = {}
): string[] {
  if (typeof value === 'string') {
    if (
      !mode.free &&
      mode.tool === 'portfolio_risk_assessment' &&
      path.length > 0 &&
      normalizeFieldName(path[path.length - 1]) === 'positions'
    ) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object') {
          const child = findSecretPaths(parsed, [], { tool: 'portfolio_positions' });
          return uniqueSorted(child.map((item) => `${emitPath(path)}.${item}`));
        }
      } catch {
        // Not JSON. Fall through and treat the string as free text.
      }
    }
    if (stringIsSecret(value, path, mode)) return [emitPath(path)];
    return [];
  }

  if (Array.isArray(value)) {
    const hits: string[] = [];
    value.forEach((item, index) => {
      hits.push(...findSecretPaths(item, [...path, String(index)], mode));
    });
    return uniqueSorted(hits);
  }

  if (!value || typeof value !== 'object') return [];

  const hits: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = [...path, key];
    if (isSecretFieldName(key) || freeTextHasKey(key)) {
      hits.push(emitPath(next));
      continue;
    }
    hits.push(...findSecretPaths(child, next, mode));
  }
  return uniqueSorted(hits);
}

/** Arguments, `_meta`, and a resource URI. `_meta` and the URI are free text. */
export function findInboundSecretPaths(input: {
  tool?: string;
  arguments?: unknown;
  meta?: unknown;
  uri?: unknown;
}): string[] {
  const hits = [
    ...findSecretPaths(input.arguments, [], { tool: input.tool }),
    ...findSecretPaths(input.meta, ['_meta'], { free: true }),
  ];
  if (typeof input.uri === 'string' && input.uri.length > 0) {
    hits.push(...findSecretPaths(input.uri, ['uri'], { free: true }));
  }
  return uniqueSorted(hits);
}

function sanitizeRefusalPath(path: string): string {
  return path
    .split('.')
    .map((segment) => safeSegment(segment))
    .join('.');
}

/** PHI-312 refusal. `message` is fixed. The secret value is never copied in. */
export function keyRefusal(paths: string[]): KeyRefusal {
  return {
    error: {
      code: 'BAD_REQUEST',
      message: KEY_REFUSAL_MESSAGE,
      refusal: {
        restricted_fields: uniqueSorted(paths.map(sanitizeRefusalPath)),
        family: 'keys',
        required_plan: null,
        upgrade_url: null,
        x402_price: null,
      },
    },
  };
}

export function keyRefusalToolResult(paths: string[]): {
  content: { type: 'text'; text: string }[];
  isError: true;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(keyRefusal(paths)) }],
    isError: true,
  };
}

/** Same refusal for prompts/get, which would otherwise interpolate the value. */
export function keyRefusalPromptResult(paths: string[]): {
  description: string;
  messages: { role: 'user'; content: { type: 'text'; text: string } }[];
} {
  return {
    description: KEY_REFUSAL_MESSAGE,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: JSON.stringify(keyRefusal(paths)) },
      },
    ],
  };
}

/**
 * resources/read refusal. The URI is a fixed placeholder so the requested
 * URI, which may be the secret, is not copied into the result.
 */
export function keyRefusalResourceResult(paths: string[]): {
  contents: { uri: string; mimeType: string; text: string }[];
} {
  return {
    contents: [
      {
        uri: 'philidor://refused',
        mimeType: 'application/json',
        text: JSON.stringify(keyRefusal(paths)),
      },
    ],
  };
}

function replaceSpans(value: string, spans: Span[]): string {
  if (spans.length === 0) return value;
  let out = value;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    out = `${out.slice(0, span.start)}${REDACTED}${out.slice(span.end)}`;
  }
  return out;
}

/** Redact key material. Identifier bytes32 values are redacted too: they may be keys. */
export function scrubSecretString(value: string): string {
  let out = value;
  out = replaceSpans(out, findPemSpans(out));
  out = replaceSpans(out, findMnemonicSpans(out));
  out = replaceSpans(out, findExtendedPrivateKeySpans(out));
  out = replaceSpans(out, findWifSpans(out));
  out = replaceSpans(out, findLongBase58Spans(out));
  out = replaceSpans(out, findLongBase64Spans(out));
  out = replaceSpans(out, findPrivateKeyHexSpans(out));
  return out;
}

/**
 * Deep copy with key material removed. Does not keep 32-byte hex, including
 * values that an identifier field would have accepted. Does not mutate `value`.
 */
export function scrubSecrets<T>(value: T): T {
  return scrubValue(value, new WeakSet()) as T;
}

function scrubValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubSecretString(value);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => scrubValue(item, seen));

  if (value instanceof Error) {
    const copy = new Error(scrubSecretString(value.message));
    copy.name = value.name;
    if (value.stack) copy.stack = scrubSecretString(value.stack);
    return copy;
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretFieldName(key) || freeTextHasKey(key)) {
      out[REDACTED] = REDACTED;
      continue;
    }
    out[key] = scrubValue(child, seen);
  }
  return out;
}

export function scrubThrown(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  // McpError prefixes the text (`MCP error -32602: Resource <uri> not found`).
  // Drop the URI in every form of that sentence.
  if (/Resource\s+\S+\s+not found/.test(message)) return new Error('Resource not found');
  if (/Resource\s+\S+\s+disabled/.test(message)) return new Error('Resource disabled');
  const stack = err instanceof Error ? err.stack : undefined;
  const out = new Error(scrubSecretString(message));
  out.name = err instanceof Error ? err.name : 'Error';
  if (stack) out.stack = scrubSecretString(stack);
  return out;
}
