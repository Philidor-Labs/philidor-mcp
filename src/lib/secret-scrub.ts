import { scrubSecrets } from './key-material';

const METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
type ConsoleMethod = (typeof METHODS)[number];

const originals: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>> = {};
let installed = false;

function scrubArg(value: unknown): unknown {
  if (typeof value === 'string') return scrubSecrets(value);
  if (value instanceof Error) return scrubSecrets(value);
  if (value && typeof value === 'object') return scrubSecrets(value);
  return value;
}

/**
 * Defense in depth for anything that reaches stdout, a platform log drain, or
 * an error reporter. Installed before tool handlers run. Idempotent.
 */
export function installSecretScrubbing(): void {
  if (installed) return;
  installed = true;
  for (const method of METHODS) {
    const original = console[method].bind(console);
    originals[method] = original;
    console[method] = ((...args: unknown[]) => {
      original(...args.map(scrubArg));
    }) as (typeof console)[ConsoleMethod];
  }
}

/** Test-only: put console back so later cases see a fresh installer. */
export function restoreSecretScrubbing(): void {
  if (!installed) return;
  for (const method of METHODS) {
    const original = originals[method];
    if (original) console[method] = original as (typeof console)[ConsoleMethod];
    delete originals[method];
  }
  installed = false;
}
