import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, buildQueryString } from '../api-client';
import { formatVaultSummary } from '../lib/formatters';

export function registerDefiYieldComparison(server: McpServer) {
  server.prompt(
    'defi_yield_comparison',
    'Compare DeFi yield opportunities across vaults, filtered by asset, chain, or risk tier.',
    {
      asset: z.string().optional().describe('Filter by asset symbol (e.g. USDC, WETH)'),
      chain: z
        .string()
        .optional()
        .describe('Filter by chain name or slug (e.g. Ethereum, Base, Arbitrum, Solana)'),
      riskTier: z.string().optional().describe('Filter by risk tier: Prime, Core, or Edge'),
    },
    async (args) => {
      const qs = buildQueryString({
        asset: args.asset,
        chain: args.chain,
        riskTier: args.riskTier,
        sortBy: 'apr_net',
        sortOrder: 'desc',
        limit: 20,
        page: 1,
      });

      const result = await apiGet<{ data: any[]; meta: any }>(`/v1/vaults${qs}`);
      const vaults = result.data;

      const vaultSummaries = vaults.map((v, i) => `**#${i + 1}**\n${formatVaultSummary(v)}`);

      const filterDesc =
        [
          args.asset ? `Asset: ${args.asset}` : null,
          args.chain ? `Chain: ${args.chain}` : null,
          args.riskTier ? `Risk Tier: ${args.riskTier}` : null,
        ]
          .filter(Boolean)
          .join(', ') || 'No filters applied';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please compare these DeFi yield opportunities and provide analysis. Filters: ${filterDesc}

Analyze the following:

1. **Yield Ranking**: vaults sorted by APR from the tool results
2. **Yield vs Risk Score**: APR next to composite risk score and tier
3. **Safety Trade-offs**: what is given up for higher yield
4. **Yield Bands**: conservative, balanced, and yield-maximizing categories based on returned scores
5. **Key Differences**: observed metric differences across the band

Do not invent risk numbers. Keep base yield and rewards separate when both are present. Note closed or unknown deposits.

Vaults sorted by APR (highest first):

${vaultSummaries.join('\n\n---\n\n')}

Total matching vaults: ${result.meta.total}`,
            },
          },
        ],
      };
    }
  );
}
