# Onboarding Page Redesign

**Date:** 2026-05-08  
**Status:** Approved  
**File:** `src/app/onboarding/page.tsx`

## Goal

Redesign the onboarding page so the page background is white and the form card always has a red (#EF4444) background with white text and white input fields. The redesign must feel polished and consistent with the v2-3 homepage aesthetic.

## Visual Design

### Page shell
- Background: `#ffffff` (white)
- Full viewport height, flex centered
- No logo or nav — isolated onboarding surface

### Card
- Background: `#EF4444` (brand red)
- Border-bottom: `5px solid #C93B3B` (slab effect, darker red)
- Border-radius: `18px`
- Max-width: `420px`, full width on mobile
- All text inside card uses white or rgba-white values — never CSS variables

### Progress dots (top of card)
Three dots indicating current step. Rules:
- **Done:** `14×14px` white circle, red checkmark SVG inside
- **Active:** `20×6px` white pill (border-radius 3px)
- **Inactive:** `6×6px` circle, `rgba(255,255,255,0.3)`
- Centered row, `gap: 7px`, padding `14px 16px 10px`

### Step 1 — Choose path
- Heading: `"Your household"`, white, 900, 22px
- Subtext: `"Create new or join one that already exists"`, `rgba(255,255,255,0.7)`, 700, 13px
- Two white slab option cards:
  - Background: `#ffffff`
  - Border-bottom: `3px solid #E5E7EB`
  - Border-radius: `11px`
  - Title: 800, 14px, `#111827`
  - Subtitle: 700, 11px, `#6B7280`
  - Full width, `padding: 11px 13px`, `margin-bottom: 8px`

### Step 2a — Create household
- Progress: dot 1 done, dot 2 active, dot 3 inactive
- Back link: `"← Back"`, `rgba(255,255,255,0.6)`, 700, 11px — above heading, tappable
- Heading: `"Name your household"`, white, 900, 22px
- Subtext: `"You can always rename it later in settings"`, `rgba(255,255,255,0.7)`
- Input field:
  - Background: `#ffffff`
  - Border: `1.5px solid rgba(255,255,255,0.5)`
  - Border-bottom: `3px solid rgba(0,0,0,0.12)`
  - Border-radius: `10px`
  - Font: Nunito 700, 13px, color `#374151`
  - Placeholder: `"e.g. The Johnson House"`, color `#9CA3AF`
- Error text (if API fails): `#FCA5A5`, 700, 13px
- CTA button: white bg, `#EF4444` text, border-bottom `3px solid #E5E7EB`, border-radius 11px, 800, 14px

### Step 2b — Join household
Same layout as 2a with:
- Heading: `"Join a household"`
- Subtext: `"Ask your housemate to share their code from Settings"`
- Input: same white style + `letterSpacing: '0.25em'`, `fontFamily: monospace`, text centered, `toUpperCase()` on change, `maxLength: 6`
- CTA: `"Join household"`

### Step 3 — Success
- Progress: all three dots done
- Centered layout:
  - Check circle: `44×44px`, `rgba(255,255,255,0.18)` bg, `2px solid rgba(255,255,255,0.4)` border, white SVG checkmark inside
  - Eyebrow: `"You're in"`, `rgba(255,255,255,0.65)`, 700, 12px
  - Household name: white, 900, 24px, `margin-bottom: 20px`
  - CTA: `"Go to dashboard"` — same white slab button, full width, routes to `/dashboard`

## Logic (unchanged)

All existing API calls, state management, and validation remain identical:
- `handleCreate` → POST `/api/household/create`
- `handleJoin` → POST `/api/household/join`
- Session refresh: `fetch('/api/auth/get-session?disableCookieCache=true')` after success
- Step type: `1 | '2a' | '2b' | 3`
- Error state: string, cleared on each submit attempt
- Loading state: boolean, passed to button

## Components used

- `DotProgress` — internal sub-component, rewritten with new dot styles
- No external UI components needed — all inputs and buttons are raw HTML elements with inline styles (same pattern as auth pages)
- Remove shadcn `Input` and `Button` imports — replace with styled `<input>` and `<button>` elements

## Constraints

- No emojis — Lucide `Check` icon for done dots (already imported)
- Font: Nunito via CSS variable `var(--font-nunito)` inherited from root layout
- Touch targets: input height minimum 48px, buttons minimum 48px
- Mobile Safari: input font-size 16px to prevent auto-zoom (consistent with globals.css rule)
- No CSS variables from the theme system inside this component — all colors are hardcoded on the red card surface
