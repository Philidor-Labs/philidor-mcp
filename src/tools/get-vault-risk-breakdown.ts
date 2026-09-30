import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../api-client';

export function registerGetVaultRiskBreakdown(server: McpServer) {
  server.tool(
    'get_vault_risk_breakdown',
    "Get a detailed breakdown of a vault's risk vectors: Asset Composition, Platform and Strategy, Control and Governance, and History scores with sub-metrics.",
    {
      network: z
        .string()
        .describe(
          'Network slug from the chain registry (e.g. ethereum, base, arbitrum, solana). /v1/chains lists slugs for chains with active vaults.'
        ),
      address: z
        .string()
        .describe(
          "Vault address in the chain's namespace: 0x-hex on EVM chains, base58 (case-sensitive) on Solana"
        ),
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

      sections.push('\n### Vector 1: Asset Composition (30% weight)');
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

      sections.push('\n### Vector 2: Platform and Strategy (30% weight)');
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
        sections.push('No platform and strategy data.');
      }

      sections.push('\n### Vector 3: Control and Governance (20% weight)');
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
        sections.push('No control and governance data.');
      }

      sections.push('\n### Vector 4: History (20% weight)');
      if (rv.history) {
        sections.push(`**Score:** ${round(rv.history.score)}/10`);
        if (rv.history.details) {
          const d = rv.history.details;
          for (const [key, value] of Object.entries(d)) {
            sections.push(`- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
          }
        }
      } else {
        sections.push('No history data.');
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
    }
  );
}
