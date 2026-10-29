import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import { createServer } from './server';
import { findSecretPaths, scrubSecrets } from './lib/key-material';
import { restoreSecretScrubbing } from './lib/secret-scrub';

// Public, synthetic fixtures only. Never send these tests to a live service.
const KEY = '11'.repeat(32);
const MNEMONIC = Array(12).fill('abandon').join(' ');
const ADDRESS = `0x${'ab'.repeat(20)}`;
const POOL = `0x${'cd'.repeat(32)}`;
const logs: string[] = [];
const originals = { ...console };
for (const name of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  console[name] = (...args: unknown[]) => { logs.push(JSON.stringify(args)); };
}
const originalFetch = globalThis.fetch;
let fetches: string[] = [];
globalThis.fetch = async (input) => {
  fetches.push(String(input));
  console.error({ privateKey: KEY, note: MNEMONIC, identifier: POOL });
  return new Response(JSON.stringify({ data: {
    vault: { name: 'Fixture', address: ADDRESS, total_score: 8 },
    snapshots: [], events: [],
  } }), { headers: { 'content-type': 'application/json' } });
};
const server = createServer();
const client = new Client({ name: 'phi-343-fixture', version: '0.0.0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
let checks = 0;
try {
  assert.match(client.getInstructions() ?? '', /Philidor never accepts keys/);
  const rejected = [
    { name: 'search_vaults', arguments: { query: KEY } },
    { name: 'search_vaults', arguments: { query: `note 0x${KEY}` } },
    { name: 'search_vaults', arguments: { query: MNEMONIC } },
    { name: 'explain_risk_score', arguments: { score: 8, privateKey: 'opaque' } },
    { name: 'explain_risk_score', arguments: { score: 8, session_key: '' } },
    { name: 'explain_risk_score', arguments: { score: 8, seed: null } },
    { name: 'get_vault', arguments: { id: `0x${KEY}` } },
    { name: 'get_vault', arguments: { address: `note ${POOL}`, network: 'ethereum' } },
    { name: 'search_vaults', arguments: [KEY] }, // Before SDK schema parsing.
    { name: 'search_vaults', arguments: { limit: { note: MNEMONIC } } },
    { name: 'get_vault', arguments: { id: 'example' }, _meta: { nested: [KEY] } },
    { name: KEY, arguments: {} },
    { name: 'search_vaults', arguments: {}, privateKey: 'opaque' },
  ];
  for (const params of rejected) {
    fetches = [];
    const result = await client.request({ method: 'tools/call', params }, z.any());
    assert.equal(result.isError, true);
    const text = JSON.stringify(result);
    assert.match(text, /Philidor never accepts keys/);
    assert.match(text, /BAD_REQUEST/);
    for (const secret of [KEY, MNEMONIC, 'opaque', 'privateKey', 'session_key']) {
      assert.ok(!text.includes(secret));
    }
    assert.equal(fetches.length, 0);
    checks++;
  }
  for (const [method, params] of [
    ['prompts/get', { name: 'vault_due_diligence', arguments: { network: 'ethereum', address: `note ${KEY}` } }],
    ['prompts/get', { name: 'portfolio_risk_assessment', arguments: { positions: JSON.stringify([{ address: MNEMONIC }]) } }],
    ['resources/read', { uri: `philidor://${KEY}` }],
    ['resources/read', { uri: 'philidor://methodology', _meta: { mnemonic: 'opaque' } }],
  ] as const) {
    fetches = [];
    const result = await client.request({ method, params }, z.any());
    const text = JSON.stringify(result);
    assert.match(text, /Philidor never accepts keys/);
    assert.ok(!text.includes(KEY) && !text.includes(MNEMONIC) && !text.includes('opaque'));
    assert.equal(fetches.length, 0);
    checks++;
  }
  for (const args of [
    { network: 'ethereum', address: ADDRESS },
    { network: 'ethereum', address: POOL },
    { network: 'solana', address: 'So11111111111111111111111111111111111111112' },
    { id: `uniswap-1-${POOL}` },
  ]) {
    fetches = [];
    const result = await client.callTool({ name: 'get_vault', arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.equal(fetches.length, 1);
    assert.ok(fetches[0].includes(args.address ?? args.id!));
    checks++;
  }
  // Preserve normal schema validation without leaking a malicious upstream error.
  globalThis.fetch = async () => { throw new Error(`upstream ${KEY} ${MNEMONIC}`); };
  const failure = await client.callTool({ name: 'get_vault', arguments: { network: 'ethereum', address: ADDRESS } });
  assert.ok(failure.isError);
  assert.ok(!JSON.stringify(failure).includes(KEY));
  assert.ok(!JSON.stringify(failure).includes(MNEMONIC));
  const safeOutput = (value: unknown) => {
    const text = JSON.stringify(value);
    assert.ok(!text.includes(KEY) && !text.includes(MNEMONIC) && !text.includes('opaque-secret'));
    assert.match(text, /redacted/);
  };
  safeOutput(await client.callTool({ name: 'compare_vaults', arguments: {
    vaults: [{ network: 'ethereum', address: ADDRESS }, { network: 'base', address: ADDRESS }],
  } }));
  safeOutput(await client.getPrompt({ name: 'portfolio_risk_assessment', arguments: {
    positions: JSON.stringify([{ network: 'ethereum', address: ADDRESS, allocationPercent: 100 }]),
  } }));
  for (const uri of ['philidor://supported-chains', 'philidor://supported-protocols']) {
    safeOutput(await client.readResource({ uri }));
  }
  globalThis.fetch = async (input) => {
    if (String(input).includes('/base/')) throw new Error(`upstream ${KEY} ${MNEMONIC}`);
    return new Response(JSON.stringify({ data: { vault: { name: 'Fixture', address: ADDRESS, total_score: 8 } } }));
  };
  const partial = await client.callTool({ name: 'compare_vaults', arguments: {
    vaults: [
      { network: 'ethereum', address: ADDRESS }, { network: 'ethereum', address: POOL },
      { network: 'base', address: ADDRESS },
    ],
  } });
  safeOutput(partial);
  assert.match(JSON.stringify(partial), /Could not fetch/);
  const partialPrompt = await client.getPrompt({ name: 'portfolio_risk_assessment', arguments: {
    positions: JSON.stringify([
      { network: 'ethereum', address: ADDRESS, allocationPercent: 50 },
      { network: 'base', address: ADDRESS, allocationPercent: 50 },
    ]),
  } });
  safeOutput(partialPrompt);
  assert.match(JSON.stringify(partialPrompt), /Fixture/);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: {
    privateKey: 'opaque-secret', message: `upstream ${KEY} ${MNEMONIC}`,
  } }), { status: 500 });
  safeOutput(await client.readResource({ uri: 'philidor://supported-protocols' }));
  await assert.rejects(client.readResource({ uri: 'philidor://missing' }), /Resource/);
  const normal = await client.callTool({ name: 'explain_risk_score', arguments: { score: 8 } });
  assert.ok(!normal.isError);
  assert.deepEqual(findSecretPaths({ vaults: [{ address: POOL }, { address: ADDRESS }] }, [], { tool: 'compare_vaults' }), []);
  for (const value of [KEY, `0x${KEY}`, MNEMONIC, { privateKey: 'opaque' }, { note: KEY }]) {
    assert.ok(!JSON.stringify(scrubSecrets(value)).includes(KEY));
  }
  const recorded = logs.join('\n');
  assert.ok(!recorded.includes(KEY) && !recorded.includes(MNEMONIC) && !recorded.includes(POOL.slice(2)));
  assert.match(recorded, /redacted/);
  checks += 13;
} finally {
  await client.close();
  await server.close();
  globalThis.fetch = originalFetch;
  restoreSecretScrubbing();
  for (const name of ['log', 'info', 'warn', 'error', 'debug'] as const) console[name] = originals[name];
}
console.log(`Key guard integration checks passed (${checks}).`);

// Exercise the actual CLI process and stdout framing, with network access
// restricted to a closed local port even if this regression fails.
const stdio = new StdioClientTransport({
  command: process.execPath,
  args: ['bin/cli.mjs'],
  cwd: process.cwd(),
  env: { PATH: process.env.PATH ?? '', PHILIDOR_API_URL: 'http://127.0.0.1:1' },
  stderr: 'pipe',
});
let stderr = '';
stdio.stderr?.on('data', (chunk) => { stderr += String(chunk); });
const stdioClient = new Client({ name: 'phi-343-stdio', version: '0.0.0' });
try {
  await stdioClient.connect(stdio);
  assert.match(stdioClient.getInstructions() ?? '', /Philidor never accepts keys/);
  const refused = await stdioClient.callTool({ name: 'search_vaults', arguments: { query: MNEMONIC } });
  assert.equal(refused.isError, true);
  assert.match(JSON.stringify(refused), /Philidor never accepts keys/);
  assert.ok(!JSON.stringify(refused).includes(MNEMONIC));
  const score = await stdioClient.callTool({ name: 'explain_risk_score', arguments: { score: 8 } });
  assert.ok(!score.isError);
} finally {
  await stdioClient.close();
}
assert.ok(!stderr.includes(KEY) && !stderr.includes(MNEMONIC));
console.log('CLI stdio key refusal and normal score lookup passed.');
