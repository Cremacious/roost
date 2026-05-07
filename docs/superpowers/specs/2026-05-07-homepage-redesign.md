# Homepage Redesign — Design Spec
**Date:** 2026-05-07
**File:** `apps/web/src/app/page.tsx`

---

## Overview

Replace the current placeholder homepage with a conversion-focused marketing page. The V1 design used 8 alternating feature rows that became repetitive. This redesign eliminates that pattern entirely with a bento grid and a tighter, more punchy structure.

**Target audience:** Families and roommates sharing a home. Lean slightly toward families in copy tone.

**No pricing section.** Price is mentioned once in the bottom CTA only.

---

## Page Structure (top to bottom)

1. Hero — full-bleed red
2. Bento Grid — feature cards
3. Comparison Table — Roost vs competitors
4. Bottom CTA — full-bleed red
5. Footer — dark bar

---

## Section 1: Hero

**Layout:** Full-bleed red (#EF4444), no nav above it. Fills 85-90% of the viewport height so a sliver of the next section peeks below the fold as a scroll cue.

**Content (vertically centered):**
- Roost logo icon — white, 96px on desktop / 72px on mobile, rounded square (uses `<RoostLogo>` component, `variant="light"`, `size="xl"`)
- Headline: **"One App, Zero Excuses"** — white, Nunito 900, 52px desktop / 36px mobile, letter-spacing -1px
- Tagline: **"Home, sorted."** — white at 70% opacity, 20px desktop / 16px mobile, weight 700
- Two buttons:
  - Primary: white background, red text (#EF4444), **"Get started free"** — links to `/signup`
  - Secondary: transparent background, white border, white text, **"Sign in"** — links to `/login`
- Below buttons: **"Free to start. No credit card needed."** — white at 50% opacity, 13px, weight 600

**Implementation notes:**
- Server component (no `'use client'`). Session check at top: logged-in users redirect to `/today`.
- No sticky nav. The hero is the nav. Logo doubles as brand anchor.
- Buttons use the slab style (border-bottom 3px for primary, border all sides for secondary).
- Mobile: stack buttons vertically, reduce padding.

---

## Section 2: Bento Grid

**Eyebrow:** "EVERYTHING YOUR HOUSE NEEDS" — 11px, uppercase, letter-spacing 0.08em, #9CA3AF, centered

**Layout:** CSS grid with intentionally unequal card sizes to break visual monotony. No two rows look the same.

```
Row 1: [ Chores — 2/3 width ] [ Grocery — 1/3 width ]
Row 2: [ Expenses — 1/3 width ] [ Meals — 2/3 width ]
Row 3: [ Calendar — 1/2 width ] [ Reminders — 1/2 width ]
```

On mobile: single column, all cards full width, stacked vertically.

**Card anatomy (each card):**
- White background, `border-radius: 16px`
- Border: `1.5px solid #E5E7EB` on top/left/right
- Bottom border: `4px solid <section-dark-color>` (slab effect)
- Icon badge: 36px rounded square, section color at 15% opacity background, Lucide icon in section color
- Feature name: 15px, weight 900, `#111827`
- Body copy: 13px, weight 600, `#6B7280`, line-height 1.5
- Tall cards (Chores, Meals) additionally include a mini app UI mockup — a small preview of what the feature looks like

**Copy per card:**

| Feature | Icon | Section Color | Body Copy |
|---|---|---|---|
| Chores | `CheckSquare` | #EF4444 | "Assign it. Track it. Nobody gets away with 'I forgot.' Kids earn rewards for finishing theirs." |
| Grocery | `ShoppingCart` | #F59E0B | "One list everyone adds to. No more 'I thought you got the milk.'" |
| Expenses | `DollarSign` | #22C55E | "Split bills three ways, scan a receipt, settle up. No spreadsheets." |
| Meals | `UtensilsCrossed` | #F97316 | "Plan the week, vote on dinners, push ingredients straight to your grocery list." |
| Calendar | `CalendarDays` | #3B82F6 | "Household events everyone can see. School pickups, dentist, game night." |
| Reminders | `Bell` | #06B6D4 | "Nag the right people at the right time, so you don't have to." |

**Section wrapper:** white background (`#ffffff`), padding 80px vertical on desktop, 48px on mobile. Max-width 1100px, centered.

---

## Section 3: Comparison Table

**Eyebrow:** "WHY ROOST?" — 11px, uppercase, #9CA3AF, centered

**Heading:** "Everything they don't have. Nothing you don't need." — 32px desktop / 24px mobile, Nunito 900, `#111827`, centered, margin-bottom 40px

**Table structure:** 5 columns — Feature · Roost · Splitwise · Cozi · OurHome

**Roost column styling:** light red header background (`#EF444415`), red column header text, visually dominant.

**Cell values:**
- ✓ (green, #22C55E, weight 800) = full support
- ✗ (red, #EF4444) = not supported
- ~ (gray, #9CA3AF) = partial

**Rows:**

| Feature | Roost | Splitwise | Cozi | OurHome |
|---|---|---|---|---|
| Chore tracking + rewards | ✓ | ✗ | ✗ | ✓ |
| Grocery lists | ✓ | ✗ | ✓ | ✓ |
| Bill splitting | ✓ | ✓ | ✗ | ✗ |
| Receipt scanning | ✓ | ✗ | ✗ | ✗ |
| Meal planning | ✓ | ✗ | ~ | ✗ |
| Shared calendar | ✓ | ✗ | ✓ | ✓ |
| Child accounts | ✓ | ✗ | ✗ | ~ |
| Reminders | ✓ | ✗ | ✓ | ✗ |
| Per-household pricing | ✓ | ✗ | ✗ | ✗ |
| Notes | ✓ | ✗ | ✗ | ✗ |

**Table card:** slab card style — white background, `border-radius: 16px`, `1.5px solid #E5E7EB` border, `4px solid #EF4444` bottom border.

**Section wrapper:** `#F9FAFB` background, 80px vertical padding desktop, 48px mobile. Max-width 1100px, centered.

---

## Section 4: Bottom CTA

**Layout:** Full-bleed red (#EF4444), mirrors the hero. Height: roughly 40% of viewport, content vertically centered.

**Content:**
- Headline: **"Your house runs better. Starting today."** — white, Nunito 900, 40px desktop / 28px mobile
- Subtext: **"Free to start. $4/month when you're ready for more."** — white at 70% opacity, 16px, weight 700
- Single button: white background, red text (#EF4444), **"Get started free"** — links to `/signup`, slab style (border-bottom 3px solid `#C93B3B`)

One CTA only. No secondary action. Close strong.

---

## Section 5: Footer

**Background:** `#111827` (dark)
**Layout:** single row, space-between on desktop / stacked on mobile
**Padding:** 32px vertical, max-width 1100px centered

**Left:** `<RoostLogo variant="light" size="sm" />` — white wordmark

**Right:** "Privacy" · "Terms" — 13px, weight 700, `#6B7280`, links to `/privacy` and `/terms` (placeholder hrefs for now)

**Below, centered:** "© 2026 Roost. Built for families and roommates who share a home." — 12px, `#4B5563`, weight 600

---

## Non-goals

- No pricing section
- No testimonials (no social proof yet)
- No nav bar (hero is the nav)
- No animations beyond what Tailwind provides (no framer-motion on this page)
- No blog, changelog, or docs links

---

## Implementation Notes

- **File:** `apps/web/src/app/page.tsx` — server component, replace entirely
- **Font:** Nunito via `var(--font-nunito)` already set on `<body>` in root layout
- **Icons:** Lucide only, imported from `lucide-react`
- **Logo:** `<RoostLogo>` from `@/components/shared/RoostLogo`
- **No em dashes** anywhere in copy — use commas, periods, or reword
- **No emojis** — Lucide icons only
- **Section colors:** import from `@/lib/constants/colors.ts`, never hardcode hex values for section colors
- **Responsive:** mobile-first. All sections must work at 375px viewport width.
- **Auth redirect:** keep existing session check at top of component — logged-in users redirect to `/today`
