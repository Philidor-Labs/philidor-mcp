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
      chain: z.string().optional().describe('Filter by chain name (e.g. Ethereum, Base)'),
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
      const vaults = result.data.filter((v) => {
        const apr = parseFloat(v.apr_net);
        return isNaN(apr) || apr <= 1.0;
      });

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

1. **Yield Ranking**: Which vaults offer the best APR? Is the yield sustainable or likely promotional?
2. **Risk-Adjusted Returns**: Which vaults offer the best yield relative to their risk score?
3. **Safety Trade-offs**: What yield premium do riskier vaults command? Is it worth it?
4. **Top Picks**: Recommend the best vault for (a) a conservative investor, (b) a balanced investor, and (c) a yield-maximizing investor.
5. **Key Differences**: What are the main differentiators between these vaults?

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
