import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';
import { formatVaultSummary } from '../lib/formatters';

export function registerPortfolioRiskAssessment(server: McpServer) {
  server.prompt(
    'portfolio_risk_assessment',
    'Analyze portfolio-level risk across multiple vault positions.',
    {
      positions: z
        .string()
        .describe('JSON array of positions: [{network, address, allocationPercent}]'),
    },
    async ({ positions }) => {
      let parsed: Array<{ network: string; address: string; allocationPercent: number }>;
      try {
        parsed = JSON.parse(positions);
      } catch {
        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: 'Error: Invalid JSON in positions parameter. Expected format: [{network, address, allocationPercent}]',
              },
            },
          ],
        };
      }

      const settled = await Promise.allSettled(
        parsed.map(async (pos) => {
          const result = await apiGet<{ data: any }>(`/v1/vault/${pos.network}/${pos.address}`);
          return { ...pos, data: result.data };
        })
      );

      const successes: Array<{
        network: string;
        address: string;
        allocationPercent: number;
        data: any;
      }> = [];
      const errors: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          errors.push(
            `${parsed[i].network}/${parsed[i].address} (${parsed[i].allocationPercent}%): ${result.reason?.message || 'Unknown error'}`
          );
        }
      });

      const positionSummaries = successes.map((r) => {
        const vault = r.data.vault;
        return `### ${r.allocationPercent}% — ${vault.name}
${formatVaultSummary(vault)}`;
      });

      let errorSection = '';
      if (errors.length) {
        errorSection = `\n\n**Note:** The following positions could not be fetched:\n${errors.map((e) => `- ${e}`).join('\n')}\n`;
      }

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform a portfolio-level risk assessment for the following DeFi vault positions. Analyze:

1. **Portfolio Composition**: Summarize the overall allocation by chain, protocol, asset type, and risk tier.
2. **Concentration Risk**: Are there over-concentrations in a single protocol, chain, or curator?
3. **Weighted Risk Score**: Calculate a portfolio-weighted average risk score.
4. **Correlation Risk**: Do any vaults share the same underlying protocol code or dependencies?
5. **Diversification Suggestions**: What changes would improve the portfolio's risk profile?
6. **Worst-Case Scenarios**: What happens if a single protocol or chain has a security incident?

Portfolio positions:

${positionSummaries.join('\n\n---\n\n')}${errorSection}`,
            },
          },
        ],
      };
    }
  );
}
