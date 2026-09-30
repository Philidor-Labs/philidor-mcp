import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultDetail } from '../lib/formatters';

export function registerGetVault(server: McpServer) {
  server.tool(
    'get_vault',
    'Get detailed information about a specific DeFi vault including risk breakdown, recent events, and historical snapshots. Lookup by ID or by network + address.',
    {
      id: z.string().optional().describe('Vault ID (e.g. morpho-1-0x...)'),
      network: z
        .string()
        .optional()
        .describe(
          'Network slug from the chain registry (e.g. ethereum, base, arbitrum, solana). /v1/chains lists slugs for chains with active vaults.'
        ),
      address: z
        .string()
        .optional()
        .describe(
          "Vault address in the chain's namespace: 0x-hex on EVM chains, base58 (case-sensitive) on Solana"
        ),
    },
    async (params) => {
      let data: any;

      if (params.id) {
        const result = await apiGet<{ data: any }>(`/v1/vaults/${params.id}`);
        data = result.data;
      } else if (params.network && params.address) {
        const result = await apiGet<{ data: any }>(
          `/v1/vault/${params.network}/${params.address}`
        );
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
