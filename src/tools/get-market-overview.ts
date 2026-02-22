import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../api-client';
import { formatStats } from '../lib/formatters';

export function registerGetMarketOverview(server: McpServer) {
  server.tool(
    'get_market_overview',
    'Get a high-level overview of the DeFi vault market: total TVL, vault count, risk distribution, and TVL by protocol.',
    {},
    async () => {
      const result = await apiGet<{ data: any }>('/v1/stats');
      const text = formatStats(result.data);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
