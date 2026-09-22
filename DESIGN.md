# Design Brief

## Purpose & Context
Premium business analytics dashboard for import/export retail operations. Multi-user SaaS with admin-hierarchical access control, real-time transaction tracking, multi-location inventory, and advanced financial analytics. Users manage transactions, inventory, customers, and financial metrics across branches.

## Tone & Differentiation
Professional, data-forward, minimalist with purpose. Futuristic white/blue aesthetic emphasizes clarity over decoration. Charts and tables dominate; depth via layered backgrounds and subtle borders. Designed for both mobile and desktop with equal fidelity.

## Color Palette

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| Primary | `0.55 0.22 240` | `0.65 0.22 240` | CTAs, highlights, active states |
| Secondary | `0.92 0.05 240` | `0.25 0.05 240` | Secondary actions, subtle accents |
| Success | `0.65 0.18 140` | `0.7 0.18 140` | Positive metrics, completed actions |
| Warning | `0.72 0.2 45` | `0.78 0.2 45` | Alerts, overdue debts, low stock |
| Destructive | `0.58 0.24 27` | `0.65 0.24 27` | Delete, remove, critical errors |
| Chart-1 | `0.55 0.22 240` | `0.65 0.22 240` | Blue accent (primary) |
| Chart-2 | `0.65 0.18 200` | `0.7 0.18 200` | Cyan/teal secondary |
| Chart-3 | `0.45 0.15 280` | `0.55 0.15 280` | Purple tertiary |
| Chart-4 | `0.7 0.2 160` | `0.75 0.2 160` | Green/mint quaternary |
| Chart-5 | `0.6 0.16 320` | `0.68 0.16 320` | Magenta quinary |

## Typography
- **Display**: System sans-serif (Tailwind default)
- **Body**: System sans-serif (Tailwind default)
- **Mono**: System monospace
- **Weight hierarchy**: Regular (400) body, Medium (500) labels, Semibold (600) metrics, Bold (700) headings

## Elevation & Depth
- **Background**: Solid white (`0.98 0`) / dark grey (`0.12 0`)
- **Cards**: Elevated with 1px border + subtle shadow
- **Sections**: Muted background 20% opacity + border (`.bg-data-section`)
- **Tables**: Header with muted background 40% opacity, alternating rows with 10% muted overlay
- **Charts**: Embedded in card containers, responsive to parent width

## Structural Zones

| Zone | Treatment | Purpose |
|------|-----------|---------|
| Header | Sticky, white/card background, subtle bottom border | Navigation, tab switcher, user menu |
| Sidebar | Existing design, book name always visible | Main navigation, logout |
| Content (Main) | White background with full-width card containers | Dashboard, analytics, transactions, inventory |
| Analytics Page | 5-tab interface (Overview, Sales, Inventory, Customers, Operations) | Data visualization, metrics, reports |
| Audit Log Page | Read-only table with timestamp, user, action, entity columns | Admin-only visibility, change history |
| Customer Statements | Per-customer transaction list with payment status badges | Standalone page per customer |
| Aging Report | Debt-grouped table (30, 60, 90+ days overdue) | Financial overview |

## Spacing & Rhythm
- **Container padding**: 1.5rem (mobile), 2rem (desktop)
- **Component gap**: 1rem (vertical), 1rem (horizontal)
- **Metric card spacing**: 1rem gap between metric value and label
- **Table row height**: 2.75rem (compact, mobile-first)
- **Section margin**: 2rem between major sections

## Component Patterns
- **Metric cards**: `.metric-card` with value + label layout, icon optional left
- **Status badges**: `.status-badge` with success/warning/destructive variants
- **Tab navigation**: `.tab-inactive` / `.tab-active` with bottom border indicator
- **Data tables**: `.table-header` with muted background, `.table-row-alt` for striping
- **Charts**: Embedded in cards, recharts library, responsive containers

## Motion
- **Fade-in**: 0.3s ease-out for content reveals (analytics page load)
- **Slide-in-up**: 0.3s ease-out for metric cards, tables on analytics load
- **Hover**: Subtle opacity increase on interactive rows, text-primary hover on links
- **Transition**: All interactive elements use `transition-colors` by default

## Constraints & Guardrails
- No full-page gradients; depth via layered surfaces only
- No unnecessary animations; motion serves purpose (loading, state change)
- All colors used via CSS tokens only; no arbitrary hex or rgb values
- Dark mode: tune L and C values separately, never invert by hue
- Mobile-first: all components scale down to `sm:` breakpoint
- Tables: horizontal scroll on mobile, full width on `md:` and up

## Signature Details
1. **Metric card prominence**: Large, bold numbers with supporting label below; drives quick scanning
2. **Chart color consistency**: Fixed palette across all visualizations (Chart-1 through Chart-5)
3. **Tab navigation**: Bottom border indicator (not pill-shaped buttons) preserves minimalism
4. **Data table striping**: Subtle muted overlay on alternate rows for readability without clutter
5. **Status badges**: Color-coded with semantic meaning (success, warning, destructive)

## New Pages & Components
- **Analytics Hub**: 5-tab interface with Overview (KPIs + trend), Sales (revenue charts), Inventory (stock movement), Customers (CLV, aging), Operations (user activity, approval metrics)
- **Audit Log**: Admin-only read-only table with full change history
- **Customer Statements**: Per-customer transaction ledger with balance tracking
- **Aging Report**: Debt aging analysis grouped by 30/60/90+ days overdue
- **Draft Purchase Orders**: New section in Inventory page with auto-generated POs from low-stock alerts
- **Multi-Currency Toggle**: USD/NGN toggle in header, live exchange rate, all metrics dual-display

## Files Modified
- `src/frontend/src/index.css` — Added success/warning colors, data-focused utility classes
- `src/frontend/tailwind.config.js` — Added success/warning color definitions, new shadows and animations
- `DESIGN.md` — This design brief

