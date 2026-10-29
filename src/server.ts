import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { guardTransport } from './lib/key-guard';
import { installSecretScrubbing } from './lib/secret-scrub';

// Tools
import { registerCheckPolicy } from './tools/check-policy';
import { registerSearchVaults } from './tools/search-vaults';
import { registerGetVault } from './tools/get-vault';
import { registerGetVaultRiskBreakdown } from './tools/get-vault-risk-breakdown';
import { registerListMarkets } from './tools/list-markets';
import { registerGetMarket } from './tools/get-market';
import { registerGetMarketEvents } from './tools/get-market-events';
import { registerCheckLoopVenue } from './tools/check-loop-venue';
import { registerCompareVaults } from './tools/compare-vaults';
import { registerFindSafestVaults } from './tools/find-safest-vaults';
import { registerGetProtocolInfo } from './tools/get-protocol-info';
import { registerGetCuratorInfo } from './tools/get-curator-info';
import { registerGetMarketOverview } from './tools/get-market-overview';
import { registerExplainRiskScore } from './tools/explain-risk-score';
import { registerListVaultsWithIncidents } from './tools/list-vaults-with-incidents';

// Resources
import { registerMethodologyResource } from './resources/methodology';
import { registerSupportedChainsResource } from './resources/supported-chains';
import { registerSupportedProtocolsResource } from './resources/supported-protocols';

// Prompts
import { registerVaultDueDiligence } from './prompts/vault-due-diligence';
import { registerPortfolioRiskAssessment } from './prompts/portfolio-risk-assessment';
import { registerDefiYieldComparison } from './prompts/defi-yield-comparison';
import { registerReviewLoopVenue } from './prompts/review-loop-venue';

export const EXPECTED_TOOL_NAMES = [
  'search_vaults',
  'get_vault',
  'get_vault_risk_breakdown',
  'list_markets',
  'get_market',
  'get_market_events',
  'check_loop_venue',
  'compare_vaults',
  'find_safest_vaults',
  'get_protocol_info',
  'get_curator_info',
  'get_market_overview',
  'explain_risk_score',
  'list_vaults_with_incidents',
  'check_policy',
] as const;

export function createServer() {
  installSecretScrubbing();
  const server = new McpServer({
    name: 'philidor-defi-vaults',
    version: '1.0.0',
  }, { instructions: 'Philidor never accepts keys. Do not send private keys, session keys, seeds, or mnemonics. Use check_policy for a compliance attestation against positions, limits and constraints supplied by the caller; no Philidor policy is preselected. This server returns data and attestations only; it does not build, sign, or broadcast transactions. Keys and execution stay in the client-side SDK.' });

  const connect = server.connect.bind(server);
  server.connect = (transport) => connect(guardTransport(transport));

  // Register tools (order matches hosted tools/list)
  registerSearchVaults(server);
  registerGetVault(server);
  registerGetVaultRiskBreakdown(server);
  registerListMarkets(server);
  registerGetMarket(server);
  registerGetMarketEvents(server);
  registerCheckLoopVenue(server);
  registerCompareVaults(server);
  registerFindSafestVaults(server);
  registerGetProtocolInfo(server);
  registerGetCuratorInfo(server);
  registerGetMarketOverview(server);
  registerExplainRiskScore(server);
  registerListVaultsWithIncidents(server);
  registerCheckPolicy(server);

  // Register resources
  registerMethodologyResource(server);
  registerSupportedChainsResource(server);
  registerSupportedProtocolsResource(server);

  // Register prompts
  registerVaultDueDiligence(server);
  registerPortfolioRiskAssessment(server);
  registerDefiYieldComparison(server);
  registerReviewLoopVenue(server);

  return server;
}
