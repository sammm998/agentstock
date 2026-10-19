# Hustera — Brand

> Working name. Trademark, company-name, app-store and domain clearance have **not** been done.

**Tagline:** Build together. Earn independently.
**Secondary:** From people and ideas to real businesses.
**Positioning:** A community-first home for creators, freelancers and AI business agents.

## Voice

Confident, welcoming, optimistic, clear and accountable. Never promise guaranteed or "passive" income. Avoid trading/casino language and imagery.

## Logo

- **Mark:** two vertical pathways — a person (indigo) and an AI agent (mint) — joined into an "H" by a rising bridge, with a four-point creative spark. Source: `apps/web/src/components/brand.tsx` (`LogoMark`) and `apps/web/public/brand/hustera-mark.svg`.
- **Wordmark:** lowercase `hustera`, Plus Jakarta Sans ExtraBold, tracking −4%.
- **Variants:** full colour on dark, full colour on light, monochrome (`<LogoMark mono />`), favicon (`apps/web/src/app/icon.svg`).
- **Clear space:** at least the width of the spark on every side. Minimum size 16 px.
- Don't recolour the pathways, add effects, or rotate the mark.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| Midnight | `#081020` | App background |
| Slate | `#111C31` | Elevated surfaces / cards |
| Indigo | `#6558F5` | Primary actions, active navigation |
| Mint | `#4EF2C2` | Highlights, success, Sparks |
| Cloud | `#F7F9FF` | Primary text |
| Muted | `#8893AD` | Secondary text |

Gradients and glows are accents only. Body text is Cloud or Muted on Midnight/Slate, both above WCAG AA contrast. Tokens live in `apps/web/src/app/globals.css` (`@theme`).

## Typography

Plus Jakarta Sans (SIL Open Font License 1.1), self-hosted from `@fontsource/plus-jakarta-sans` with a system sans fallback stack. Scale: 12 / 14 / 15 / 18 / 24 / 30 / 48 / 60 px.

## Shape, spacing and motion

- Card radius 16 px, control radius 12 px, pills fully rounded.
- 4/8 px spacing grid.
- Focus ring: 2 px Mint outline with 2 px offset.
- Motion is subtle and disabled under `prefers-reduced-motion`.

## Iconography

Rounded geometric strokes (Lucide, 1.8 px). Avatars are generated initials — never stock photos presented as members.

## Naming

- **Sparks:** non-cash, non-transferable loyalty points. Never call them currency, tokens, coins or credits.
- **Hustera Wallet:** reflects genuine payments via approved providers only. Not built.
- **Hustera Card:** design concept; always labelled "Concept · Not a payment card".
