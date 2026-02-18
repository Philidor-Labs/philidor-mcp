# Philidor MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives AI agents access to DeFi vault risk analytics from [Philidor](https://app.philidor.io).

Search vaults, compare risks, analyze protocols, and perform due diligence — powered by the [Vector Risk Framework](https://app.philidor.io/methodology).

## Quick Start

### Remote (Recommended)

Connect directly to the hosted server — no installation needed:

```
https://mcp.philidor.io/api/mcp
```

Transport: **Streamable HTTP**

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "mcpServers": {
    "philidor": {
      "url": "https://mcp.philidor.io/api/mcp"
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_vaults` | Search and filter DeFi vaults by chain, protocol, asset, risk tier, TVL |
| `get_vault` | Get full vault details including risk vectors, snapshots, and events |
| `get_vault_risk_breakdown` | Detailed risk vector analysis for a specific vault |
| `compare_vaults` | Side-by-side comparison of 2-3 vaults |
| `find_safest_vaults` | Find the safest audited vaults matching criteria |
| `get_protocol_info` | Protocol details including security history and versions |
| `get_curator_info` | Curator details including track record and vault performance |
| `get_market_overview` | Platform-wide DeFi vault statistics |
| `explain_risk_score` | Explain what a risk score (0-10) means |

## Resources

| URI | Description |
|-----|-------------|
| `philidor://methodology` | The Vector Risk Framework v2.0 documentation |
| `philidor://supported-chains` | List of supported blockchain networks |
| `philidor://supported-protocols` | List of supported DeFi protocols |

## Prompts

| Prompt | Description |
|--------|-------------|
| `vault_due_diligence` | Comprehensive due diligence report for a vault |
| `portfolio_risk_assessment` | Portfolio-level risk analysis across multiple positions |
| `defi_yield_comparison` | Yield comparison analysis across vaults |

## Risk Scoring

Philidor uses the **Vector Risk Framework** which decomposes vault risk into three vectors:

- **Asset Composition (40%)** — quality of underlying assets and collateral
- **Platform Code (40%)** — code maturity, audit density, dependency risk, incident history
- **Governance (20%)** — admin controls, timelock duration, immutability

Scores range from 0-10 and map to tiers:

| Tier | Score | Meaning |
|------|-------|---------|
| **Prime** | 8.0 - 10.0 | Institutional-grade safety |
| **Core** | 5.0 - 7.9 | Moderate safety, suitable with monitoring |
| **Edge** | 0.0 - 4.9 | Higher risk, requires careful due diligence |

## API

This MCP server is powered by the [Philidor Public API](https://api.philidor.io/v1/docs).

## Links

- [Philidor Analytics](https://app.philidor.io) — explore vaults and risk scores
- [API Documentation](https://api.philidor.io/v1/docs) — Swagger/OpenAPI docs
- [Methodology](https://app.philidor.io/methodology) — how risk scores are calculated

## License

MIT
