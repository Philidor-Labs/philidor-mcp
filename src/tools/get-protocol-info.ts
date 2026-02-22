import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatProtocolInfo } from '../lib/formatters';

export function registerGetProtocolInfo(server: McpServer) {
  server.tool(
    'get_protocol_info',
    'Get detailed information about a DeFi protocol including TVL, vault count, versions, auditors, and security incidents.',
    {
      protocolId: z.string().describe('Protocol ID (e.g. morpho, aave-v3, yearn-v3, beefy)'),
    },
    async (params) => {
      const result = await apiGet<{ data: any }>(`/v1/protocols/${params.protocolId}`);
      const text = formatProtocolInfo(result.data);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
