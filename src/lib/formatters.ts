export function formatVaultSummary(vault: any): string {
  const rs = vault.risk_score;
  const riskTier =
    vault.risk_tier ||
    (rs != null && rs >= 8
      ? 'Prime'
      : rs != null && rs >= 5
        ? 'Core'
        : rs != null
          ? 'Edge'
          : 'N/A');
  const score = vault.total_score ?? vault.risk_score ?? 'N/A';
  return [
    `## ${vault.name}`,
    `**Protocol:** ${vault.protocol_name} | **Chain:** ${vault.chain_name} | **Asset:** ${vault.asset_symbol || 'N/A'}`,
    `**TVL:** $${formatNumber(vault.tvl_usd)} | **APR:** ${formatPercent(vault.apr_net)}`,
    `**Risk Score:** ${score}/10 (${riskTier})`,
    vault.curator_name ? `**Curator:** ${vault.curator_name}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatVaultDetail(data: { vault: any; snapshots: any[]; events: any[] }): string {
  const { vault, snapshots, events } = data;
  const sections = [formatVaultSummary(vault)];

  const apr7d = computeAvgApr(snapshots, 7);
  const apr30d = computeAvgApr(snapshots, 30);
  if (apr7d != null || apr30d != null) {
    const parts = [`**APR (current):** ${formatPercent(vault.apr_net)}`];
    if (apr7d != null) parts.push(`**APR (7d avg):** ${formatPercent(apr7d)}`);
    if (apr30d != null) parts.push(`**APR (30d avg):** ${formatPercent(apr30d)}`);
    sections.push(parts.join(' | '));
  }

  if (vault.risk_vectors) {
    sections.push('\n### Risk Breakdown');
    const rv = vault.risk_vectors;
    if (rv.asset) sections.push(`- **Asset Composition:** ${rv.asset.score}/10`);
    if (rv.platform)
      sections.push(
        `- **Platform Code:** ${rv.platform.score}/10 (Lindy: ${rv.platform.details?.lindyScore ?? 'N/A'}, Audit: ${rv.platform.details?.auditScore ?? 'N/A'})`
      );
    if (rv.control)
      sections.push(
        `- **Governance:** ${rv.control.score}/10${rv.control.details?.timelock ? ` (Timelock: ${formatTimelock(rv.control.details.timelock)})` : ''}`
      );
  }

  const meta: string[] = [];
  if (vault.audit_status) meta.push(`Audit: ${vault.audit_status}`);
  if (vault.strategy_type) meta.push(`Strategy: ${vault.strategy_type}`);
  if (vault.deployment_timestamp)
    meta.push(`Deployed: ${new Date(vault.deployment_timestamp).toLocaleDateString()}`);
  if (meta.length) sections.push('\n### Metadata\n' + meta.join(' | '));

  if (events?.length) {
    sections.push('\n### Recent Events');
    for (const e of events.slice(0, 5)) {
      sections.push(
        `- **${e.event_type}** (${e.severity}): ${e.title} — ${new Date(e.occurred_at).toLocaleDateString()}`
      );
    }
  }

  return sections.join('\n');
}

export function formatVaultComparison(vaults: any[]): string {
  const headers = ['Metric', ...vaults.map((v) => v.vault?.name || v.name || 'Unknown')];
  const rows = [
    ['Protocol', ...vaults.map((v) => (v.vault || v).protocol_name)],
    ['Chain', ...vaults.map((v) => (v.vault || v).chain_name)],
    ['Asset', ...vaults.map((v) => (v.vault || v).asset_symbol || 'N/A')],
    ['TVL', ...vaults.map((v) => '$' + formatNumber((v.vault || v).tvl_usd))],
    ['APR', ...vaults.map((v) => formatPercent((v.vault || v).apr_net))],
    ['APR (7d avg)', ...vaults.map((v) => formatPercent(computeAvgApr(v.snapshots, 7)))],
    ['APR (30d avg)', ...vaults.map((v) => formatPercent(computeAvgApr(v.snapshots, 30)))],
    [
      'Risk Score',
      ...vaults.map((v) => {
        const d = v.vault || v;
        return `${d.total_score ?? d.risk_score ?? 'N/A'}/10`;
      }),
    ],
    [
      'Risk Tier',
      ...vaults.map((v) => {
        const d = v.vault || v;
        return d.risk_tier || 'N/A';
      }),
    ],
    ['Audited', ...vaults.map((v) => ((v.vault || v).is_audited ? 'Yes' : 'No'))],
  ];

  return formatMarkdownTable(headers, rows);
}

function computeAvgApr(snapshots: any[] | undefined, days: number): number | null {
  if (!snapshots?.length) return null;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = snapshots.filter(
    (s) => new Date(s.recorded_at).getTime() >= cutoff && s.apr_net != null
  );
  if (!recent.length) return null;
  const sum = recent.reduce((acc, s) => acc + parseFloat(s.apr_net), 0);
  return sum / recent.length;
}

export function formatProtocolInfo(data: any): string {
  const { protocol, vaults, versions, incidents } = data;
  const sections = [
    `## ${protocol.name}`,
    protocol.description ? `\n${protocol.description}` : '',
    `\n**TVL:** $${formatNumber(protocol.tvl_total)} | **Vaults:** ${protocol.vault_count}`,
    protocol.mainnet_launch_date ? `**Launch Date:** ${protocol.mainnet_launch_date}` : '',
    protocol.primary_auditors?.length
      ? `**Auditors:** ${protocol.primary_auditors.join(', ')}`
      : '',
    protocol.bug_bounty_url ? `**Bug Bounty:** ${protocol.bug_bounty_url}` : '',
  ].filter(Boolean);

  if (versions?.length) {
    sections.push('\n### Versions');
    for (const v of versions) {
      sections.push(
        `- **${v.display_name || v.version}**: ${v.vault_count} vaults, $${formatNumber(v.tvl)} TVL`
      );
    }
  }

  if (incidents?.length) {
    sections.push('\n### Security Incidents');
    for (const i of incidents) {
      sections.push(
        `- **${i.title}** (${i.incident_severity || 'N/A'}) — ${new Date(i.occurred_at).toLocaleDateString()}`
      );
    }
  }

  return sections.join('\n');
}

export function formatCuratorInfo(data: any): string {
  const { curator, vaults, chainDistribution } = data;
  const sections = [
    `## ${curator.name}`,
    curator.one_liner ? `\n${curator.one_liner}` : '',
    `\n**TVL:** $${formatNumber(curator.tvl_total)} | **Vaults:** ${curator.vault_count} | **Avg APR:** ${formatPercent(curator.avg_apr)}`,
  ].filter(Boolean);

  if (chainDistribution?.length) {
    sections.push('\n### Chain Distribution');
    for (const c of chainDistribution) {
      sections.push(`- **${c.name}**: ${c.vault_count} vaults, $${formatNumber(c.tvl)} TVL`);
    }
  }

  if (vaults?.length) {
    sections.push(`\n### Top Vaults (${Math.min(vaults.length, 5)} of ${vaults.length})`);
    for (const v of vaults.slice(0, 5)) {
      sections.push(
        `- **${v.name}** (${v.chain_name || 'Unknown'}): $${formatNumber(v.tvl_usd)} TVL, ${formatPercent(v.apr_net)} APR, Score ${v.total_score ?? v.risk_score ?? 'N/A'}/10`
      );
    }
  }

  return sections.join('\n');
}

export function formatStats(stats: any): string {
  const sections = [
    '## Philidor DeFi Vault Market Overview',
    `\n**Total Vaults:** ${stats.totalVaults}`,
    `**Total TVL:** $${formatNumber(stats.totalTvl)}`,
    `**Average APR:** ${formatPercent(stats.avgApr)}`,
    `**Protocols:** ${stats.protocolCount} | **Curators:** ${stats.curatorCount} | **Chains:** ${stats.chainCount}`,
  ];

  if (stats.riskDistribution?.length) {
    sections.push('\n### Risk Distribution');
    for (const r of stats.riskDistribution) {
      sections.push(`- **${r.risk_tier}**: ${r.count} vaults, $${formatNumber(r.tvl)} TVL`);
    }
  }

  if (stats.tvlByProtocol?.length) {
    sections.push('\n### TVL by Protocol');
    for (const p of stats.tvlByProtocol.slice(0, 10)) {
      sections.push(`- **${p.name}**: $${formatNumber(p.tvl)} (${p.vault_count} vaults)`);
    }
  }

  return sections.join('\n');
}

export function formatRiskScoreExplanation(score: number): string {
  let tier: string, meaning: string;
  if (score >= 8) {
    tier = 'Prime';
    meaning =
      'This is a high-safety vault. It typically features mature code (>2 years), multiple independent audits, and safe governance (long timelocks or immutable contracts).';
  } else if (score >= 5) {
    tier = 'Core';
    meaning =
      'This is a moderate-safety vault. It is likely audited but may be newer or have more flexible governance (shorter timelocks).';
  } else {
    tier = 'Edge';
    meaning =
      'This is a higher-risk vault. It may be unaudited, very new, have instant admin powers, or recent security incidents.';
  }

  return [
    `## Risk Score: ${score}/10 — ${tier} Tier`,
    `\n${meaning}`,
    '\n### How the Score is Calculated',
    'The score is a weighted average of three risk vectors:',
    '- **Asset Composition (40%)**: Quality of underlying assets and collateral',
    '- **Platform Code (40%)**: Code maturity (Lindy effect), audit density, dependency risk, incident history',
    '- **Governance (20%)**: Admin controls, timelock duration, immutability',
    '\n### Tier Thresholds',
    '- **Prime (8.0-10.0)**: Highest safety — institutional-grade',
    '- **Core (5.0-7.9)**: Moderate safety — suitable with monitoring',
    '- **Edge (0.0-4.9)**: Higher risk — requires careful due diligence',
    '\n### Hard Disqualifications',
    'A vault is capped at Edge tier if: no audit exists for the protocol version, or the platform score is 0.',
  ].join('\n');
}

// --- Utilities ---

export function formatNumber(value: string | number | null): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatPercent(value: string | number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return (num * 100).toFixed(2) + '%';
}

function formatTimelock(seconds: number): string {
  if (seconds >= 86400 * 7) return `${Math.floor(seconds / 86400)} days`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hours`;
  return `${seconds} seconds`;
}

function formatMarkdownTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || '').length)));
  const pad = (s: string, w: number) => s.padEnd(w);
  const headerLine = '| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |';
  const sepLine = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
  const bodyLines = rows.map(
    (r) => '| ' + r.map((c, i) => pad(c || '', widths[i])).join(' | ') + ' |'
  );
  return [headerLine, sepLine, ...bodyLines].join('\n');
}
