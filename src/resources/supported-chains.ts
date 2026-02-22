import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../api-client';
import { formatNumber } from '../lib/formatters';

export function registerSupportedChainsResource(server: McpServer) {
  server.resource(
    'supported-chains',
    'philidor://supported-chains',
    { description: 'List of blockchain networks supported by Philidor with vault counts and TVL.' },
    async (uri) => {
      let text: string;
      try {
        const result = await apiGet<{ data: any[] }>('/v1/chains');
        const chains = result.data;

        const lines = [
          '# Supported Chains',
          '',
          ...chains.map(
            (c: any) =>
              `- **${c.name}** (Chain ID: ${c.id}): ${c.vault_count} vaults, $${formatNumber(c.tvl)} TVL`
          ),
        ];
        text = lines.join('\n');
      } catch (err: any) {
        text = `# Supported Chains\n\nUnable to fetch chain data: ${err.message || 'API unavailable'}. Please try again later.`;
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    }
  );
}
