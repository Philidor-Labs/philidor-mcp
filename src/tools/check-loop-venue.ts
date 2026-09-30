import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, buildQueryString } from '../api-client';
import { formatLoopVenue } from '../lib/formatters';
import { fetchMarketDetail, findReserve, parseHubId } from '../lib/markets';

export function registerCheckLoopVenue(server: McpServer) {
  server.tool(
    'check_loop_venue',
    'Underwrite a collateral/debt loop on ONE lending market: score, tier, utilization, borrow APR, deposit status, and recent incidents for both reserves. Does not compute health factor and does not prepare txs. Call this before a protocol MCP preview_action / prepare_action. If you do not have a market id, call list_markets first (Aave V4: protocol=aave, version=v4). Examples: aave-v4-1-main, aave-v4-10-etherfi-cash, aave-v4-1-hub-global-dollar.',
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
    async (params) => {
      try {
        const detail = await fetchMarketDetail(params.marketId);
        const collateralReserve = findReserve(detail.reserves, params.collateral);
        const debtReserve = findReserve(detail.reserves, params.debt);

        const hub = parseHubId(params.marketId);
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
          const seen = new Set<string>();
          events = batches.flat().filter((e) => {
            const key = String(e.id ?? `${e.title}-${e.occurred_at}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        } else {
          const qs = buildQueryString({ limit: 20 });
          const result = await apiGet<{ data: any[] }>(
            `/v1/markets/${encodeURIComponent(params.marketId)}/events${qs}`
          );
          events = result.data || [];
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatLoopVenue({
                marketId: params.marketId,
                collateral: params.collateral,
                debt: params.debt,
                detail,
                collateralReserve,
                debtReserve,
                events,
              }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: err?.message || `Failed to underwrite loop on ${params.marketId}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
