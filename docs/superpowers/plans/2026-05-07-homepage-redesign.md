# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7 repetitive alternating feature rows in `src/app/page.tsx` with a bento grid, while preserving the hero, comparison table, SEO sections, and all structured data.

**Architecture:** Single-file change to `src/app/page.tsx`. The existing mockup components (`ChoresMockup`, `MealsMockup`) are reused inside the bento's tall cards. Five unused mockup components are deleted. The existing `<style>` block gains bento-specific responsive rules.

**Tech Stack:** Next.js App Router (server component), inline styles, Lucide icons, existing mockup components.

---

### Task 1: Update imports and delete unused mockup components

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add missing Lucide icons to import**

Find the existing import:
```tsx
import { Bell, GraduationCap, Home, Users } from 'lucide-react';
```
Replace with:
```tsx
import { Bell, CalendarDays, CheckSquare, DollarSign, GraduationCap, Home, ShoppingCart, Users, UtensilsCrossed } from 'lucide-react';
```

- [ ] **Step 2: Delete the five unused mockup components**

Delete these entire function declarations from `src/app/page.tsx` (they are replaced by bento cards with icon-only content):
- `function GroceryMockup() { ... }` — lines ~184–286
- `function CalendarMockup() { ... }` — lines ~288–475
- `function ExpensesMockup() { ... }` — lines ~477–617
- `function RemindersMockup() { ... }` — lines ~619–727
- `function AllowancesMockup() { ... }` — lines ~839–995

Keep `ChoresMockup` and `MealsMockup` — they are reused in the bento tall cards.

- [ ] **Step 3: Verify file still compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors referencing the deleted components.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor(homepage): remove unused mockup components"
```

---

### Task 2: Update hero headline

**Files:**
- Modify: `src/app/page.tsx`

The hero `<h1>` currently reads "The household management app for families and roommates." Replace with the new headline and supporting copy.

- [ ] **Step 1: Replace hero h1 text**

Find:
```tsx
        >
          The household management app for families and roommates.
        </h1>
```
Replace with:
```tsx
        >
          One App, Zero Excuses
        </h1>
```

- [ ] **Step 2: Replace hero subtitle paragraph**

Find:
```tsx
        >
          Chores, groceries, bills, reminders, a shared calendar, meal planning,
          allowances, and notes. All under one roof, so your home runs on one
          shared system instead of a pile of separate tools.
        </p>
```
Replace with:
```tsx
        >
          Chores. Groceries. Bills. Meals. One place, everyone on the same page.
        </p>
```

- [ ] **Step 3: Update both hero CTA buttons to match spec copy**

Find both occurrences of `Create your household` in the hero and bottom CTA, and replace with `Get started free`:

In the hero `<div className="hero-actions">`:
```tsx
          Get started free
```
In the CTA section `<div className="cta-actions">`:
```tsx
          Get started free
```

- [ ] **Step 4: Verify visually**

Start dev server if not running:
```bash
cd apps/web && npm run dev
```
Open http://localhost:3000 (or the port shown). Confirm hero shows "One App, Zero Excuses" and "Get started free" button.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): update hero headline to 'One App, Zero Excuses'"
```

---

### Task 3: Remove problem section and feature rows

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove the problem section**

Delete this entire block (the section with `className="problem-section"` starting with `{/* 4. PROBLEM */}`):

```tsx
      {/* 4. PROBLEM */}
      <section
        className="problem-section"
        style={{
          backgroundColor: brandTint,
          ...
        }}
      >
        ...
      </section>
```

The section starts at `{/* 4. PROBLEM */}` and ends before `{/* 5. FEATURES */}`.

- [ ] **Step 2: Remove all 7 feature row sections**

Delete the entire `<div id="features">` block — this is the section starting with `{/* 5. FEATURES */}` and containing all 7 alternating feature sections (Chores, Grocery, Calendar, Expenses, Reminders, Meals, Allowances).

The block starts with:
```tsx
      {/* 5. FEATURES */}
      <div id="features">
```
And ends with:
```tsx
      </div>
```
just before `{/* 6. COMPARISON TABLE */}`.

Delete this entire block.

- [ ] **Step 3: Verify the page renders without errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors. The page now goes: Hero → Comparison Table → ... → Bottom CTA → Footer.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor(homepage): remove problem section and alternating feature rows"
```

---

### Task 4: Add bento grid

**Files:**
- Modify: `src/app/page.tsx`

The bento grid goes between the hero section and the comparison table. Insert after the hero `</section>` closing tag and before `{/* 6. COMPARISON TABLE */}`.

- [ ] **Step 1: Insert bento grid section**

After the hero closing `</section>` tag (the one with `className="hero-section"`), insert:

```tsx
      {/* BENTO GRID */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#9CA3AF',
              marginBottom: 48,
              fontFamily: ff,
              textTransform: 'uppercase',
            }}
          >
            Everything your house needs
          </p>

          {/* Row 1: Chores (2/3) + Grocery (1/3) */}
          <div className="bento-row-a" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Chores — tall with mockup */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #C93B3B',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <CheckSquare size={18} color="#EF4444" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                  Chores
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                  Assign it. Track it. Nobody gets away with &ldquo;I forgot.&rdquo; Kids earn rewards for finishing theirs.
                </p>
              </div>
              <ChoresMockup />
            </div>

            {/* Grocery — small */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #C87D00',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <ShoppingCart size={18} color="#F59E0B" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                Grocery
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                One list everyone adds to. No more &ldquo;I thought you got the milk.&rdquo;
              </p>
            </div>
          </div>

          {/* Row 2: Expenses (1/3) + Meals (2/3) */}
          <div className="bento-row-b" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
            {/* Expenses — small */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #159040',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <DollarSign size={18} color="#22C55E" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                Expenses
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                Split bills three ways, scan a receipt, settle up. No spreadsheets.
              </p>
            </div>

            {/* Meals — tall with mockup */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #C4581A',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(249,115,22,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <UtensilsCrossed size={18} color="#F97316" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                  Meals
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                  Plan the week, vote on dinners, push ingredients straight to your grocery list.
                </p>
              </div>
              <MealsMockup />
            </div>
          </div>

          {/* Row 3: Calendar (1/2) + Reminders (1/2) */}
          <div className="bento-row-c" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {/* Calendar */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #1A5CB5',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(59,130,246,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <CalendarDays size={18} color="#3B82F6" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                Calendar
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                Household events everyone can see. School pickups, dentist, game night.
              </p>
            </div>

            {/* Reminders */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: '4px solid #0891B2',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(6,182,212,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Bell size={18} color="#06B6D4" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: ff }}>
                Reminders
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: ff }}>
                Nag the right people at the right time, so you don&apos;t have to.
              </p>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add bento mobile styles to the existing `<style>` block**

Inside the existing `@media (max-width: 640px)` block, append before the closing `}`):

```css
          .bento-row-a,
          .bento-row-b,
          .bento-row-c {
            grid-template-columns: 1fr !important;
          }
```

- [ ] **Step 3: Verify visually at desktop and mobile widths**

Check http://localhost:3000 at both 1280px and 375px. Confirm:
- Desktop: 3 rows with 2/3+1/3, 1/3+2/3, 1/2+1/2 layout
- Mobile: all cards single column
- ChoresMockup and MealsMockup render inside tall cards
- Section colors match (red, amber, green, orange, blue, cyan)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): add bento grid feature section"
```

---

### Task 5: Update comparison table header styling

**Files:**
- Modify: `src/app/page.tsx`

The existing comparison table is solid but needs its header updated to match the spec (eyebrow + new heading copy).

- [ ] **Step 1: Update comparison section heading**

Find:
```tsx
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#1a1a1a',
              letterSpacing: '-0.7px',
              margin: '0 0 8px',
              fontFamily: ff,
            }}
          >
            How does Roost stack up?
          </h2>
          <p
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#888',
              margin: 0,
              fontFamily: ff,
            }}
          >
            You tell us how it compares when you try it.
          </p>
```
Replace with:
```tsx
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#9CA3AF',
              marginBottom: 12,
              fontFamily: ff,
              textTransform: 'uppercase',
            }}
          >
            Why Roost?
          </p>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#111827',
              letterSpacing: '-0.7px',
              margin: '0 0 40px',
              fontFamily: ff,
            }}
          >
            Everything they don&apos;t have. Nothing you don&apos;t need.
          </h2>
```

- [ ] **Step 2: Update comparison section background**

The comp section `backgroundColor` is currently `brandTint` (#FFF1F2). Update to `#F9FAFB` to match the spec:

Find:
```tsx
        className="comp-section"
        style={{ backgroundColor: brandTint, padding: '56px 40px' }}
```
Replace with:
```tsx
        className="comp-section"
        style={{ backgroundColor: '#F9FAFB', padding: '56px 40px' }}
```

- [ ] **Step 3: Verify comparison table renders correctly**

Check http://localhost:3000 — scroll to the comparison table. Confirm:
- New eyebrow "WHY ROOST?" and heading show
- Roost column still has red header, all checkmarks green

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): update comparison table header copy and background"
```

---

### Task 6: Update bottom CTA section

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update bottom CTA headline and subtext**

Find:
```tsx
          Your household is waiting.
        </h2>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 28px',
            fontFamily: ff,
          }}
        >
          Free to get started, no credit card, no excuses.
        </p>
```
Replace with:
```tsx
          Your house runs better. Starting today.
        </h2>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 28px',
            fontFamily: ff,
          }}
        >
          Free to start. $4/month when you&apos;re ready for more.
        </p>
```

- [ ] **Step 2: Remove the secondary CTA button from the bottom CTA**

The bottom CTA should have only ONE button ("Get started free"). Remove the "Sign in" secondary button from the `<div className="cta-actions">` block.

Find (inside cta-actions div):
```tsx
          <Link
            href="/login"
            className="cta-secondary"
            style={{ fontFamily: ff }}
          >
            Sign in
          </Link>
```
Delete this `<Link>` element entirely.

- [ ] **Step 3: Verify bottom CTA**

Scroll to bottom of http://localhost:3000. Confirm:
- "Your house runs better. Starting today." headline
- "$4/month" subtext
- Single "Get started free" button

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): update bottom CTA copy and remove secondary button"
```

---

### Task 7: Update footer tagline

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update footer center text**

Find:
```tsx
          Homes run better with Roost.
```
Replace with:
```tsx
          &copy; 2026 Roost. Built for families and roommates who share a home.
```

- [ ] **Step 2: Final visual check — full page scroll**

Open http://localhost:3000 and scroll through the full page. Confirm order is:
1. Sticky red nav
2. Red hero with "One App, Zero Excuses"
3. White bento grid (6 feature cards, 3 rows with varied widths)
4. Gray (#F9FAFB) comparison table with "WHY ROOST?" eyebrow
5. SEO sections (personas, resource links, FAQ) — unchanged
6. Red bottom CTA with single button
7. Red footer with copyright text

Also verify at 375px mobile width — bento cards all stack single column.

- [ ] **Step 3: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): update footer tagline

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check:**
- [x] Hero: "One App, Zero Excuses" — Task 2
- [x] Bento grid: 6 features, varied widths, section colors, tall cards with mockups — Task 4
- [x] Comparison table: updated header copy and background — Task 5
- [x] Bottom CTA: single button, new copy, price mention — Task 6
- [x] Footer: copyright tagline — Task 7
- [x] No pricing section — problem/feature rows removed in Task 3, no pricing added
- [x] No testimonials — not added
- [x] Auth redirect preserved — not touched (`if (session) redirect('/dashboard')`)
- [x] SEO sections (FAQ, resource links, personas) — explicitly preserved, not touched

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `ChoresMockup` and `MealsMockup` keep their existing signatures (no props). Used identically to V1. No type issues.
- New Lucide icons (`CheckSquare`, `ShoppingCart`, `DollarSign`, `UtensilsCrossed`, `CalendarDays`) all exist in `lucide-react`. Added to import in Task 1.
