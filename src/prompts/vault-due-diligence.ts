import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultDetail } from '../lib/formatters';

export function registerVaultDueDiligence(server: McpServer) {
  server.prompt(
    'vault_due_diligence',
    'Generate a comprehensive due diligence report for a specific DeFi vault.',
    {
      network: z
        .string()
        .describe(
          'Network slug from the chain registry (e.g. ethereum, base, arbitrum, solana). /v1/chains lists slugs for chains with active vaults.'
        ),
      address: z
        .string()
        .describe(
          "Vault address in the chain's namespace: 0x-hex on EVM chains, base58 (case-sensitive) on Solana"
        ),
    },
    async ({ network, address }) => {
      const result = await apiGet<{ data: any }>(`/v1/vault/${network}/${address}`);
      const vaultMarkdown = formatVaultDetail(result.data);

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform a comprehensive due diligence analysis of the following DeFi vault. Cover these areas:

1. **Safety Metrics**: overall risk score and tier classification
2. **Risk Vector Analysis**: Asset Composition, Platform and Strategy, Control and Governance, and History
3. **Red Flags**: warning indicators from scores, deposits, audits, or events
4. **Yield Analysis**: APR decomposition (base vs rewards) when present
5. **Monitoring Indicators**: observed fields and events surfaced by the analysis

Cite only identifiers and figures present in the vault data. A higher Philidor score means lower assessed risk under the current methodology; it is not a safety guarantee.

Here is the vault data:

${vaultMarkdown}`,
            },
          },
        ],
      };
    }
  );
}
