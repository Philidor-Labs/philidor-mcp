import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMarkets } from '../lib/markets';
import { formatMarketList } from '../lib/formatters';

export function registerListMarkets(server: McpServer) {
  server.tool(
    'list_markets',
    'List lending markets: the market a depositor actually picks (Aave/Spark pool, Aave V4 spoke, Compound Comet, Morpho Blue pair, or Kamino K-Lend market). Aave V4 spokes that share a liquidity hub are grouped under a composed parent (aave-v4-1-hub-global-dollar). The API still keys each market on the spoke. NOTE: this is not `get_market_overview`, which returns platform-wide totals across all vaults.',
    {
      protocol: z
        .string()
        .optional()
        .describe(
          'Filter by protocol id: aave, spark, compound, morpho, kamino. Aave V4 is protocol=aave plus version=v4 (aave-v4 is accepted as an alias).'
        ),
      version: z
        .string()
        .optional()
        .describe('Filter by protocol version: v3, v4, or klend. Use version=v4 with protocol=aave.'),
      chain: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Filter by chain: integer chain id (e.g. 1, 8453) or slug (e.g. ethereum, solana)'),
      limit: z.number().optional().describe('Results per page (1-100, default 20)'),
      sortBy: z
        .enum(['total_supplied_usd', 'total_borrowed_usd', 'reserve_count', 'name'])
        .optional()
        .describe('Sort field (default total_supplied_usd)'),
    },
    async (params) => {
      const { items, totalSpokes } = await fetchMarkets({
        protocol: params.protocol,
        version: params.version,
        chain: params.chain,
        limit: params.limit,
        sortBy: params.sortBy,
      });

      if (!items.length) {
        return {
          content: [{ type: 'text' as const, text: 'No lending markets found for those filters.' }],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: formatMarketList(items, items.length, totalSpokes),
          },
        ],
      };
    }
  );
}
