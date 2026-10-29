import { ApiClientError, unwrapData } from '../api-client';
import { z } from 'zod';
import { apiPost, philidorApiOrigin } from '../api-client';

/**
 * Exact 32-byte hex identifier: optional 0x, then 64 hex digits, nothing else.
 * `policy_hash` and `attestation_id` use this shape. Draft product PR #5
 * (PHI-343) allowlists the normalized names `policyhash` and `attestationid`
 * as exact bytes32 identifiers, so a whole-value hash in either field is an
 * identifier. `vaultKey` is `{chainId}:` plus a 20-byte address and is not a
 * bytes32.
 */
export const BYTES32_PATTERN = /^(?:0x)?[0-9a-fA-F]{64}$/;

/** `{chainId}:{lowercase 0x address}`. Same shape as the published graph check. */
export const VAULT_KEY_PATTERN = /^\d+:0x[0-9a-f]{40}$/;

export const MAX_LIST_KEYS = 1000;
export const MAX_POSITIONS = 100;
/** 366 days of seconds. Published upper bound for maxFreshnessSeconds. */
export const MAX_FRESHNESS_SECONDS = 31_622_400;

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

const VaultKey = z.string().regex(VAULT_KEY_PATTERN);
const Bytes32 = z.string().regex(BYTES32_PATTERN);
const Address = z.string().regex(ADDRESS_PATTERN);

const Share = z.number().gt(0).lte(1);

const LimitsSchema = z
  .object({
    maxSharePerCurator: Share.optional(),
    maxSharePerProtocol: Share.optional(),
    maxSharePerChain: Share.optional(),
    maxSharePerAsset: Share.optional(),
    maxSharePerOracle: Share.optional(),
    maxSharePerOracleVendor: Share.optional(),
    maxSharePerCluster: Share.optional(),
    maxSharePerBridge: Share.optional(),
    maxSharePerSignerSet: Share.optional(),
  })
  .strict();

const ConstraintsSchema = z
  .object({
    minTier: z.enum(['Prime', 'Core', 'Edge']).optional(),
    allowlist: z.array(VaultKey).max(MAX_LIST_KEYS).optional(),
    blacklist: z.array(VaultKey).max(MAX_LIST_KEYS).optional(),
    requireDepositStatus: z.literal('open').optional(),
    requireWithdrawStatus: z.literal('open').optional(),
    maxFreshnessSeconds: z.number().int().min(0).max(MAX_FRESHNESS_SECONDS).optional(),
  })
  .strict();

export const checkPolicyInputShape = {
  positions: z
    .array(
      z
        .object({
          vaultKey: VaultKey.describe(
            "Vault key '{chainId}:{lowercase 0x address}', for example 1:0xabc... with 40 hex digits."
          ),
          amountUsd: z.number().gt(0).finite().describe('Position size in USD. Greater than 0.'),
        })
        .strict()
    )
    .min(1)
    .max(MAX_POSITIONS)
    .describe('Positions to check. 1 to 100. This is not a wallet.'),
  limits: LimitsSchema.describe(
    'Exposure caps as fractions in (0, 1]. Pass {} to set none. Omit a field to leave that dimension unconstrained. No Philidor cap is preselected.'
  ),
  constraints: ConstraintsSchema.optional().describe(
    'Optional rules you set: minTier (Prime, Core, or Edge), allowlist and blacklist (max 1000 vault keys each; a key on both lists is not conforming because the blacklist wins), requireDepositStatus and requireWithdrawStatus (open only), maxFreshnessSeconds (integer 0 to 31622400). Omit the object to add none.'
  ),
  issue: z
    .boolean()
    .optional()
    .describe(
      'When true, ask the API to issue a compliance attestation. Does not prepare a transaction.'
    ),
  agentId: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe('Optional caller reference forwarded to the API. Not a wallet and not a key.'),
};

export const CheckPolicyInputSchema = z.object(checkPolicyInputShape).strict();

export type CheckPolicyInput = z.infer<typeof CheckPolicyInputSchema>;

const ViolationSchema = z
  .object({
    rule: z.string().min(1),
    observed: z.unknown(),
    threshold: z.unknown(),
    vaultKey: VaultKey.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    // z.unknown() accepts a missing key. A violation without these fields is
    // not a compliance result.
    if (value.observed === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['observed'],
        message: 'observed is required',
      });
    }
    if (value.threshold === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threshold'],
        message: 'threshold is required',
      });
    }
  });

const ResponseSchema = z
  .object({
    compliance: z.enum(['compliant', 'non_compliant']),
    violations: z.array(ViolationSchema),
    policy_hash: Bytes32,
    attestation_id: Bytes32.nullish(),
    findings: z.array(z.record(z.string(), z.unknown())),
    snapshotId: z.string().min(1),
    signerAddress: Address.optional(),
    verdict: z.enum(['approve', 'caution', 'reject']).optional(),
    truncated: z.unknown().optional(),
    hasMore: z.unknown().optional(),
    decision: z
      .object({
        signerAddress: z.string().optional(),
        decisionId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const PLAN_REFUSAL_STATUSES = new Set([401, 402, 403]);

const OUTPUT_KEYS = [
  'compliance',
  'violations',
  'policy_hash',
  'attestation_id',
  'findings',
  'snapshotId',
  'signerAddress',
  'verification_url',
  'deprecated_verdict',
] as const;

export const CHECK_POLICY_DESCRIPTION =
  'State whether the positions you supply conform to the limits and constraints you supply. Calls POST /v1/graph/check and returns the API compliance attestation (attestation de conformité): compliance (compliant or non_compliant), violations, policy_hash, findings, and snapshotId. When issue is true and the API issues an attestation, the result also includes attestation_id, signerAddress, and the verification URL GET /v1/graph/attestation/{id}/verify. This states conformity with your policy. It does not recommend a vault. The same inputs produce the same result for every wallet. No Philidor policy is preselected. A missing or unknown API field is an error, never compliant. A caller without an eligible plan gets a structured refusal (required plan, x402 price, upgrade link), never an empty result. Philidor does not prepare transactions.';

export class CheckPolicyContractError extends Error {
  constructor() {
    super(
      'The API response is missing a required field or has an unknown value. No compliance attestation was produced.'
    );
    this.name = 'CheckPolicyContractError';
  }
}

function invalidInputText(error: z.ZodError): string {
  const paths = error.issues
    .slice(0, 20)
    .map((issue) => issue.path.join('.') || '$')
    .join(', ');
  return JSON.stringify({
    error: {
      code: 'BAD_REQUEST',
      message: `Invalid check_policy input (${paths}). No compliance attestation was produced.`,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Absent or explicit false: the API reported a complete result. Anything else is incomplete. */
function isIncompleteFlag(value: unknown): boolean {
  return value !== undefined && value !== false;
}

function compactConstraints(
  constraints: CheckPolicyInput['constraints']
): CheckPolicyInput['constraints'] | undefined {
  if (!constraints) return undefined;
  const entries = Object.entries(constraints).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as CheckPolicyInput['constraints'];
}

/**
 * Body for POST /v1/graph/check. No portfolio reference is invented: the
 * PHI-336 contract does not include one, and a hidden value would change the
 * attestation. The backend derives the portfolio reference from agentId or the supplied
 * positions when the legacy portfolioRef is omitted.
 */
export function buildCheckPolicyRequest(input: CheckPolicyInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    positions: input.positions,
    limits: input.limits,
    issue: input.issue ?? false,
  };
  const constraints = compactConstraints(input.constraints);
  if (constraints) body.constraints = constraints;
  if (input.agentId) body.agentId = input.agentId;
  return body;
}

export function attestationVerifyUrl(attestationId: string): string {
  return `${philidorApiOrigin()}/v1/graph/attestation/${encodeURIComponent(attestationId)}/verify`;
}

function formatSuccess(json: unknown, issue: boolean): string {
  let unwrapped: unknown;
  try {
    unwrapped = unwrapData<unknown>(json);
  } catch {
    throw new CheckPolicyContractError();
  }
  const parsed = ResponseSchema.safeParse(unwrapped);
  if (!parsed.success) throw new CheckPolicyContractError();

  const row = parsed.data;
  // A partial page is not an attestation. `true`, or any value other than an
  // explicit false, means the API did not return a complete result.
  if (isIncompleteFlag(row.truncated) || isIncompleteFlag(row.hasMore)) {
    throw new CheckPolicyContractError();
  }
  const deprecatedId = row.decision?.decisionId;
  if (
    row.attestation_id &&
    deprecatedId &&
    BYTES32_PATTERN.test(deprecatedId) &&
    deprecatedId !== row.attestation_id
  ) {
    throw new CheckPolicyContractError();
  }

  const topSigner = row.signerAddress;
  const nestedSigner = row.decision?.signerAddress;
  if (topSigner && nestedSigner && topSigner !== nestedSigner) {
    throw new CheckPolicyContractError();
  }
  if (nestedSigner && !ADDRESS_PATTERN.test(nestedSigner) && !topSigner) {
    throw new CheckPolicyContractError();
  }
  const signerAddress =
    topSigner ?? (nestedSigner && ADDRESS_PATTERN.test(nestedSigner) ? nestedSigner : undefined);

  if (issue && (!row.attestation_id || !signerAddress)) {
    throw new CheckPolicyContractError();
  }

  const out: Record<string, unknown> = {
    compliance: row.compliance,
    violations: row.violations,
    policy_hash: row.policy_hash,
    findings: row.findings,
    snapshotId: row.snapshotId,
  };
  if (row.attestation_id) {
    out.attestation_id = row.attestation_id;
    out.verification_url = attestationVerifyUrl(row.attestation_id);
  }
  if (signerAddress) out.signerAddress = signerAddress;
  if (row.verdict) {
    out.deprecated_verdict = { status: 'deprecated', value: row.verdict };
  }

  for (const key of Object.keys(out)) {
    if (!OUTPUT_KEYS.includes(key as (typeof OUTPUT_KEYS)[number])) {
      throw new CheckPolicyContractError();
    }
  }

  return JSON.stringify(out);
}

const RefusalFields = z
  .object({
    restricted_fields: z.array(z.string()).optional(),
    family: z.string().nullable().optional(),
    required_plan: z.string().nullable().optional(),
    upgrade_url: z.string().nullable().optional(),
    x402_price: z.unknown().optional(),
  })
  .passthrough();

function refusalEnvelope(error: ApiClientError): string {
  const record = isRecord(error.body) ? error.body : {};
  const rawError = isRecord(record.error) ? record.error : {};
  const parsedRefusal = RefusalFields.safeParse(isRecord(rawError.refusal) ? rawError.refusal : {});
  const refusal = parsedRefusal.success ? parsedRefusal.data : {};
  const code = typeof rawError.code === 'string' && rawError.code ? rawError.code : error.code;
  const message =
    typeof rawError.message === 'string' && rawError.message
      ? rawError.message
      : 'This call is not eligible. No compliance attestation was produced.';
  const requestId = typeof rawError.request_id === 'string' ? rawError.request_id : undefined;

  const body: Record<string, unknown> = {
    code: code || (error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'),
    message,
    refusal: {
      restricted_fields: Array.isArray(refusal.restricted_fields) ? refusal.restricted_fields : [],
      family: typeof refusal.family === 'string' ? refusal.family : null,
      required_plan: typeof refusal.required_plan === 'string' ? refusal.required_plan : null,
      upgrade_url: typeof refusal.upgrade_url === 'string' ? refusal.upgrade_url : null,
      x402_price: refusal.x402_price === undefined ? null : refusal.x402_price,
    },
  };
  if (requestId) body.request_id = requestId;

  return JSON.stringify({ error: body });
}

function upstreamEnvelope(error: ApiClientError): string {
  const record = isRecord(error.body) ? error.body : {};
  const rawError = isRecord(record.error) ? record.error : {};
  const code = typeof rawError.code === 'string' && rawError.code ? rawError.code : error.code;
  const message =
    typeof rawError.message === 'string' && rawError.message
      ? rawError.message
      : error.message ||
        'The check could not be completed. No compliance attestation was produced.';
  const requestId = typeof rawError.request_id === 'string' ? rawError.request_id : undefined;
  const body: Record<string, unknown> = {
    code: code || 'UPSTREAM',
    message,
  };
  if (requestId) body.request_id = requestId;
  return JSON.stringify({ error: body });
}

export function formatCheckPolicyFailure(error: unknown): string {
  if (error instanceof CheckPolicyContractError || error instanceof z.ZodError) {
    if (error instanceof z.ZodError) return invalidInputText(error);
    return JSON.stringify({
      error: {
        code: 'BAD_RESPONSE',
        message: error.message,
      },
    });
  }
  if (error instanceof ApiClientError) {
    if (PLAN_REFUSAL_STATUSES.has(error.status)) return refusalEnvelope(error);
    return upstreamEnvelope(error);
  }
  return JSON.stringify({
    error: {
      code: 'UPSTREAM',
      message: 'The check could not be completed. No compliance attestation was produced.',
    },
  });
}

export async function executeCheckPolicy(
  input: unknown
): Promise<{ text: string; isError: boolean }> {
  const parsed = CheckPolicyInputSchema.safeParse(input);
  if (!parsed.success) {
    return { isError: true, text: invalidInputText(parsed.error) };
  }
  try {
    const json = await apiPost<unknown>('/v1/graph/check', buildCheckPolicyRequest(parsed.data));
    return { isError: false, text: formatSuccess(json, parsed.data.issue ?? false) };
  } catch (error) {
    return { isError: true, text: formatCheckPolicyFailure(error) };
  }
}
