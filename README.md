<div align="center">

# Philidor MCP Server

### DeFi vault risk analytics for AI agents

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![Hosted](https://img.shields.io/badge/Hosted-mcp.philidor.io-green.svg)](https://mcp.philidor.io)
[![smithery badge](https://smithery.ai/badge/philidor/defi)](https://smithery.ai/servers/philidor/defi)
[![LobeHub](https://lobehub.com/badge/mcp/philidor-labs-philidor-mcp)](https://lobehub.com/mcp/philidor-labs-philidor-mcp)

Search 700+ DeFi vaults across Morpho, Aave, Yearn, Beefy, and Spark. Compare risk scores, analyze protocols, run due diligence &mdash; all through natural language.

**No API key required. No installation needed.**

[Quick Start](#quick-start) &bull; [Cursor Plugin](#cursor-marketplace-plugin) &bull; [Tools](#tools) &bull; [Example Prompts](#example-prompts) &bull; [Risk Framework](#risk-scoring) &bull; [Agent Skill](#agent-skill)

</div>

---

## Why Philidor?

Most DeFi data tools give you raw numbers. Philidor gives your AI agent **institutional-grade risk intelligence**.

| Feature | Philidor | DefiLlama MCP | Generic DeFi APIs |
|---|:---:|:---:|:---:|
| Vault risk scores (0&ndash;10) | :white_check_mark: | :x: | :x: |
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

Add to `.cursor/mcp.json`:

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

14 tools for vault discovery, risk analysis, lending markets, loop venue checks, and protocol research.

### `search_vaults`

Search and filter DeFi vaults by chain, protocol, asset, risk tier, TVL, and more.

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Search by vault name, symbol, asset, protocol, or curator |
| `chain` | string | Filter by chain name or slug (Ethereum, Base, Solana, ...) |
| `protocol` | string | Protocol ID: `aave`, `morpho`, `spark`, `compound`, `yearn`, `beefy`, `uniswap`, `nest`, `maple`, `kamino` |
| `protocolVersion` | string | Generation filter (`v3`, `v4`, ...); use with `protocol=aave` for Aave V4 |
| `asset` | string | Filter by asset symbol (USDC, WETH, ...) |
| `riskTier` | string | Filter by risk tier: Prime, Core, or Edge |
| `minTvl` | number | Minimum TVL in USD |
| `depositable` | boolean | Filter by current deposit capacity |
| `sortBy` | string | Sort field: tvl_usd, apr_net, name, last_synced_at |
| `sortOrder` | string | Sort order: asc or desc |
| `limit` | number | Max results (default 10, max 50) |

### `get_vault`

Get detailed information about a specific vault including risk breakdown, recent events, and historical snapshots. Lookup by `id` or by `network` + `address`.

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Vault ID (e.g. `morpho-1-0x...`) |
| `network` | string | Network slug (ethereum, base, arbitrum, solana) |
| `address` | string | Vault address (`0x` hex or Solana base58) |

### `get_vault_risk_breakdown`

Detailed breakdown of a vault's four risk vectors: Asset Composition, Platform and Strategy, Control and Governance, and History.

| Parameter | Type | Description |
|---|---|---|
| `network` | string | Network slug |
| `address` | string | Vault address |

### `list_markets`

List lending markets (Aave/Spark pools, Aave V4 spokes, Compound Comet, Morpho Blue pairs, Kamino K-Lend). Aave V4 spokes that share a liquidity hub are grouped under composed hub parents (e.g. `aave-v4-1-hub-core`).

| Parameter | Type | Description |
|---|---|---|
| `protocol` | string | `aave`, `spark`, `compound`, `morpho`, `kamino` |
| `version` | string | `v3`, `v4`, or `klend` |
| `chain` | number/string | Chain id or slug |
| `limit` | number | 1–100 (default 20) |
| `sortBy` | string | `total_supplied_usd`, `total_borrowed_usd`, `reserve_count`, `name` |

### `get_market`

One market with every reserve (supplied, supply APR, borrowed, borrow APR, utilization, tier). Accepts spoke ids and composed hub ids.

| Parameter | Type | Description |
|---|---|---|
| `marketId` | string | Market id from `list_markets` |

### `get_market_events`

Published risk events for one lending market. Hub ids union spoke feeds.

| Parameter | Type | Description |
|---|---|---|
| `marketId` | string | Market id from `list_markets` |
| `limit` | number | 1–100 (default 20) |

### `check_loop_venue`

Underwrite a collateral/debt loop on one market: score, tier, utilization, borrow APR, deposit status, and recent incidents for both legs. Does not compute health factor and does not prepare transactions.

| Parameter | Type | Description |
|---|---|---|
| `marketId` | string | Market id from `list_markets` |
| `collateral` | string | Collateral asset symbol |
| `debt` | string | Debt asset symbol |

### `compare_vaults`

Side-by-side comparison of 2&ndash;3 vaults on TVL, APR, risk score, risk tier, and audit status.

| Parameter | Type | Description |
|---|---|---|
| `vaults` | array | Array of 2&ndash;3 objects with `network` and `address` |

### `find_safest_vaults`

Find the top 10 audited vaults sorted by Philidor risk score (higher = lower assessed risk; not a safety guarantee).

| Parameter | Type | Description |
|---|---|---|
| `asset` | string | Filter by asset symbol |
| `chain` | string | Filter by chain name |
| `minTvl` | number | Minimum TVL in USD |

### `get_protocol_info`

Protocol details including TVL, vault count, versions, auditors, bug bounties, and security incidents.

| Parameter | Type | Description |
|---|---|---|
| `protocolId` | string | Protocol ID (`aave`, `morpho`, `spark`, `compound`, `yearn`, `beefy`, `uniswap`, `nest`, `maple`, `kamino`) |

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
| `score` | number | Risk score (0&ndash;10) |

### `list_vaults_with_incidents`

List all vaults that had a recent critical incident (last 365 days). Sorted by TVL descending, then by recency. No parameters required.

---

## Resources

| URI | Description |
|---|---|
| `philidor://methodology` | The Vector Risk Framework v4.1 documentation |
| `philidor://supported-chains` | Supported blockchain networks with vault counts |
| `philidor://supported-protocols` | Supported DeFi protocols with TVL data |

## Prompts

| Prompt | Description |
|---|---|
| `vault_due_diligence` | Comprehensive due diligence report for a vault |
| `portfolio_risk_assessment` | Portfolio-level risk analysis across positions |
| `defi_yield_comparison` | Yield comparison with risk-adjusted analysis |
| `review_loop_venue` | Loop venue review, then hand off to a protocol MCP |

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

Philidor uses the **Vector Risk Framework v4.1** to decompose vault risk into three measurable vectors:

```
Final Score = 40% Asset + 40% Platform + 20% Governance
```

### Asset Composition (40%)

Quality of underlying collateral. Blue-chip assets (ETH, USDC) score highest. Factors include oracle reliability, liquidity depth, and peg stability.

### Platform Code (40%)

Code maturity measured by:

- **Lindy Score** &mdash; time-based safety (>2 years &asymp; 9/10)
- **Audit Density** &mdash; number and quality of audits
- **Dependency Risk** &mdash; multiplicative penalties for risky dependencies
- **Incident Penalty** &mdash; caps score after security incidents

### Governance (20%)

Exit window for users:

| Control | Score |
|---|---|
| Immutable contract | 10/10 |
| 7+ day timelock | 9/10 |
| No timelock | 1/10 |

### Risk Tiers

| Tier | Score | Meaning |
|---|---|---|
| **Prime** | 8.0&ndash;10.0 | Institutional-grade &mdash; mature code, multiple audits, safe governance |
| **Core** | 5.0&ndash;7.9 | Moderate safety &mdash; audited but newer or flexible governance |
| **Edge** | 0.0&ndash;4.9 | Higher risk &mdash; requires careful due diligence |

---

## Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Claude / Cursor  │────▶│  Philidor MCP   │────▶│ Philidor API │
│  Windsurf / etc.  │◀────│  Server         │◀────│              │
└──────────────────┘     └─────────────────┘     └──────┬───────┘
                          14 tools, 3 resources,         │
                          4 prompts                      │
                                                   ┌────▼────┐
                                                   │ On-chain │
                                                   │  data    │
                                                   └─────────┘
```

- **Transport**: Streamable HTTP (remote) or stdio (local/Docker)
- **API**: Calls the [Philidor Public API](https://api.philidor.io/v1/docs) &mdash; no API key needed
- **Stateless**: Fresh server instance per request, no session state
- **Data**: 700+ vaults across Ethereum, Base, Arbitrum, Polygon, Optimism, and Avalanche

---

## Cursor Marketplace Plugin

This repository packages a Cursor plugin that connects the agent to the hosted Philidor MCP server and loads five workflow skills. The plugin does not embed an API key. Philidor stays read-only: it scores vaults and lending venues, and it does not compute a health factor or prepare a transaction.

The plugin points at the hosted server, which is ahead of the stdio server in this repo:

```
https://mcp.philidor.io/api/mcp
```

Transport is Streamable HTTP. A live `initialize` plus `tools/list` against that URL returns 14 tools, 3 resources (`philidor://methodology`, `philidor://supported-chains`, `philidor://supported-protocols`), and 4 prompts (`vault_due_diligence`, `portfolio_risk_assessment`, `defi_yield_comparison`, `review_loop_venue`). `src/server.ts` registers the same 14 tools.

| Piece | Path |
|---|---|
| Manifest | `.cursor-plugin/plugin.json` |
| Marketplace index | `.cursor-plugin/marketplace.json` (one plugin, source `.`) |
| MCP connector | `mcp.json` |
| Logo | `assets/logo.svg` (primary pawn mark from [philidor.io/brand-assets](https://philidor.io/brand-assets)) |
| Skills | `skills/vault-due-diligence`, `skills/pre-deposit-safety-check`, `skills/risk-adjusted-yield`, `skills/market-incident-monitoring`, `skills/philidor-api-handoff` |

Product page: [philidor.io/mcp](https://philidor.io/mcp). Docs: [MCP server](https://docs.philidor.io/docs/mcp), [quickstart](https://docs.philidor.io/docs/mcp/quickstart), [tools](https://docs.philidor.io/docs/mcp/tools), [resources](https://docs.philidor.io/docs/mcp/resources), [prompts](https://docs.philidor.io/docs/mcp/prompts).

### Install

After the plugin is listed, open **Customize** in Cursor, find **Philidor**, and choose **Install** (project or user scope). That loads the skills and the hosted MCP server together.

Until then, connect the same server without the plugin by adding this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "philidor": {
      "url": "https://mcp.philidor.io/api/mcp"
    }
  }
}
```

To try the plugin from a local checkout, copy this repo to `~/.cursor/plugins/local/philidor` (the folder must contain `.cursor-plugin/plugin.json`), then run **Developer: Reload Window** and confirm the skills and MCP server under Customize. Local plugin imports have to be allowed. A marketplace plugin with the same name takes precedence over the local copy.

### Example prompts

- "Run due diligence on the Gauntlet USDC vault on Ethereum."
- "Which Prime USDC vaults on Ethereum still accept deposits, and how do their scores compare to APR?"
- "Check looping weETH against USDC on Aave V4 Ethereum Main before I borrow."
- "List the largest Aave V4 markets by supplied value and any recent events on the one I pick."
- "Which vaults had a critical incident in the last year?"
- "I need basket constituents and the oracle freshness feed. Is that on the free MCP or the API?"

Skills tell the agent to copy vault ids, network slugs, addresses, and market ids from tool results, and not to invent risk numbers. Loop checks call `check_loop_venue`, then stop. Health factor and unsigned transactions belong to the protocol MCP (Aave is `https://mcp.aave.com`). Baskets, oracle vectors, enriched assets, the event stream, and Risk Graph look-through are outside the free MCP. The `philidor-api-handoff` skill sends those questions to [API Access and Plans](https://docs.philidor.io/docs/api-reference/access) and [pricing](https://philidor.io/pricing) without quoting a price.

### Submission checklist

Do not submit from this fork until a reviewer accepts the pull request. Listing is a manual review at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). The repository must be public. Cursor reviews the open-source tree and each later update.

- [ ] `.cursor-plugin/plugin.json` parses and matches the [plugin schema](https://cursor.com/docs/reference/plugins) (`name` `philidor`, lowercase kebab-case)
- [ ] `description` states that the plugin is read-only vault and market risk analytics
- [ ] `mcp.json` is the only MCP connector and has no auth header
- [ ] Each skill directory has a `SKILL.md` whose `name` matches the folder and whose `description` says when to use it
- [ ] `assets/logo.svg` is committed and `logo` is the relative path `assets/logo.svg`
- [ ] Manifest paths are relative and exist (`skills/...`, `./mcp.json`). No `..`, no absolute paths
- [ ] No `${VAR}` placeholders, so `variables` stays unset
- [ ] README (this section) documents install and example prompts
- [ ] Live check: `initialize` and `tools/list` against `https://mcp.philidor.io/api/mcp` still succeed
- [ ] Tried locally from `~/.cursor/plugins/local/philidor` (Customize shows 5 skills and the Philidor MCP server)
- [ ] Submit the public GitHub URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). This repo is a single plugin indexed by `.cursor-plugin/marketplace.json` with `source` `"."`

---

## Agent Skill

Install the Philidor MCP skill into your coding agent via [skills.sh](https://skills.sh):

```bash
npx skills add philidor-labs/philidor-mcp
```

This gives your agent full knowledge of all tools, resources, prompts, recommended workflows, and best practices for DeFi vault analysis.

### Also Available

| Interface | Description | Link |
|---|---|---|
| **CLI** | Terminal-based vault intelligence &mdash; scriptable, pipeable, agent-sandboxed | [philidor-cli](https://github.com/Philidor-Labs/philidor-cli) |
| **OpenClaw Skill** | Skill definition for the OpenClaw agent platform | [npm](https://www.npmjs.com/package/@philidorlabs/openclaw-skill) |

---

## Supported Protocols

Morpho, Aave (v3/v4), Spark, Compound, Yearn, Beefy, Uniswap, Nest, Maple, Kamino &mdash; with more being added regularly.

See the full list at [app.philidor.io](https://app.philidor.io).

---

## Development

```bash
git clone https://github.com/Philidor-Labs/philidor-mcp.git
cd philidor-mcp
npm install
npm start
```

The server connects to the public Philidor API by default. To use a custom endpoint:

```bash
PHILIDOR_API_URL=http://localhost:3003 npm start
```

---

## Links

- [Philidor MCP landing](https://philidor.io/mcp) &mdash; hosted server overview
- [MCP docs](https://docs.philidor.io/docs/mcp) &mdash; tools, resources, and prompts
- [Philidor Analytics](https://app.philidor.io) &mdash; explore vaults and risk scores
- [Philidor CLI](https://github.com/Philidor-Labs/philidor-cli) &mdash; terminal-based vault intelligence
- [API Documentation](https://api.philidor.io/v1/docs) &mdash; OpenAPI/Swagger docs
- [Risk Methodology](https://app.philidor.io/methodology) &mdash; how scores are calculated
- [Smithery](https://smithery.ai/servers/philidor/defi) &mdash; MCP server registry
- [Twitter](https://twitter.com/philidorlabs) &mdash; updates and announcements

## License

[MIT](LICENSE)
