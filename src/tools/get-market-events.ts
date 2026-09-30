import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, buildQueryString } from '../api-client';
import { formatMarketEvents } from '../lib/formatters';
import { fetchMarketDetail, parseHubId } from '../lib/markets';

export function registerGetMarketEvents(server: McpServer) {
  server.tool(
    'get_market_events',
    'Published risk events for ONE lending market: incidents, bad debt, liquidation cascades (e.g. mass liquidations on a Morpho Blue market). Market ids look like morpho-v1-1-pt-reusd-10dec2026-usdc-91-5. Aave V4 hub ids (aave-v4-1-hub-global-dollar) union the spoke feeds. Not platform stats (get_market_overview) and not the market data itself (get_market).',
    {
      marketId: z
        .string()
        .describe(
          'Market id from list_markets. Spoke or composed hub parent (aave-v4-1-hub-global-dollar).'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Max events (default 20)'),
    },
    async (params) => {
      const limit = params.limit ?? 20;
      const hub = parseHubId(params.marketId);

      let events: any[] = [];
      if (hub) {
        const detail = await fetchMarketDetail(params.marketId);
        const spokeIds = (detail.spokes || []).map((s) => s.id);
        const batches = await Promise.all(
          spokeIds.map(async (id) => {
            const qs = buildQueryString({ limit });
            const result = await apiGet<{ data: any[] }>(
              `/v1/markets/${encodeURIComponent(id)}/events${qs}`
            );
            return result.data || [];
          })
        );
        const seen = new Set<string>();
        events = batches
          .flat()
          .filter((e) => {
            const key = String(e.id ?? `${e.title}-${e.occurred_at}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort(
            (a, b) =>
              new Date(b.occurred_at || 0).getTime() - new Date(a.occurred_at || 0).getTime()
          )
          .slice(0, limit);
      } else {
        const qs = buildQueryString({ limit });
        const result = await apiGet<{ data: any[] }>(
          `/v1/markets/${encodeURIComponent(params.marketId)}/events${qs}`
        );
        events = result.data || [];
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: formatMarketEvents(params.marketId, events),
          },
        ],
      };
    }
  );
}
