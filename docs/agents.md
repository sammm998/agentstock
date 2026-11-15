# Hustera agent network

Every agent is declared once in `packages/domain/src/workflows.ts` (inputs, steps, schedule). The launch form, the visual workflow diagram, the mission plan and the catalog are generated from that definition. Tools live in `apps/web/src/server/tools/*` and are dispatched by `executeTool` in `server/agent-tools.ts`.

| Agent | Category | What it does | Runs without extra keys? |
| --- | --- | --- | --- |
| EcomPro | Commerce | Your product → research → listing → store → Stripe link → announcement | Yes (test checkout); research/SEO/prices with Composio Instant; payment link with Stripe |
| DropForge | Commerce | Scores your supplier candidates by margin/delivery/demand → launches the winner → 7-day auto-posted campaign | Yes; live trend data with Composio Instant |
| PrintPilot | Commerce | Niche → original design concepts → artwork → rights review → listing | Artwork needs Composio Instant |
| DigiCraft | Commerce | AI-written digital product → rights review → store | Needs an AI model |
| PriceScout | Commerce | Recurring competitor price watch for your live products | Needs Composio Instant |
| PageSmith | Commerce | Landing page for a product at `/p/<slug>` | Yes |
| ContentFlow | Growth | 7 posts planned → day 1 posted, rest auto-posted daily | Yes (Hustera feed); external networks need connections |
| TubeEngine | Growth | Ideas → scripts → thumbnails → weekly upload plan | Yes (outlines); full scripts with AI |
| LinkLoom | Growth | Affiliate network + niche → keywords → tracked `/go/<slug>` links → article → campaign → click report | Yes |
| RankRiver | Growth | Keyword map → briefs → on-page checklist | Yes |
| MailMint | Growth | 5-email sequence + consent checklist | Drafts yes; sending needs RESEND_API_KEY |
| AdCraft | Growth | Ad angles and copy (never spends) | Yes |
| CryptoPulse / StockSense | Markets | Live prices (CoinGecko / Stooq) → SMA/RSI signals + AI note → paper portfolio trades | Yes (paper money) |
| Hustera Fund | Markets | Admin-run public paper portfolio | Admin only |
| RevenueDesk | Operations | Ledger + Stripe report | Yes |
| GigMatch | Operations | Marketplace demand → service offer → published after approval | Yes |
| Replyr, InsightLens, Daybreak, LingoCoach, StudioShot, ScoutBrief | Partner | Scoutr products; activation redirects via `SCOUTR_PARTNER_LINKS` (URL never rendered) | Needs `SCOUTR_PARTNER_LINKS` |

## Trading and profit sharing

Trading agents use virtual money with real prices. Real-money execution and sharing profits with members would be a collective investment / portfolio management activity that requires authorisation. `executionAdapter()` refuses when `HUSTERA_LIVE_TRADING=true`; there is no live adapter.

## Background work

`server/worker.ts` restarts due recurring missions, advances autonomous missions and publishes scheduled posts. It runs in-process every minute in production (`instrumentation.ts`, disable with `HUSTERA_WORKER=off`) and via `POST /api/cron/agents` with `CRON_SECRET`.
