import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultDetail } from '../lib/formatters';

export function registerVaultDueDiligence(server: McpServer) {
  server.prompt(
    'vault_due_diligence',
    'Generate a comprehensive due diligence report for a specific DeFi vault.',
    {
      network: z.string().describe('Network slug (e.g. ethereum, base, arbitrum)'),
      address: z.string().describe('Vault contract address (0x...)'),
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

1. **Safety Assessment**: Evaluate the risk score and tier. Is this vault appropriate for conservative investors?
2. **Risk Vector Analysis**: Break down each risk vector (Asset, Platform, Governance) and explain what the scores mean.
3. **Red Flags**: Identify any concerning factors (low scores, recent incidents, missing audits, short timelocks).
4. **Yield Analysis**: Is the APR sustainable? How does the TVL compare to peers?
5. **Recommendations**: Who is this vault suitable for? What should an investor monitor?

Here is the vault data:

${vaultMarkdown}`,
            },
          },
        ],
      };
    }
  );
}
