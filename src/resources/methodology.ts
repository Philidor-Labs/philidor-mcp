import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const METHODOLOGY_CONTENT = `# The Vector Risk Framework v2.0

Philidor Analytics assesses DeFi vaults using a data-driven approach, decomposing every vault into three fundamental Risk Vectors using objective on-chain metrics.

## Philosophy
Subjective labels like "Blue Chip" are prone to bias. Philidor replaces opinions with measurable facts. Instead of "This protocol is safe", we say "This protocol has been live for 1,400 days with 5 independent audits."

## Vector 1: Asset Composition (40% weight)
Categorizes assets by collateral quality:
- Spot exposure: 10/10
- Blue-chip collateral (ETH, WBTC, USDC, USDT, DAI): 10/10
- Established collateral (LSTs, secondary stables): 8/10
- Other collateral (less liquid): 5/10

## Vector 2: Platform Code (40% weight)
Measures code safety:

### Lindy Score (time-based safety)
- >2 Years: ~9/10
- >1 Year: ~7/10
- <6 Months: <4/10

### Audit Density
- Baseline: 1 audit mandatory
- Standard audit: +1 point
- Contest audit: +2 points

### Dependency Risk (multiplicative penalties)
- Prime dependency (8+): 0.95x
- Core dependency (5-7): 0.80x
- Edge dependency (<5): 0.50x

### Incident Penalty (caps final score)
- <30 days: capped at 2
- <90 days: capped at 5
- <180 days: capped at 8

## Vector 3: Governance (20% weight)
Measures exit window:
- Immutable contract: 10/10
- Timelock >= 7 days: 9/10
- Timelock >= 48h: 8/10
- Timelock >= 24h: 5/10
- Timelock < 24h: 1/10

## Final Score & Tiers
Formula: 40% Asset + 40% Platform + 20% Control

- Prime (8.0-10.0): Mature code (>2y), multiple audits, safe governance
- Core (5.0-7.9): Audited but newer or flexible governance
- Edge (0.0-4.9): High risk — unaudited, very new, or instant admin powers

### Hard Disqualifications (capped at Edge/4.9)
- No audit exists for protocol version
- Platform score is 0`;

export function registerMethodologyResource(server: McpServer) {
  server.resource(
    'methodology',
    'philidor://methodology',
    {
      description:
        'The Vector Risk Framework v2.0 methodology used by Philidor to score DeFi vault risk.',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: METHODOLOGY_CONTENT,
        },
      ],
    })
  );
}
