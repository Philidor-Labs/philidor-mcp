import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMarketDetail, findReserve } from '../lib/markets';
import { apiGet, buildQueryString } from '../api-client';
import { formatLoopVenue } from '../lib/formatters';
import { parseHubId } from '../lib/markets';

export function registerReviewLoopVenue(server: McpServer) {
  server.prompt(
    'review_loop_venue',
    'Review a collateral/debt loop on one Philidor market, then hand off to a protocol MCP for wallet health factor and unsigned txs.',
    {
      marketId: z
        .string()
        .describe(
          'Market id from list_markets. Spoke example: aave-v4-1-main. Hub example: aave-v4-1-hub-global-dollar.'
        ),
      collateral: z
        .string()
        .describe('Collateral asset symbol you will post (e.g. weETH, WETH, cbBTC).'),
      debt: z.string().describe('Debt asset symbol you will borrow (e.g. USDC, USDT, GHO).'),
    },
    async ({ marketId, collateral, debt }) => {
      const detail = await fetchMarketDetail(marketId);
      const collateralReserve = findReserve(detail.reserves, collateral);
      const debtReserve = findReserve(detail.reserves, debt);

      const hub = parseHubId(marketId);
      let events: any[] = [];
      if (hub) {
        const spokeIds = (detail.spokes || []).map((s) => s.id);
        const batches = await Promise.all(
          spokeIds.map(async (id) => {
            const qs = buildQueryString({ limit: 20 });
            const result = await apiGet<{ data: any[] }>(
              `/v1/markets/${encodeURIComponent(id)}/events${qs}`
            );
            return result.data || [];
          })
        );
        events = batches.flat();
      } else {
        const qs = buildQueryString({ limit: 20 });
        const result = await apiGet<{ data: any[] }>(
          `/v1/markets/${encodeURIComponent(marketId)}/events${qs}`
        );
        events = result.data || [];
      }

      const venueMarkdown = formatLoopVenue({
        marketId,
        collateral,
        debt,
        detail,
        collateralReserve,
        debtReserve,
        events,
      });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Review this collateral/debt loop venue. Cover:

1. **Venue**: spoke or hub, chain, whether both legs exist
2. **Collateral**: score, tier, utilization, deposit status
3. **Debt**: borrow APR, utilization, whether deposits are closed or unknown
4. **Flags**: shutdown, closed, Edge, missing reserve, high utilization
5. **Incidents** on this market
6. **Handoff**: Philidor does not compute health factor or prepare txs — next step is the protocol MCP (\`get_user_summary\`, \`preview_action\`, \`prepare_action\`)

Venue data:

${venueMarkdown}`,
            },
          },
        ],
      };
    }
  );
}
