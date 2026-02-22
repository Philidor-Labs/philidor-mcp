import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultComparison } from '../lib/formatters';

export function registerCompareVaults(server: McpServer) {
  server.tool(
    'compare_vaults',
    'Compare 2-3 DeFi vaults side-by-side on TVL, APR, risk score, risk tier, audited status, and more.',
    {
      vaults: z
        .array(
          z.object({
            network: z.string().describe('Network slug (e.g. ethereum, base)'),
            address: z.string().describe('Vault contract address (0x...)'),
          })
        )
        .min(2)
        .max(3)
        .describe('Array of 2-3 vaults to compare'),
    },
    async (params) => {
      const settled = await Promise.allSettled(
        params.vaults.map((v) => apiGet<{ data: any }>(`/v1/vault/${v.network}/${v.address}`))
      );

      const errors: string[] = [];
      const vaultData: any[] = [];
      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          vaultData.push(result.value.data);
        } else {
          errors.push(
            `${params.vaults[i].network}/${params.vaults[i].address}: ${result.reason?.message || 'Unknown error'}`
          );
        }
      });

      if (vaultData.length < 2) {
        const errorList = errors.length
          ? `\n\nErrors:\n${errors.map((e) => `- ${e}`).join('\n')}`
          : '';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Need at least 2 vaults to compare, but only ${vaultData.length} could be fetched.${errorList}`,
            },
          ],
        };
      }

      let text = formatVaultComparison(vaultData);
      if (errors.length) {
        text += `\n\n**Note:** Could not fetch: ${errors.join('; ')}`;
      }

      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
