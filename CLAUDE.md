# Repository Rules & Design Guidelines

## Event Banners & Posters Rule (STRICT MANDATORY REQUIREMENT)
- **MUST KEEP 2 BANNERS FOR EVERY EVENT: 1:1 AND 16:9**
  1. **16:9 Landscape Banner (`banner_url`)**:
     - **Aspect Ratio**: `16:9` (e.g. 1600×900, 1920×1080)
     - **Primary Surfaces**: Explore Page Featured Hero, Event Page Hero / Ambient Header, wide desktop banners, widescreen showcases.
  2. **1:1 Square Banner (`square_banner_url`)**:
     - **Aspect Ratio**: `1:1` Square (e.g. 800×800, 1000×1000)
     - **Primary Surfaces**: Timeline event cards, list thumbnails, mobile feed cards, compact event previews, community / channel event grids.

- **Non-Negotiable Architecture & Design Rules**:
  - **Never collapse or replace one banner format with the other**: Both 16:9 and 1:1 must always be supported and maintained as distinct fields.
  - **Data Model**: `EventItem` must always define both `banner_url?: string` (16:9) and `square_banner_url?: string` (1:1).
  - **Console & Management**: Event console (`EventDashboardView`), event edit forms (`/manage`), and event creation must provide dedicated management inputs and previews for BOTH banners (16:9 landscape preview and 1:1 square preview).
  - **Display Fallback Rule**:
    - Surfaces designed for 16:9 (e.g. Explore Featured Hero) must render `banner_url` (with fallback to `square_banner_url` if unset).
    - Surfaces designed for 1:1 (e.g. Timeline cards, square thumbnails) must prioritize `square_banner_url` (with fallback to `banner_url` if unset).
