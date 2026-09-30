import assert from 'node:assert/strict';
import { createServer, EXPECTED_TOOL_NAMES } from './server.js';
import { composeMarketList, sortComposedMarkets } from './lib/markets.js';
import { formatDepositStatus, formatNumber } from './lib/formatters.js';

function registeredToolNames(server: ReturnType<typeof createServer>): string[] {
  const tools = (server as any)._registeredTools as Record<string, unknown>;
  return Object.keys(tools);
}

function registeredPromptNames(server: ReturnType<typeof createServer>): string[] {
  const prompts = (server as any)._registeredPrompts as Record<string, unknown>;
  return Object.keys(prompts);
}

function registeredResourceNames(server: ReturnType<typeof createServer>): string[] {
  const resources = (server as any)._registeredResources as Record<string, unknown>;
  return Object.keys(resources);
}

const server = createServer();
const tools = registeredToolNames(server);
assert.deepEqual(tools, [...EXPECTED_TOOL_NAMES]);
assert.equal(tools.length, 14);

const prompts = registeredPromptNames(server);
assert.deepEqual(prompts.sort(), [
  'defi_yield_comparison',
  'portfolio_risk_assessment',
  'review_loop_venue',
  'vault_due_diligence',
].sort());

const resources = registeredResourceNames(server);
assert.ok(resources.includes('philidor://methodology'));
assert.ok(resources.includes('philidor://supported-chains'));
assert.ok(resources.includes('philidor://supported-protocols'));

assert.equal(formatDepositStatus({ is_depositable: false }), 'closed');
assert.match(
  formatDepositStatus({ is_depositable: true, deposit_capacity_usd: 1_000_000 }),
  /open · capacity/
);
assert.equal(formatDepositStatus({ is_depositable: null }), 'unknown');
assert.equal(formatNumber(1_500_000), '1.50M');

const composed = composeMarketList([
  {
    id: 'aave-v4-1-main',
    protocol_id: 'aave',
    protocol_version: 'v4',
    chain_id: 1,
    chain_name: 'Ethereum',
    protocol_name: 'Aave',
    market_key: 'main',
    name: 'Aave V4 Main',
    hub_address: '0xcca852bc40e560adc3b1cc58ca5b55638ce826c9',
    total_supplied_usd: 100,
    total_borrowed_usd: 40,
    utilization: 0.4,
    reserve_count: 10,
  },
  {
    id: 'aave-v4-1-etherfi',
    protocol_id: 'aave',
    protocol_version: 'v4',
    chain_id: 1,
    chain_name: 'Ethereum',
    protocol_name: 'Aave',
    market_key: 'etherfi',
    name: 'Aave V4 Etherfi',
    hub_address: '0xcca852bc40e560adc3b1cc58ca5b55638ce826c9',
    total_supplied_usd: 50,
    total_borrowed_usd: 10,
    utilization: 0.2,
    reserve_count: 5,
  },
  {
    id: 'aave-v4-1-bluechip',
    protocol_id: 'aave',
    protocol_version: 'v4',
    chain_id: 1,
    chain_name: 'Ethereum',
    protocol_name: 'Aave',
    market_key: 'bluechip',
    name: 'Aave V4 Bluechip',
    hub_address: '0x943827dca022d0f354a8a8c332da1e5eb9f9f931',
    total_supplied_usd: 80,
    total_borrowed_usd: 10,
    utilization: 0.1,
    reserve_count: 7,
  },
]);

const sorted = sortComposedMarkets(composed);
assert.equal(sorted.length, 2);
assert.equal(sorted[0].kind, 'hub');
if (sorted[0].kind === 'hub') {
  assert.equal(sorted[0].id, 'aave-v4-1-hub-core');
  assert.equal(sorted[0].spokes.length, 2);
  assert.equal(sorted[0].total_supplied_usd, 150);
}
assert.equal(sorted[1].kind, 'spoke');

console.log('All tests passed.');
