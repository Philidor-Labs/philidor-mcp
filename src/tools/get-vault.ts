import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultDetail } from '../lib/formatters';

export function registerGetVault(server: McpServer) {
  server.tool(
    'get_vault',
    'Get detailed information about a specific DeFi vault including risk breakdown, recent events, and historical snapshots. Lookup by ID or by network + address.',
    {
      id: z.string().optional().describe('Vault ID (e.g. morpho-ethereum-0x...)'),
      network: z.string().optional().describe('Network slug (e.g. ethereum, base, arbitrum)'),
      address: z.string().optional().describe('Vault contract address (0x...)'),
    },
    async (params) => {
      let data: any;

      if (params.id) {
        const result = await apiGet<{ data: any }>(`/v1/vaults/${params.id}`);
        data = result.data;
      } else if (params.network && params.address) {
        const result = await apiGet<{ data: any }>(`/v1/vault/${params.network}/${params.address}`);
        data = result.data;
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Please provide either an `id` or both `network` and `address`.',
            },
          ],
          isError: true,
        };
      }

      const text = formatVaultDetail(data);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
