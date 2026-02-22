import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, buildQueryString } from '../api-client';
import { formatVaultSummary } from '../lib/formatters';

export function registerFindSafestVaults(server: McpServer) {
  server.tool(
    'find_safest_vaults',
    'Find the safest (highest risk-scored) DeFi vaults, optionally filtered by asset, chain, or minimum TVL. Returns top 10 audited, high-confidence vaults sorted by risk score.',
    {
      asset: z.string().optional().describe('Filter by asset symbol (e.g. USDC, WETH)'),
      chain: z.string().optional().describe('Filter by chain name (e.g. Ethereum, Base)'),
      minTvl: z.number().optional().describe('Minimum TVL in USD'),
    },
    async (params) => {
      const qs = buildQueryString({
        asset: params.asset,
        chain: params.chain,
        minTvl: params.minTvl,
        audited: true,
        sortBy: 'tvl_usd',
        sortOrder: 'desc',
        limit: 50,
        page: 1,
      });

      const result = await apiGet<{ data: any[]; meta: any }>(`/v1/vaults${qs}`);
      const vaults = result.data;

      const sorted = vaults
        .filter((v) => v.total_score !== null && v.total_score !== undefined)
        .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
        .slice(0, 10);

      if (!sorted.length) {
        return {
          content: [
            { type: 'text' as const, text: 'No audited vaults found matching the given criteria.' },
          ],
        };
      }

      const lines = sorted.map((v, i) => `**#${i + 1}**\n${formatVaultSummary(v)}`);
      const text = `## Top ${sorted.length} Safest Vaults\n\n` + lines.join('\n\n---\n\n');

      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
