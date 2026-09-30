import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../api-client';
import { formatIncidentVaults } from '../lib/formatters';

export function registerListVaultsWithIncidents(server: McpServer) {
  server.tool(
    'list_vaults_with_incidents',
    'List all vaults that had a recent critical incident (last 365 days). Critical = severity Critical or incident_severity major. Results are sorted by TVL descending, then by time since event ascending (most recent first).',
    {},
    async () => {
      const result = await apiGet<{ data: any[] }>(
        '/v1/vaults/with-critical-incidents?limit=50'
      );
      const rows = [...(result.data || [])].sort((a, b) => {
        const tvl = (Number(b.tvl_usd) || 0) - (Number(a.tvl_usd) || 0);
        if (tvl !== 0) return tvl;
        return (Number(a.days_since_incident) || 0) - (Number(b.days_since_incident) || 0);
      });
      return {
        content: [{ type: 'text' as const, text: formatIncidentVaults(rows) }],
      };
    }
  );
}
