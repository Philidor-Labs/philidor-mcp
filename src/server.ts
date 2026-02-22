import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Tools
import { registerSearchVaults } from './tools/search-vaults';
import { registerGetVault } from './tools/get-vault';
import { registerGetVaultRiskBreakdown } from './tools/get-vault-risk-breakdown';
import { registerCompareVaults } from './tools/compare-vaults';
import { registerFindSafestVaults } from './tools/find-safest-vaults';
import { registerGetProtocolInfo } from './tools/get-protocol-info';
import { registerGetCuratorInfo } from './tools/get-curator-info';
import { registerGetMarketOverview } from './tools/get-market-overview';
import { registerExplainRiskScore } from './tools/explain-risk-score';

// Resources
import { registerMethodologyResource } from './resources/methodology';
import { registerSupportedChainsResource } from './resources/supported-chains';
import { registerSupportedProtocolsResource } from './resources/supported-protocols';

// Prompts
import { registerVaultDueDiligence } from './prompts/vault-due-diligence';
import { registerPortfolioRiskAssessment } from './prompts/portfolio-risk-assessment';
import { registerDefiYieldComparison } from './prompts/defi-yield-comparison';

export function createServer() {
  const server = new McpServer({
    name: 'philidor-defi-vaults',
    version: '1.0.0',
  });

  // Register tools
  registerSearchVaults(server);
  registerGetVault(server);
  registerGetVaultRiskBreakdown(server);
  registerCompareVaults(server);
  registerFindSafestVaults(server);
  registerGetProtocolInfo(server);
  registerGetCuratorInfo(server);
  registerGetMarketOverview(server);
  registerExplainRiskScore(server);

  // Register resources
  registerMethodologyResource(server);
  registerSupportedChainsResource(server);
  registerSupportedProtocolsResource(server);

  // Register prompts
  registerVaultDueDiligence(server);
  registerPortfolioRiskAssessment(server);
  registerDefiYieldComparison(server);

  return server;
}
