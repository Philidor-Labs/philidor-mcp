import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMarketDetail } from '../lib/markets';
import { formatMarketDetail } from '../lib/formatters';

export function registerGetMarket(server: McpServer) {
  server.tool(
    'get_market',
    'Get one lending market with every reserve it contains: supplied, supply APR, borrowed, borrow APR, utilization and risk tier per reserve. Spoke ids look like aave-v4-10-etherfi-cash. Aave V4 hub parents (aave-v4-1-hub-global-dollar) are composed from the spokes that share that hub; /v1/markets does not serve those ids.',
    {
      marketId: z
        .string()
        .describe(
          'Market id from list_markets. Spoke example: aave-v4-10-etherfi-cash. Hub example: aave-v4-1-hub-global-dollar.'
        ),
    },
    async (params) => {
      try {
        const detail = await fetchMarketDetail(params.marketId);
        return {
          content: [{ type: 'text' as const, text: formatMarketDetail(detail) }],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: err?.message || `Failed to load market ${params.marketId}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
