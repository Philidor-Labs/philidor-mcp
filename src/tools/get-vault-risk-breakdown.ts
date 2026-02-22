import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';

export function registerGetVaultRiskBreakdown(server: McpServer) {
  server.tool(
    'get_vault_risk_breakdown',
    "Get a detailed breakdown of a vault's risk vectors: Asset Composition, Platform Code, and Governance scores with sub-metrics.",
    {
      network: z.string().describe('Network slug (e.g. ethereum, base, arbitrum)'),
      address: z.string().describe('Vault contract address (0x...)'),
    },
    async (params) => {
      const result = await apiGet<{ data: any }>(`/v1/vault/${params.network}/${params.address}`);
      const vault = result.data.vault;

      const round = (n: number) => Math.round(n * 100) / 100;

      const sections = [
        `## Risk Breakdown: ${vault.name}`,
        `**Overall Score:** ${round(vault.total_score ?? vault.risk_score ?? 0)}/10 (${vault.risk_tier})`,
      ];

      const rv = vault.risk_vectors;
      if (!rv) {
        sections.push('\nNo detailed risk vector data available for this vault.');
        return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
      }

      // Asset Composition
      sections.push('\n### Vector 1: Asset Composition (40% weight)');
      if (rv.asset) {
        sections.push(`**Score:** ${round(rv.asset.score)}/10`);
        if (rv.asset.details?.breakdown?.length) {
          sections.push('**Collateral mix:**');
          for (const item of rv.asset.details.breakdown) {
            const weight = (item.weight * 100).toFixed(1);
            sections.push(`- ${item.asset}: ${item.score}/10 (${weight}% weight)`);
          }
        }
      } else {
        sections.push('No asset composition data.');
      }

      // Platform Code
      sections.push('\n### Vector 2: Platform Code (40% weight)');
      if (rv.platform) {
        sections.push(`**Score:** ${round(rv.platform.score)}/10`);
        if (rv.platform.details) {
          const d = rv.platform.details;
          if (d.lindyScore !== undefined)
            sections.push(`- Lindy Score (time-based safety): ${round(d.lindyScore)}/10`);
          if (d.auditScore !== undefined)
            sections.push(`- Audit Density Score: ${d.auditScore}/10`);
          if (d.dependencyCount !== undefined)
            sections.push(`- Dependencies: ${d.dependencyCount}`);
          if (d.dependencies?.length) {
            for (const dep of d.dependencies) {
              sections.push(
                `  - ${dep.protocolId}: score ${dep.score}/10, safety factor ${dep.safetyFactor}x`
              );
            }
          }
          if (d.daysSinceIncident !== undefined)
            sections.push(`- Days Since Incident: ${d.daysSinceIncident}`);
          if (d.incidentPenaltyApplied)
            sections.push(
              `- Incident Penalty: Applied (capped at ${d.incidentPenaltyCap ?? 'N/A'})`
            );
        }
      } else {
        sections.push('No platform code data.');
      }

      // Governance
      sections.push('\n### Vector 3: Governance (20% weight)');
      if (rv.control) {
        sections.push(`**Score:** ${round(rv.control.score)}/10`);
        if (rv.control.details) {
          const d = rv.control.details;
          if (d.isImmutable !== undefined)
            sections.push(`- Immutable: ${d.isImmutable ? 'Yes' : 'No'}`);
          if (d.timelock !== undefined) {
            const hours = Math.floor(d.timelock / 3600);
            const days = Math.floor(d.timelock / 86400);
            sections.push(
              `- Timelock: ${d.timelock >= 86400 ? `${days} days` : `${hours} hours`} (${d.timelock}s)`
            );
          }
          if (d.governanceType) sections.push(`- Governance Type: ${d.governanceType}`);
        }
      } else {
        sections.push('No governance data.');
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
    }
  );
}
