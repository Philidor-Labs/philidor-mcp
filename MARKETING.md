# Philidor MCP — Marketing Checklist

## Tier 1: Awesome Lists & Official Registry

- [x] PR to [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — Finance & Fintech section — [PR #2280](https://github.com/punkpeye/awesome-mcp-servers/pull/2280)
- [ ] PR to [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) — similar list, separate maintainer
- [ ] Official MCP Registry (`registry.modelcontextprotocol.io`) — requires DNS TXT record on `philidor.io` with Ed25519 key + `mcp-publisher` CLI. Unlocks `io.philidor/defi-vaults` namespace. Auto-syncs to PulseMCP.
  - Install: `curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher`
  - Generate key: `openssl genpkey -algorithm Ed25519 -out key.pem`
  - Get TXT value: `openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64`
  - Add DNS TXT record: `philidor.io. IN TXT "v=MCPv1; k=ed25519; p=<PUBLIC_KEY>"`
  - Login: `mcp-publisher login dns --domain "philidor.io" --private-key "<PRIVATE_KEY>"`
  - Publish: `mcp-publisher publish`

## Tier 2: Directories & Registries

- [x] [mcp.so](https://mcp.so) — comment posted on [chatmcp/mcpso#1](https://github.com/chatmcp/mcpso/issues/1)
- [ ] [Smithery.ai](https://smithery.ai/new) — go to URL, paste `https://mcp.philidor.io/api/mcp`, complete the flow. `smithery.yaml` already in repo.
- [ ] [PulseMCP](https://www.pulsemcp.com/submit) — select "MCP Server", paste `https://github.com/Philidor-Labs/philidor-mcp`
- [ ] [mcpservers.org](https://mcpservers.org/submit) — fill form: Name="Philidor MCP", Category="cloud-service"
- [ ] [Glama.ai](https://glama.ai/mcp/servers) — auto-syncs from awesome-mcp-servers once PR merges. Can also click "Add Server" manually.
- [ ] [mcp.run](https://www.mcp.run) — check if they accept submissions
- [ ] [mcphub.ai](https://www.mcphub.ai) — check for submission process

## Tier 3: Social & Community

### Reddit
- [ ] Post to [r/ClaudeAI](https://reddit.com/r/ClaudeAI) — "I built an MCP server for DeFi risk analytics" with screenshot/demo
- [ ] Post to [r/mcp](https://reddit.com/r/mcp) if it exists
- [ ] Post to [r/defi](https://reddit.com/r/defi) — angle: "AI-powered vault due diligence"
- [ ] Post to [r/ethereum](https://reddit.com/r/ethereum) — angle: "Open-source risk scoring for DeFi vaults"
- [ ] Post to [r/CryptoCurrency](https://reddit.com/r/CryptoCurrency) — angle: "Use Claude to analyze DeFi vault risk before depositing"

### Twitter / X
- [ ] Launch tweet from [@philidorlabs](https://twitter.com/philidorlabs) — announce the MCP server with a thread showing example interactions
- [ ] Tag [@AnthropicAI](https://twitter.com/AnthropicAI) and [@alexalbert__](https://twitter.com/alexalbert__) (Claude head of product)
- [ ] Tag [@modelaboratory](https://twitter.com/modelaboratory) (MCP community)
- [ ] Cross-post to relevant DeFi/crypto accounts
- [ ] Thread format: problem (DeFi risk is hard) → solution (MCP + risk scoring) → demo screenshots → link

### Hacker News
- [ ] Submit as Show HN: "Show HN: MCP Server for DeFi Vault Risk Analytics" — link to repo

### Discord
- [ ] Post in the Anthropic Discord #mcp channel (if exists)
- [ ] Post in DeFi protocol Discords (Morpho, Aave, Yearn) — "we index your vaults with risk scores, now accessible via MCP"

## Tier 4: Content & SEO

- [ ] Record a demo GIF/video using [VHS](https://github.com/charmbracelet/vhs) or screen recording — show a Claude conversation using Philidor tools
- [ ] Add demo GIF to README hero section
- [ ] Write a blog post on philidor.io: "Introducing the Philidor MCP Server"
- [ ] Create a `.well-known/mcp/server-card.json` on `mcp.philidor.io` for auto-discovery by crawlers

## Tier 5: Integrations & Partnerships

- [ ] Reach out to [Claude MCP marketplace](https://claude.ai) team about featuring
- [ ] Contact Cursor team about featuring in their MCP gallery
- [ ] Contact Windsurf team about featuring in their MCP directory
- [ ] Explore npm publish (`npx philidor-mcp`) for one-command stdio install
- [ ] GitHub Actions workflow for auto-publish to Official MCP Registry on tag push

## Repo Hygiene (Ongoing)

- [x] Killer README with comparison table, Quick Start, tool docs, architecture diagram
- [x] GitHub topics set (13 topics: mcp, mcp-server, defi, crypto, risk, ethereum, etc.)
- [x] Repo description + homepage configured
- [x] Discussions enabled
- [x] Source code included (not just a pointer to monorepo)
- [x] Dockerfile for Docker distribution
- [x] smithery.yaml for Smithery registry
- [x] server.json for Official MCP Registry
- [ ] Add GitHub social preview image (1280x640 OG image)
- [ ] Star the repo from personal accounts to seed initial stars
- [ ] Create a GitHub Release (v1.0.0) with changelog
