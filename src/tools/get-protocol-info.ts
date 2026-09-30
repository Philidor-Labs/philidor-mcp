import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatProtocolInfo } from '../lib/formatters';

export function registerGetProtocolInfo(server: McpServer) {
  server.tool(
    'get_protocol_info',
    'Get detailed information about a DeFi protocol including TVL, vault count, versions, auditors, and security incidents.',
    {
      protocolId: z
        .string()
        .describe(
          'Protocol ID: aave, morpho, spark, compound, yearn, beefy, uniswap, nest, maple, kamino. Aave V4 is listed under aave (aave-v4 is accepted as an alias).'
        ),
    },
    async (params) => {
      const protocolId = params.protocolId === 'aave-v4' ? 'aave' : params.protocolId;
      const result = await apiGet<{ data: any }>(`/v1/protocols/${protocolId}`);
      const text = formatProtocolInfo(result.data);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
