import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../api-client';
import { formatNumber } from '../lib/formatters';

export function registerSupportedProtocolsResource(server: McpServer) {
  server.resource(
    'supported-protocols',
    'philidor://supported-protocols',
    { description: 'List of DeFi protocols tracked by Philidor with vault counts and TVL.' },
    async (uri) => {
      let text: string;
      try {
        const result = await apiGet<{ data: any[] }>('/v1/protocols');
        const protocols = result.data;

        const lines = [
          '# Supported Protocols',
          '',
          ...protocols.map(
            (p: any) =>
              `- **${p.name}** (\`${p.id}\`): ${p.vault_count} vaults, $${formatNumber(p.tvl)} TVL`
          ),
        ];
        text = lines.join('\n');
      } catch (err: any) {
        text = `# Supported Protocols\n\nUnable to fetch protocol data: ${err.message || 'API unavailable'}. Please try again later.`;
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
