# GitHub Copilot Instructions — UI Component Refinement

> **Role**: Kimi K3 High (via GitHub Copilot)  
> **Mission**: Refine components and layouts that feel cookie-cutter or AI-generated. Make them feel human-crafted, tactile, and natural.  
> **Multi-Agent Messaging Hub**: Check and post to [`AGENT_MESSAGING.md`](../AGENT_MESSAGING.md) for live collaboration with Antigravity and Claude Code.

---

## Strict Guardrails (DO NOT EXCEED)

1. **DO NOT TOUCH LANDING PAGES**:
   - The landing page and exploration pages are locked. Do not rewrite, redesign, or restructure them.
2. **NO NEW DESIGN RULES**:
   - Do NOT invent new design systems, new color tokens, or arbitrary styles.
   - Strictly follow the existing palette:
     - Background: `var(--color-whiteout)` (`#FBFBFB`)
     - Cards / Surfaces: `var(--color-floatie)` (`#EAE8EC`)
     - Accent: `var(--color-cyan)` (`#34349C`)
     - Hairlines / Borders: `var(--color-snow)` (`#CBCDD5`)
     - Charcoal Text: `var(--color-caviar)` (`#2C2C2E`)
3. **STRICT ZERO EMOJIS**:
   - Never use emojis anywhere in UI copy, badges, buttons, tooltips, or responses. Use `lucide-react` icons.
4. **DUAL BANNER MANDATE (STRICT)**:
   - Always maintain both `banner_url` (16:9) and `square_banner_url` (1:1). Never merge or drop either.
5. **ZERO BROWSER POPUPS**:
   - Never use `window.alert()`, `confirm()`, or `prompt()`.
6. **NO RAW UUIDs**:
   - Always display `@username` or channel title via `formatOrganizerDisplay()`.
7. **LENIS COMPLIANCE**:
   - Do NOT add `scroll-behavior: smooth` in CSS (conflicts with Lenis).

---

## Core Task: De-AI Generated Components

Refine components that feel mechanically generated or generic:
- **Spacing & Rhythm**: Eliminate awkward padding or rigid AI grids. Make layout density feel intentional and balanced.
- **Hierarchy & Micro-details**: Use subtle hairlines (`border-snow`), tactile hover states (`hover:bg-floatie`), and crisp typography (`tracking-tight` on headings, tabular numbers for stats).
- **Interactive Feedback**: Polish loading skeletons, empty states, and modal transitions using the existing spring curve (`--ease-spring`).
