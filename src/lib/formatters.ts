import type { ComposedMarket, MarketRow } from './markets';

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
    vault.id
      ? `**Id:** \`${vault.id}\` | **Address:** \`${vault.address || 'N/A'}\``
      : null,
    `**Protocol:** ${vault.protocol_name} | **Chain:** ${vault.chain_name} | **Asset:** ${vault.asset_symbol || 'N/A'}`,
    `**TVL:** $${formatNumber(vault.tvl_usd)} | **APR:** ${formatPercent(vault.apr_net)}`,
    `**Risk Score:** ${score}/10 (${riskTier})`,
    vault.curator_name ? `**Curator:** ${vault.curator_name}` : null,
    `**Deposits:** ${formatDepositStatus(vault)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatDepositStatus(entity: {
  is_depositable?: boolean | null;
  deposit_capacity_usd?: number | string | null;
}): string {
  if (entity.is_depositable === false) return 'closed';
  if (entity.is_depositable === true) {
    if (entity.deposit_capacity_usd == null) {
      return 'open · no cap observed (headroom unknown — pre-flight maxDeposit before sizing)';
    }
    return `open · capacity $${formatNumber(entity.deposit_capacity_usd)}`;
  }
  return 'unknown';
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
        `- **Platform and Strategy:** ${rv.platform.score}/10 (Lindy: ${rv.platform.details?.lindyScore ?? 'N/A'}, Audit: ${rv.platform.details?.auditScore ?? 'N/A'})`
      );
    if (rv.control)
      sections.push(
        `- **Control and Governance:** ${rv.control.score}/10${rv.control.details?.timelock ? ` (Timelock: ${formatTimelock(rv.control.details.timelock)})` : ''}`
      );
    if (rv.history) sections.push(`- **History:** ${rv.history.score}/10`);
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
    ['Deposits', ...vaults.map((v) => formatDepositStatus(v.vault || v))],
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
      'This is a high-safety vault under the current methodology. It typically features stronger evidence across asset, platform, control, and history vectors.';
  } else if (score >= 5) {
    tier = 'Core';
    meaning =
      'This is a moderate-safety vault under the current methodology. It is likely audited but may be newer or have more flexible controls.';
  } else {
    tier = 'Edge';
    meaning =
      'This is a higher-risk vault under the current methodology. It may be unaudited, very new, have weak controls, or recent instability.';
  }

  return [
    `## Risk Score: ${score}/10 — ${tier} Tier`,
    `\n${meaning}`,
    '\n### How the Score is Calculated',
    'Philidor uses the Vector Risk Framework with four vectors:',
    '- **Asset Composition (30%)**: Quality of underlying assets and collateral',
    '- **Platform and Strategy (30%)**: Code maturity, audits, strategy and dependency risk',
    '- **Control and Governance (20%)**: Timelocks, immutability, pause and depositor reaction windows',
    '- **History (20%)**: Recent instability and confirmed loss history',
    '\n### Tier Thresholds',
    '- **Prime (8.0-10.0)**: Highest assessed resilience',
    '- **Core (5.0-7.9)**: Moderate assessed resilience',
    '- **Edge (0.0-4.9)**: Higher assessed risk',
    '\nA higher score means lower assessed risk under the active methodology. It is not a safety guarantee, return guarantee, or investment recommendation. Read `philidor://methodology` for the full framework.',
  ].join('\n');
}

export function formatMarketList(items: ComposedMarket[], showing: number, totalSpokes: number): string {
  const lines = [
    `## Lending markets (${items.length} of ${Math.max(items.length, showing)})`,
    '',
    'Aave V4 spokes that share a liquidity hub are grouped under that hub, with every spoke of the hub counted even when the page shows only some of them. The API still keys each market on the spoke.',
    '',
  ];

  for (const item of items) {
    if (item.kind === 'hub') {
      lines.push(`### ${item.name} (liquidity hub)`);
      lines.push(`- **id:** \`${item.id}\` | **chain:** ${item.chain_name}`);
      lines.push(
        '- **kind:** composed parent. `/v1/markets` still keys on the spoke. Use this id with get_market.'
      );
      lines.push(
        `- **spokes:** ${item.spokes.length} | **supplied:** $${formatNumber(item.total_supplied_usd)} | **borrowed:** $${formatNumber(item.total_borrowed_usd)} | **utilization:** ${formatUtilization(item.utilization)}`
      );
      for (const spoke of item.spokes) {
        lines.push(
          `  - **${spoke.name}** (\`${spoke.id}\`): $${formatNumber(spoke.total_supplied_usd)} supplied`
        );
      }
      lines.push('');
      continue;
    }

    const m = item.market;
    lines.push(`### ${m.name}`);
    lines.push(`- **id:** \`${m.id}\` | **chain:** ${m.chain_name}`);
    lines.push(
      `- **supplied:** $${formatNumber(m.total_supplied_usd)} | **borrowed:** $${formatNumber(m.total_borrowed_usd)} | **utilization:** ${formatUtilization(m.utilization)}`
    );
    lines.push(
      `- **reserves:** ${m.reserve_count ?? 'N/A'} | **totals from:** ${m.totals_source === 'protocol_api' ? 'protocol API' : 'member reserves'}`
    );
    lines.push('');
  }

  if (totalSpokes) {
    lines.push(`_Underlying spoke rows reported by the API: ${totalSpokes}._`);
  }
  return lines.join('\n');
}

export function formatMarketDetail(detail: {
  kind: 'spoke' | 'hub';
  market: MarketRow;
  reserves: MarketRow[];
  spokes?: MarketRow[];
}): string {
  const m = detail.market;
  const sections = [
    `## ${m.name}`,
    '',
    `**Chain:** ${m.chain_name} | **Protocol:** ${m.protocol_name || 'Aave'} ${m.protocol_version || ''}`.trim(),
  ];

  if (detail.kind === 'hub') {
    sections.push(
      `**Kind:** liquidity hub (composed from ${detail.spokes?.length || 0} spokes). \`/v1/markets\` does not serve this id.`
    );
  }

  sections.push(
    `**Supplied:** $${formatNumber(m.total_supplied_usd)} | **Borrowed:** $${formatNumber(m.total_borrowed_usd)} | **Utilization:** ${formatUtilization(m.utilization)}`
  );
  sections.push(
    `**Market contract:** \`${m.address || 'N/A'}\`${m.hub_address ? ` | **liquidity hub:** \`${m.hub_address}\`` : ''}`
  );

  if (detail.kind === 'hub') {
    sections.push(
      '**Totals from:** the spokes that share this hub, summed from their member reserves'
    );
    sections.push('');
    sections.push(`### Spokes (${detail.spokes?.length || 0})`);
    for (const spoke of detail.spokes || []) {
      sections.push(
        `- **${spoke.name}** (\`${spoke.id}\`): $${formatNumber(spoke.total_supplied_usd)} supplied`
      );
    }
  } else if (m.hub_address) {
    sections.push(`**Parent hub address:** \`${m.hub_address}\``);
    sections.push(
      `**Totals from:** ${m.totals_source === 'protocol_api' ? 'protocol API' : 'its member reserves, summed. The same rows /v1/vaults serves'}`
    );
  }

  sections.push('');
  sections.push(`### Reserves (${detail.reserves.length})`);
  for (const r of detail.reserves.slice(0, 40)) {
    const spokeTag = r._spoke_name ? ` [${r._spoke_name}]` : '';
    const score =
      r.total_score != null ? `${r.risk_tier || 'N/A'} ${r.total_score}/10` : 'score N/A';
    sections.push(
      `- **${r.asset_symbol}${spokeTag}**: $${formatNumber(r.supplied_usd)} supplied at ${formatPercent(r.supply_apr)} | $${formatNumber(r.borrowed_usd)} borrowed at ${formatPercent(r.borrow_apr)} | ${score}`
    );
  }

  return sections.join('\n');
}

export function formatMarketEvents(marketId: string, events: any[]): string {
  if (!events.length) {
    return `No published risk events for market \`${marketId}\`. Absence of incidents is the normal state for a healthy market.`;
  }
  const lines = [`## Market events: \`${marketId}\``, ''];
  for (const e of events) {
    lines.push(
      `- **${e.event_type || 'Event'}** (${e.severity || 'N/A'}): ${e.title || 'Untitled'} — ${e.occurred_at ? new Date(e.occurred_at).toISOString() : 'unknown date'}`
    );
    if (e.description) lines.push(`  ${String(e.description).slice(0, 280)}`);
  }
  return lines.join('\n');
}

export function formatLoopVenue(args: {
  marketId: string;
  collateral: string;
  debt: string;
  detail: { kind: 'spoke' | 'hub'; market: MarketRow; reserves: MarketRow[]; spokes?: MarketRow[] };
  collateralReserve?: MarketRow;
  debtReserve?: MarketRow;
  events: any[];
}): string {
  const m = args.detail.market;
  const sections = [
    `## Loop venue: ${m.name}`,
    '',
    `**Market id:** \`${args.marketId}\` | **Chain:** ${m.chain_name} | **Protocol:** ${m.protocol_name || 'Aave'} ${m.protocol_version || ''}`.trim(),
    `**Supplied:** $${formatNumber(m.total_supplied_usd)} | **Borrowed:** $${formatNumber(m.total_borrowed_usd)} | **Utilization:** ${formatUtilization(m.utilization)}`,
  ];
  if (m.hub_address) sections.push(`**Liquidity hub:** \`${m.hub_address}\``);

  sections.push('', '## Collateral');
  sections.push(formatLoopLeg('Collateral', args.collateral, args.collateralReserve));
  sections.push('', '## Debt');
  sections.push(formatLoopLeg('Debt', args.debt, args.debtReserve));

  const flags: string[] = [];
  if (!args.collateralReserve) flags.push(`${args.collateral} is not a reserve on this market.`);
  if (!args.debtReserve) flags.push(`${args.debt} is not a reserve on this market.`);
  if (args.debtReserve?.borrow_status && args.debtReserve.borrow_status !== 'open') {
    flags.push(`Debt borrow status is ${args.debtReserve.borrow_status}.`);
  }
  if (args.collateralReserve?.is_depositable === false) flags.push('Collateral deposits are closed.');
  if (args.debtReserve?.is_depositable === false) flags.push('Debt-side deposits are closed.');
  if (Number(args.debtReserve?.utilization) >= 0.9) {
    flags.push(
      `${args.debt} utilization is ${formatUtilization(args.debtReserve?.utilization)}.`
    );
  }
  if (
    args.collateralReserve?.is_depositable === true &&
    args.collateralReserve.deposit_capacity_usd != null &&
    Number(args.collateralReserve.deposit_capacity_usd) < 100_000
  ) {
    flags.push(
      `${args.collateral} has only $${formatNumber(args.collateralReserve.deposit_capacity_usd)} of deposit capacity left.`
    );
  }
  if (args.collateralReserve?.risk_tier === 'Edge' || args.debtReserve?.risk_tier === 'Edge') {
    flags.push('At least one leg is Edge tier.');
  }

  sections.push('', '## Flags');
  if (flags.length) {
    for (const f of flags) sections.push(`- ${f}`);
  } else {
    sections.push('- No hard flags from the returned reserve fields.');
  }

  sections.push('', '## Risk events');
  sections.push(formatMarketEvents(args.marketId, args.events));
  sections.push(
    '',
    'Philidor does not compute health factor and does not prepare transactions. If the venue is still acceptable, use the protocol MCP next (`get_user_summary`, `preview_action`, `prepare_action`).'
  );
  return sections.join('\n');
}

function formatLoopLeg(label: string, symbol: string, reserve?: MarketRow): string {
  if (!reserve) {
    return `### ${label}: ${symbol}\n- **Status:** missing on this market`;
  }
  return [
    `### ${label}: ${symbol}`,
    `- **Score:** ${reserve.total_score ?? 'N/A'}/10 (${reserve.risk_tier || 'N/A'})`,
    `- **Supplied:** $${formatNumber(reserve.supplied_usd)} at ${formatPercent(reserve.supply_apr)}`,
    `- **Borrowed:** $${formatNumber(reserve.borrowed_usd)} at ${formatPercent(reserve.borrow_apr)}`,
    `- **Utilization:** ${formatUtilization(reserve.utilization)}`,
    `- **Deposits:** ${formatDepositStatus(reserve)}`,
    `- **Borrow status:** ${reserve.borrow_status || 'unknown'}`,
    reserve.vault_id ? `- **Vault id:** \`${reserve.vault_id}\`` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatIncidentVaults(rows: any[]): string {
  if (!rows.length) {
    return 'No vaults with critical incidents in the last 365 days were returned.';
  }
  const lines = [
    `## Vaults with recent critical incidents (${rows.length})`,
    'Sorted by TVL (desc), then time since event (asc).',
    '',
  ];
  rows.forEach((row, i) => {
    lines.push(`### ${i + 1}. ${row.vault_name || row.vault_id}`);
    lines.push(
      `**Chain:** ${row.chain_name || 'N/A'} | **Protocol:** ${row.protocol_name || 'N/A'} | **TVL:** $${formatNumber(row.tvl_usd)}`
    );
    lines.push(
      `**Days since incident:** ${row.days_since_incident ?? 'N/A'} | **Severity:** ${row.event_severity || 'N/A'}/${row.incident_severity || 'N/A'}`
    );
    lines.push(`**Incident:** ${row.incident_title || 'Untitled'}`);
    if (row.curator_name) lines.push(`**Curator:** ${row.curator_name}`);
    lines.push('', '---', '');
  });
  return lines.join('\n');
}

// --- Utilities ---

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return (num * 100).toFixed(2) + '%';
}

function formatUtilization(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return formatPercent(value);
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
