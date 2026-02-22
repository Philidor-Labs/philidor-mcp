import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatRiskScoreExplanation } from '../lib/formatters';

export function registerExplainRiskScore(server: McpServer) {
  server.tool(
    'explain_risk_score',
    'Explain what a Philidor risk score means, including the tier (Prime/Core/Edge), how it is calculated, and what the thresholds are.',
    {
      score: z.number().min(0).max(10).describe('Risk score (0-10) to explain'),
    },
    async (params) => {
      const text = formatRiskScoreExplanation(params.score);
      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
