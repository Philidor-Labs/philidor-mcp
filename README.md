<div align="center">

# Philidor MCP Server

### DeFi vault risk analytics for AI agents

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![Hosted](https://img.shields.io/badge/Hosted-mcp.philidor.io-green.svg)](https://mcp.philidor.io)

Search 700+ vaults across Morpho, Aave, Yearn, Beefy, Spark, and more. Compare risk scores, analyze protocols, run due diligence &mdash; all through natural language.

**No API key required. No installation needed.**

[Quick Start](#quick-start) &bull; [Tools](#tools) &bull; [Example Prompts](#example-prompts) &bull; [Risk Framework](#risk-scoring)

</div>

---

## Why Philidor?

Most DeFi data tools give you raw numbers. Philidor gives your AI agent **risk intelligence**.

| Feature | Philidor | DefiLlama MCP | Generic DeFi APIs |
|---|:---:|:---:|:---:|
| Vault risk scores (0-10) | :white_check_mark: | :x: | :x: |
| Risk vector decomposition | :white_check_mark: | :x: | :x: |
| Vault comparison | :white_check_mark: | :x: | :x: |
| Curator intelligence | :white_check_mark: | :x: | :x: |
| Protocol security history | :white_check_mark: | :x: | Partial |
| Due diligence prompts | :white_check_mark: | :x: | :x: |
| Portfolio risk assessment | :white_check_mark: | :x: | :x: |
| No API key needed | :white_check_mark: | :white_check_mark: | Varies |
| Hosted (zero install) | :white_check_mark: | :x: | :x: |

---

## Quick Start

### Remote Server (Recommended)

Connect directly to the hosted server &mdash; zero installation, always up to date:

```
https://mcp.philidor.io/api/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "philidor": {
      "url": "https://mcp.philidor.io/api/mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add philidor --transport http https://mcp.philidor.io/api/mcp
```

### Cursor

Add to your MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "philidor": {
      "url": "https://mcp.philidor.io/api/mcp"
    }
  }
}
```

### Windsurf

Add to your MCP settings:

```json
{
  "mcpServers": {
    "philidor": {
      "serverUrl": "https://mcp.philidor.io/api/mcp"
    }
  }
}
```

### Docker (stdio)

```bash
docker run -i --rm ghcr.io/philidor-labs/philidor-mcp
```

### Local (stdio)

```bash
git clone https://github.com/Philidor-Labs/philidor-mcp.git
cd philidor-mcp
npm install
npm start
```

---

## Tools

### `search_vaults`

Search and filter DeFi vaults by chain, protocol, asset, risk tier, TVL, and more.

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Search by vault name, symbol, asset, protocol, or curator |
| `chain` | string | Filter by chain (Ethereum, Base, Arbitrum, ...) |
| `protocol` | string | Filter by protocol ID (morpho, aave-v3, yearn-v3, ...) |
| `asset` | string | Filter by asset symbol (USDC, WETH, ...) |
| `riskTier` | string | Filter by risk tier: Prime, Core, or Edge |
| `minTvl` | number | Minimum TVL in USD |
| `sortBy` | string | Sort field: tvl_usd, apr_net, name |
| `sortOrder` | string | Sort order: asc or desc |
| `limit` | number | Max results (default 10, max 50) |

### `get_vault`

Get detailed information about a specific vault including risk breakdown, recent events, and historical snapshots.

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Vault ID (e.g. `morpho-ethereum-0x...`) |
| `network` | string | Network slug (ethereum, base, arbitrum) |
| `address` | string | Vault contract address (0x...) |

### `get_vault_risk_breakdown`

Detailed breakdown of a vault's three risk vectors with sub-metrics: asset quality, platform code maturity, and governance controls.

| Parameter | Type | Description |
|---|---|---|
| `network` | string | Network slug |
| `address` | string | Vault contract address |

### `compare_vaults`

Side-by-side comparison of 2-3 vaults on TVL, APR, risk score, risk tier, and audit status.

| Parameter | Type | Description |
|---|---|---|
| `vaults` | array | Array of 2-3 objects with `network` and `address` |

### `find_safest_vaults`

Find the top 10 audited vaults with the highest risk scores, optionally filtered by asset, chain, or TVL.

| Parameter | Type | Description |
|---|---|---|
| `asset` | string | Filter by asset symbol |
| `chain` | string | Filter by chain name |
| `minTvl` | number | Minimum TVL in USD |

### `get_protocol_info`

Protocol details including TVL, vault count, versions, auditors, bug bounties, and security incidents.

| Parameter | Type | Description |
|---|---|---|
| `protocolId` | string | Protocol ID (morpho, aave-v3, yearn-v3, beefy, spark) |

### `get_curator_info`

Curator details including managed vaults, TVL, chain distribution, and performance metrics.

| Parameter | Type | Description |
|---|---|---|
| `curatorId` | string | Curator ID |

### `get_market_overview`

High-level DeFi vault market statistics: total TVL, vault count, risk distribution, and TVL by protocol. No parameters required.

### `explain_risk_score`

Explain what a specific risk score means, including the tier, calculation method, and thresholds.

| Parameter | Type | Description |
|---|---|---|
| `score` | number | Risk score (0-10) |

---

## Resources

| URI | Description |
|---|---|
| `philidor://methodology` | The Vector Risk Framework v2.0 documentation |
| `philidor://supported-chains` | Supported blockchain networks with vault counts |
| `philidor://supported-protocols` | Supported DeFi protocols with TVL data |

## Prompts

| Prompt | Description |
|---|---|
| `vault_due_diligence` | Comprehensive due diligence report for a vault |
| `portfolio_risk_assessment` | Portfolio-level risk analysis across positions |
| `defi_yield_comparison` | Yield comparison with risk-adjusted analysis |

---

## Example Prompts

Once connected, try asking your AI assistant:

**Discovery**
> "Find the safest USDC vaults with at least $10M TVL"

> "What Morpho vaults are available on Base?"

> "Show me the DeFi market overview"

**Analysis**
> "Run due diligence on the Steakhouse USDC vault on Ethereum"

> "Compare the top 3 USDC vaults by risk score"

> "What's the risk breakdown for this vault: ethereum/0x..."

**Portfolio**
> "Assess my portfolio: 50% in Morpho Steakhouse USDC, 30% in Aave USDC, 20% in Yearn USDC"

> "Which protocols have had security incidents?"

> "What does a risk score of 8.5 mean?"

---

## Risk Scoring

Philidor uses the **Vector Risk Framework** to decompose vault risk into three measurable vectors:

```
Final Score = 40% Asset + 40% Platform + 20% Governance
```

### Asset Composition (40%)
Quality of underlying collateral. Blue-chip assets (ETH, USDC) score 10/10. Less liquid collateral scores lower.

### Platform Code (40%)
Code maturity measured by:
- **Lindy Score** &mdash; time-based safety (>2 years = ~9/10)
- **Audit Density** &mdash; number and type of audits
- **Dependency Risk** &mdash; multiplicative penalties for risky dependencies
- **Incident Penalty** &mdash; caps score after security incidents

### Governance (20%)
Exit window for users:
- Immutable contract: 10/10
- 7+ day timelock: 9/10
- No timelock: 1/10

### Risk Tiers

| Tier | Score | Meaning |
|---|---|---|
| **Prime** | 8.0 - 10.0 | Institutional-grade &mdash; mature code, multiple audits, safe governance |
| **Core** | 5.0 - 7.9 | Moderate safety &mdash; audited but newer or flexible governance |
| **Edge** | 0.0 - 4.9 | Higher risk &mdash; requires careful due diligence |

---

## Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Claude / Cursor  │────▶│  Philidor MCP   │────▶│ Philidor API │
│  Windsurf / etc.  │◀────│  Server         │◀────│              │
└──────────────────┘     └─────────────────┘     └──────┬───────┘
                          9 tools, 3 resources,          │
                          3 prompts                      │
                                                   ┌────▼────┐
                                                   │ On-chain │
                                                   │  data    │
                                                   └─────────┘
```

- **Transport**: Streamable HTTP (remote) or stdio (local/Docker)
- **API**: Calls the [Philidor Public API](https://api.philidor.io/v1/docs) &mdash; no API key needed
- **Stateless**: Fresh server instance per request, no session state
- **Data**: 700+ vaults across Ethereum, Base, Polygon, Gnosis, and more

---

## Supported Protocols

Morpho, Aave v3, Yearn v3, Beefy, Spark, Fluid, Euler &mdash; with more being added regularly.

See the full list at [app.philidor.io](https://app.philidor.io).

---

## Development

```bash
git clone https://github.com/Philidor-Labs/philidor-mcp.git
cd philidor-mcp
npm install
npm start
```

The server connects to the public Philidor API by default. To use a custom API endpoint:

```bash
PHILIDOR_API_URL=http://localhost:3003 npm start
```

---

## Links

- [Philidor Analytics](https://app.philidor.io) &mdash; explore vaults and risk scores
- [API Documentation](https://api.philidor.io/v1/docs) &mdash; OpenAPI/Swagger docs
- [Risk Methodology](https://app.philidor.io/methodology) &mdash; how scores are calculated
- [Twitter](https://twitter.com/philidorlabs) &mdash; updates and announcements

## License

[MIT](LICENSE)
