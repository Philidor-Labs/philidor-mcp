import { apiGet, buildQueryString } from '../api-client';

/** Curated Aave V4 liquidity-hub labels used by the hosted MCP. */
const KNOWN_HUBS: Record<string, { slug: string; name: string }> = {
  '0xcca852bc40e560adc3b1cc58ca5b55638ce826c9': {
    slug: 'core',
    name: 'Aave V4 Core',
  },
  '0x62d63197660c080236193ca60b70e49a08e90368': {
    slug: 'global-dollar',
    name: 'Aave V4 Global Dollar',
  },
  '0xd07369fae4a5bb13c9ce446b052c7867b1abdf6e': {
    slug: 'core',
    name: 'Aave V4 Core',
  },
};

export type MarketRow = Record<string, any>;

export type ComposedMarket =
  | {
      kind: 'spoke';
      market: MarketRow;
    }
  | {
      kind: 'hub';
      id: string;
      name: string;
      chain_id: number;
      chain_name: string;
      protocol_id: string;
      protocol_version: string;
      protocol_name: string;
      hub_address: string;
      spokes: MarketRow[];
      total_supplied_usd: number;
      total_borrowed_usd: number | null;
      utilization: number | null;
      reserve_count: number;
    };

function hubMeta(hubAddress: string, spokes: MarketRow[]): { slug: string; name: string } {
  const known = KNOWN_HUBS[hubAddress.toLowerCase()];
  if (known) return known;
  if (spokes.some((s) => s.market_key === 'main')) {
    return { slug: 'core', name: 'Aave V4 Core' };
  }
  const keys = spokes
    .map((s) => String(s.market_key || ''))
    .filter(Boolean)
    .sort();
  const slug = keys[0] || hubAddress.slice(2, 10);
  return { slug, name: `Aave V4 ${slug}` };
}

function sumField(rows: MarketRow[], field: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

/** Group Aave V4 spokes that share a liquidity hub into composed parents. */
export function composeMarketList(markets: MarketRow[]): ComposedMarket[] {
  const alone: ComposedMarket[] = [];
  const byHub = new Map<string, MarketRow[]>();

  for (const market of markets) {
    const hub = market.hub_address ? String(market.hub_address).toLowerCase() : '';
    const isAaveV4 =
      market.protocol_id === 'aave' && String(market.protocol_version || '').startsWith('v4');
    if (!isAaveV4 || !hub) {
      alone.push({ kind: 'spoke', market });
      continue;
    }
    const key = `${market.chain_id}:${hub}`;
    const list = byHub.get(key) || [];
    list.push(market);
    byHub.set(key, list);
  }

  const composed: ComposedMarket[] = [...alone];
  for (const group of byHub.values()) {
    if (group.length === 1) {
      composed.push({ kind: 'spoke', market: group[0] });
      continue;
    }
    const hubAddress = String(group[0].hub_address);
    const meta = hubMeta(hubAddress, group);
    const supplied = sumField(group, 'total_supplied_usd');
    const borrowed = sumField(group, 'total_borrowed_usd');
    const observed = group.filter((g) => g.utilization != null && g.total_borrowed_usd != null);
    const utilDenom = sumField(observed, 'total_supplied_usd');
    composed.push({
      kind: 'hub',
      id: `aave-v4-${group[0].chain_id}-hub-${meta.slug}`,
      name: meta.name,
      chain_id: group[0].chain_id,
      chain_name: group[0].chain_name,
      protocol_id: 'aave',
      protocol_version: 'v4',
      protocol_name: group[0].protocol_name || 'Aave',
      hub_address: hubAddress,
      spokes: [...group].sort(
        (a, b) => (Number(b.total_supplied_usd) || 0) - (Number(a.total_supplied_usd) || 0)
      ),
      total_supplied_usd: supplied,
      total_borrowed_usd: observed.length ? borrowed : null,
      utilization: utilDenom > 0 ? borrowed / utilDenom : null,
      reserve_count: sumField(group, 'reserve_count'),
    });
  }

  return composed;
}

export function sortComposedMarkets(
  items: ComposedMarket[],
  sortBy: string = 'total_supplied_usd'
): ComposedMarket[] {
  const value = (item: ComposedMarket): number | string => {
    if (item.kind === 'hub') {
      if (sortBy === 'name') return item.name;
      if (sortBy === 'reserve_count') return item.reserve_count;
      if (sortBy === 'total_borrowed_usd') return item.total_borrowed_usd ?? -1;
      return item.total_supplied_usd;
    }
    if (sortBy === 'name') return item.market.name || '';
    if (sortBy === 'reserve_count') return Number(item.market.reserve_count) || 0;
    if (sortBy === 'total_borrowed_usd') return Number(item.market.total_borrowed_usd) ?? -1;
    return Number(item.market.total_supplied_usd) || 0;
  };

  return [...items].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb);
    return (Number(vb) || 0) - (Number(va) || 0);
  });
}

export async function fetchMarkets(params: {
  protocol?: string;
  version?: string;
  chain?: string | number;
  limit?: number;
  sortBy?: string;
}): Promise<{ items: ComposedMarket[]; totalSpokes: number }> {
  let protocol = params.protocol;
  let version = params.version;
  if (protocol === 'aave-v4') {
    protocol = 'aave';
    version = version || 'v4';
  }

  // Fetch enough spokes to compose hubs, then page locally.
  const qs = buildQueryString({
    protocol,
    version,
    chain: params.chain,
    limit: 100,
    page: 1,
    sortBy: params.sortBy || 'total_supplied_usd',
    sortOrder: 'desc',
  });
  const result = await apiGet<{ data: MarketRow[]; meta?: { total?: number } }>(
    `/v1/markets${qs}`
  );
  const composed = sortComposedMarkets(composeMarketList(result.data || []), params.sortBy);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  return { items: composed.slice(0, limit), totalSpokes: result.meta?.total ?? result.data.length };
}

export function parseHubId(
  marketId: string
): { chainId: string; slug: string } | null {
  const m = /^aave-v4-(\d+)-hub-([a-z0-9-]+)$/i.exec(marketId);
  if (!m) return null;
  return { chainId: m[1], slug: m[2].toLowerCase() };
}

export async function fetchMarketDetail(marketId: string): Promise<{
  kind: 'spoke' | 'hub';
  market: MarketRow;
  reserves: MarketRow[];
  spokes?: MarketRow[];
}> {
  const hub = parseHubId(marketId);
  if (!hub) {
    const result = await apiGet<{ data: { market: MarketRow; reserves: MarketRow[] } }>(
      `/v1/markets/${encodeURIComponent(marketId)}`
    );
    return {
      kind: 'spoke',
      market: result.data.market,
      reserves: result.data.reserves || [],
    };
  }

  const qs = buildQueryString({
    protocol: 'aave',
    version: 'v4',
    chain: hub.chainId,
    limit: 100,
    page: 1,
  });
  const listed = await apiGet<{ data: MarketRow[] }>(`/v1/markets${qs}`);
  const composed = composeMarketList(listed.data || []).find(
    (item) => item.kind === 'hub' && item.id.toLowerCase() === marketId.toLowerCase()
  );
  if (!composed || composed.kind !== 'hub') {
    throw new Error(`API 404: Hub market ${marketId} not found`);
  }

  const spokeDetails = await Promise.all(
    composed.spokes.map(async (spoke) => {
      const detail = await apiGet<{ data: { market: MarketRow; reserves: MarketRow[] } }>(
        `/v1/markets/${encodeURIComponent(spoke.id)}`
      );
      const spokeLabel =
        detail.data.market.name?.replace(/^Aave V4\s+/i, '') || spoke.market_key;
      const reserves: MarketRow[] = (detail.data.reserves || []).map((r) => ({
        ...r,
        _spoke_name: spokeLabel,
      }));
      return { spoke: detail.data.market, reserves };
    })
  );

  const reserves = spokeDetails
    .flatMap((s) => s.reserves)
    .sort((a, b) => (Number(b.supplied_usd) || 0) - (Number(a.supplied_usd) || 0));

  return {
    kind: 'hub',
    market: {
      id: composed.id,
      name: composed.name,
      chain_id: composed.chain_id,
      chain_name: composed.chain_name,
      protocol_id: composed.protocol_id,
      protocol_version: composed.protocol_version,
      protocol_name: composed.protocol_name,
      address: composed.hub_address,
      hub_address: composed.hub_address,
      total_supplied_usd: composed.total_supplied_usd,
      total_borrowed_usd: composed.total_borrowed_usd,
      utilization: composed.utilization,
      reserve_count: reserves.length,
      totals_source: 'spokes',
    },
    reserves,
    spokes: composed.spokes,
  };
}

export function findReserve(
  reserves: MarketRow[],
  symbol: string
): MarketRow | undefined {
  const target = symbol.toLowerCase();
  return reserves.find((r) => String(r.asset_symbol || '').toLowerCase() === target);
}
