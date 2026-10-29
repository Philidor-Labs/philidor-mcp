import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { createServer } from './server';
import { executeCheckPolicy, CHECK_POLICY_DESCRIPTION } from './lib/check-policy';

// Synthetic public fixtures only. All HTTP is mocked.
const VAULT = `1:0x${'22'.repeat(20)}`;
const HASH = 'ab'.repeat(32);
const ATTEST = 'cd'.repeat(32);
const SIGNER = `0x${'33'.repeat(20)}`;
const input = {
  positions: [{ vaultKey: VAULT, amountUsd: 10 }],
  limits: { maxSharePerProtocol: 0.5 },
  constraints: { minTier: 'Prime', requireDepositStatus: 'open', maxFreshnessSeconds: 300 },
  issue: true, agentId: 'fixture-agent',
};
const success = (overrides: Record<string, unknown> = {}) => ({ data: {
  compliance: 'non_compliant',
  violations: [{ rule: 'maxSharePerProtocol', observed: '0.600000', threshold: '0.500000', vaultKey: VAULT }],
  policy_hash: HASH, snapshotId: 'fixture-snapshot', attestation_id: ATTEST,
  findings: [{ share: '0.600000', limit: '0.500000' }],
  decision: { decisionId: ATTEST, signerAddress: SIGNER }, verdict: 'reject', ...overrides,
} });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const originalFetch = globalThis.fetch;
const oldKey = process.env.PHILIDOR_API_KEY;
let calls = 0;
let checks = 0;
const server = createServer();
const client = new Client({ name: 'phi336-fixture', version: '0.0.0' });
const [ct, st] = InMemoryTransport.createLinkedPair();
await Promise.all([client.connect(ct), server.connect(st)]);
try {
  process.env.PHILIDOR_API_KEY = 'fixture-api-credential';
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://api.philidor.io/v1/graph/check');
    assert.equal(init?.method, 'POST');
    assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fixture-api-credential');
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return json(success());
  };
  const listed = await client.listTools();
  assert.equal(listed.tools.length, 15);
  assert.match(listed.tools.find(t => t.name === 'check_policy')?.description ?? '', /compliance attestation/);
  assert.doesNotMatch(CHECK_POLICY_DESCRIPTION, /\b(safe|recommended|decision)\b/i);
  const issued = await client.callTool({ name: 'check_policy', arguments: input });
  assert.ok(!issued.isError, JSON.stringify(issued));
  const out = JSON.parse((issued.content as any)[0].text);
  assert.equal(out.compliance, 'non_compliant');
  assert.equal(out.policy_hash, HASH);
  assert.equal(out.attestation_id, ATTEST);
  assert.equal(out.signerAddress, SIGNER);
  assert.equal(out.verification_url, `https://api.philidor.io/v1/graph/attestation/${ATTEST}/verify`);
  assert.equal(out.findings[0].share, '0.600000');
  assert.equal(out.violations[0].observed, '0.600000');
  assert.deepEqual(out.deprecated_verdict, { status: 'deprecated', value: 'reject' });
  assert.equal(out.decision, undefined);
  checks++;

  for (const invalid of [
    { ...input, wallet: 'unexpected' },
    { ...input, portfolioRef: 'hidden-reference' },
    { ...input, positions: [] },
    { ...input, positions: Array(101).fill(input.positions[0]) },
    { ...input, positions: [{ vaultKey: VAULT, amountUsd: 0 }] },
    { ...input, positions: [{ vaultKey: 'solana:example', amountUsd: 1 }] },
    { ...input, limits: { maxSharePerProtocol: 1.1 } },
    { ...input, constraints: { maxFreshnessSeconds: 31622401 } },
    { ...input, constraints: { allowlist: Array(1001).fill(VAULT) } },
    { ...input, constraints: { ignoredRule: true } },
    { ...input, agentId: '11'.repeat(32) },
    { ...input, privateKey: 'opaque' },
  ]) {
    const before = calls;
    const result = await client.request({ method: 'tools/call', params: { name: 'check_policy', arguments: invalid } }, z.any());
    assert.equal(result.isError, true);
    assert.equal(calls, before);
    checks++;
  }

  for (const overrides of [
    { compliance: undefined }, { compliance: 'approve' }, { policy_hash: 'bad' },
    { snapshotId: undefined }, { findings: undefined }, { attestation_id: null },
    { decision: undefined }, { truncated: true }, { truncated: null }, { hasMore: 1 },
    { decision: { decisionId: 'ef'.repeat(32), signerAddress: SIGNER } },
    { signerAddress: `0x${'44'.repeat(20)}` },
    { violations: [{ rule: 'data_unavailable' }] },
  ]) {
    globalThis.fetch = async () => json(success(overrides));
    const result = await client.callTool({ name: 'check_policy', arguments: input });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse((result.content as any)[0].text).error.code, 'BAD_RESPONSE');
    checks++;
  }

  delete process.env.PHILIDOR_API_KEY;
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).has('Authorization'), false);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, { positions: input.positions, limits: {}, issue: false });
    return json(success({ compliance: 'compliant', violations: [], attestation_id: null, decision: undefined, verdict: undefined }));
  };
  const evaluation = await executeCheckPolicy({ positions: input.positions, limits: {} });
  assert.equal(evaluation.isError, false);
  assert.equal(JSON.parse(evaluation.text).compliance, 'compliant');
  assert.equal(JSON.parse(evaluation.text).verification_url, undefined);
  checks++;

  for (const status of [401, 402, 403]) {
    const refusal = { restricted_fields: ['risk_graph'], family: 'risk_graph', required_plan: 'Decisioning', upgrade_url: 'https://philidor.io/pricing', x402_price: null };
    globalThis.fetch = async () => json({ error: { code: 'FORBIDDEN', message: 'Plan required', refusal, request_id: 'fixture-request' } }, status);
    const result = await client.callTool({ name: 'check_policy', arguments: input });
    assert.equal(result.isError, true);
    const body = JSON.parse((result.content as any)[0].text);
    assert.deepEqual(body.error.refusal, refusal);
    assert.equal(body.error.request_id, 'fixture-request');
    assert.equal(body.compliance, undefined);
    checks++;
  }
  for (const response of [json('bad'), json({ data: null }), new Response('not json', { status: 403 }), json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } }, 503)]) {
    globalThis.fetch = async () => response;
    const result = await executeCheckPolicy(input);
    assert.equal(result.isError, true);
    assert.equal(JSON.parse(result.text).compliance, undefined);
    checks++;
  }
  globalThis.fetch = async (_url, init) => { assert.ok(init?.signal); throw new DOMException('Timeout', 'TimeoutError'); };
  const timeout = await executeCheckPolicy(input);
  assert.equal(JSON.parse(timeout.text).error.code, 'UPSTREAM');
  checks++;

  const secret = '11'.repeat(32);
  globalThis.fetch = async () => json({ error: { code: 'FORBIDDEN', message: `upstream ${secret}`, refusal: { privateKey: 'opaque' } } }, 403);
  const refusal = await client.callTool({ name: 'check_policy', arguments: input });
  assert.equal(refusal.isError, true);
  assert.ok(!JSON.stringify(refusal).includes(secret));
  assert.ok(!JSON.stringify(refusal).includes('opaque'));
  checks++;
} finally {
  globalThis.fetch = originalFetch;
  if (oldKey === undefined) delete process.env.PHILIDOR_API_KEY; else process.env.PHILIDOR_API_KEY = oldKey;
  await client.close(); await server.close();
}
console.log(`Policy attestation transport and contract checks passed (${checks}).`);
