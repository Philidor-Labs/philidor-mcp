import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, buildQueryString } from '../api-client';
import { formatVaultSummary } from '../lib/formatters';

export function registerSearchVaults(server: McpServer) {
  server.tool(
    'search_vaults',
    'Search and filter DeFi vaults by chain, protocol, asset, risk tier, TVL, and more. Returns a paginated list with risk scores and APR.',
    {
      query: z
        .string()
        .optional()
        .describe('Search by vault name, symbol, asset, protocol, or curator'),
      chain: z
        .string()
        .optional()
        .describe('Filter by chain name or slug (e.g. Ethereum, Base, Arbitrum, Solana)'),
      protocol: z
        .string()
        .optional()
        .describe(
          'Filter by protocol ID: aave, morpho, spark, compound, yearn, beefy, uniswap, nest, maple, kamino. Aave V4 is protocol=aave plus protocolVersion=v4 (aave-v4 is accepted as an alias).'
        ),
      protocolVersion: z
        .string()
        .optional()
        .describe(
          'Filter by protocol generation: v3, v4, v3-lido, v3-horizon, klend, kvault. Required to isolate Aave V4 (protocol=aave, protocolVersion=v4). Vaults list this as protocol_version.'
        ),
      asset: z.string().optional().describe('Filter by asset symbol (e.g. USDC, WETH)'),
      riskTier: z.string().optional().describe('Filter by risk tier: Prime, Core, or Edge'),
      minTvl: z.number().optional().describe('Minimum TVL in USD'),
      depositable: z
        .boolean()
        .optional()
        .describe(
          'Filter by current ability to accept new deposits. When true, vaults whose depositability is not yet indexed are still included; when false, only vaults whose maxDeposit on-chain is zero (caps reached, paused, or supply queue saturated) are returned.'
        ),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field: tvl_usd, apr_net, name, last_synced_at'),
      sortOrder: z.string().optional().describe('Sort order: asc or desc'),
      limit: z.number().optional().describe('Max results (default 10, max 50)'),
    },
    async (params) => {
      let protocol = params.protocol;
      let protocolVersion = params.protocolVersion;
      if (protocol === 'aave-v4') {
        protocol = 'aave';
        protocolVersion = protocolVersion || 'v4';
      }

      const qs = buildQueryString({
        search: params.query,
        chain: params.chain,
        protocol,
        protocol_version: protocolVersion,
        asset: params.asset,
        riskTier: params.riskTier,
        minTvl: params.minTvl,
        depositable: params.depositable,
        sortBy: params.sortBy || 'tvl_usd',
        sortOrder: params.sortOrder || 'desc',
        limit: Math.min(params.limit || 10, 50),
        page: 1,
      });

      const result = await apiGet<{ data: any[]; meta: any }>(`/v1/vaults${qs}`);
      const vaults = result.data;

      if (!vaults.length) {
        return {
          content: [
            { type: 'text' as const, text: 'No vaults found matching the given criteria.' },
          ],
        };
      }

      const lines = vaults.map((v) => formatVaultSummary(v));
      const summary =
        `Found ${result.meta.total} vaults (showing ${vaults.length}):\n\n` +
        lines.join('\n\n---\n\n');

      return { content: [{ type: 'text' as const, text: summary }] };
    }
  );
}
