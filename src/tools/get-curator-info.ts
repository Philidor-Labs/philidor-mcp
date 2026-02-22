import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatCuratorInfo } from '../lib/formatters';

export function registerGetCuratorInfo(server: McpServer) {
  server.tool(
    'get_curator_info',
    'Get detailed information about a vault curator including their managed vaults, TVL, chain distribution, and performance.',
    {
      curatorId: z.string().describe('Curator ID'),
    },
    async (params) => {
      const result = await apiGet<{ data: any }>(`/v1/curators/${params.curatorId}`);
      const text = formatCuratorInfo(result.data);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
