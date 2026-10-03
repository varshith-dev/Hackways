# GitHub Copilot (Kimi K3 High) — UI Refinement Directive

> **Your Exact Mission**:  
> Refine components and layouts that feel cookie-cutter or AI-generated. Make them feel bespoke, tactile, and crafted by a senior human designer.

---

## 1. Absolute Guardrails

1. **DO NOT TOUCH LANDING PAGES**:
   - The landing page and exploration pages are locked. Do not rewrite, redesign, or restructure them.
2. **NO NEW DESIGN RULES**:
   - Do NOT introduce new design frameworks, new color ramps, or arbitrary styling rules.
   - Stay strictly inside the existing Hackways palette:
     - `var(--color-whiteout)` (`#FBFBFB`)
     - `var(--color-floatie)` (`#EAE8EC`)
     - `var(--color-cyan)` (`#34349C`)
     - `var(--color-snow)` (`#CBCDD5`)
     - `var(--color-caviar)` (`#2C2C2E`)
3. **ZERO EMOJIS**: Strictly no emojis in UI text, labels, badges, or buttons. Use `lucide-react` icons.
4. **DUAL BANNER RULE**: Always preserve `banner_url` (16:9) and `square_banner_url` (1:1). Never discard either.
5. **ZERO BROWSER POPUPS**: No `window.alert()`, `confirm()`, or `prompt()`.
6. **NO RAW UUID DISPLAY**: Display clean `@username` or channel title via `formatOrganizerDisplay()`.
7. **LENIS SCROLL**: Never add `scroll-behavior: smooth` to CSS (conflicts with Lenis virtual scroll).

---

## 2. What To Refine: "De-AI" The Components

Look for components in `apps/web` and `apps/console` that look mechanically generated:
- Replace rigid, formulaic AI card layouts with natural spacing and hierarchy.
- Refine modal dialogs, drawers, and form cards to have subtle hairlines (`border-snow`), crisp contrast, and tactile active/hover states.
- Polish empty states and loading skeletons so they look clean and intentional.
- Keep all existing business logic, auth checks, and route handlers completely intact.
