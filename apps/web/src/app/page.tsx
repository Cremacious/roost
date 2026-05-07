import Link from 'next/link'
import { getSession } from '@/lib/auth/helpers'
import { redirect } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react'
import { SECTION_COLORS } from '@/lib/constants/colors'

// ─── Mini mockups for tall bento cards ───────────────────────────────────────

function ChoresMockup() {
  const items = [
    { name: 'Take out trash', person: 'Sam', done: true },
    { name: 'Unload dishwasher', person: 'Alex', done: true },
    { name: 'Vacuum living room', person: 'Jordan', done: false },
    { name: 'Clean bathroom', person: 'Sam', done: false },
  ]
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1.5px solid #FECACA',
        borderBottom: '4px solid #EF4444',
        padding: 14,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', fontFamily: 'var(--font-nunito)' }}>
          Today&apos;s chores
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#EF4444', fontFamily: 'var(--font-nunito)' }}>
          2 of 4 done
        </span>
      </div>
      {items.map((item) => (
        <div
          key={item.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            borderBottom: '1px solid #FEF2F2',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              flexShrink: 0,
              backgroundColor: item.done ? '#EF4444' : 'transparent',
              border: item.done ? 'none' : '2px solid #EF4444',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: item.done ? '#9CA3AF' : '#374151',
              textDecoration: item.done ? 'line-through' : 'none',
              flex: 1,
              fontFamily: 'var(--font-nunito)',
            }}
          >
            {item.name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', fontFamily: 'var(--font-nunito)' }}>
            {item.person}
          </span>
        </div>
      ))}
    </div>
  )
}

function MealsMockup() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const meals = ['Pasta', 'Tacos', '', 'Stir Fry', 'Pizza']
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1.5px solid #FED7AA',
        borderBottom: '4px solid #F97316',
        padding: 14,
        width: '100%',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', fontFamily: 'var(--font-nunito)', display: 'block', marginBottom: 10 }}>
        This week
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {days.map((day, i) => (
          <div
            key={day}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', width: 28, fontFamily: 'var(--font-nunito)' }}>
              {day}
            </span>
            <div
              style={{
                flex: 1,
                height: 26,
                borderRadius: 6,
                backgroundColor: meals[i] ? 'rgba(249,115,22,0.08)' : 'transparent',
                border: meals[i] ? '1px solid rgba(249,115,22,0.2)' : '1px dashed #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: meals[i] ? '#C4581A' : '#D1D5DB',
                  fontFamily: 'var(--font-nunito)',
                }}
              >
                {meals[i] || 'Tap to plan'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Comparison table data ────────────────────────────────────────────────────

const compRows: Array<{ feature: string; roost: string; splitwise: string; cozi: string; ourHome: string }> = [
  { feature: 'Chore tracking + rewards', roost: '✓', splitwise: '✗', cozi: '✗', ourHome: '✓' },
  { feature: 'Grocery lists',            roost: '✓', splitwise: '✗', cozi: '✓', ourHome: '✓' },
  { feature: 'Bill splitting',           roost: '✓', splitwise: '✓', cozi: '✗', ourHome: '✗' },
  { feature: 'Receipt scanning',         roost: '✓', splitwise: '✗', cozi: '✗', ourHome: '✗' },
  { feature: 'Meal planning',            roost: '✓', splitwise: '✗', cozi: '~', ourHome: '✗' },
  { feature: 'Shared calendar',          roost: '✓', splitwise: '✗', cozi: '✓', ourHome: '✓' },
  { feature: 'Child accounts',           roost: '✓', splitwise: '✗', cozi: '✗', ourHome: '~' },
  { feature: 'Reminders',               roost: '✓', splitwise: '✗', cozi: '✓', ourHome: '✗' },
  { feature: 'Per-household pricing',    roost: '✓', splitwise: '✗', cozi: '✗', ourHome: '✗' },
  { feature: 'Notes',                   roost: '✓', splitwise: '✗', cozi: '✗', ourHome: '✗' },
]

function cellColor(val: string) {
  if (val === '✓') return '#22C55E'
  if (val === '✗') return '#EF4444'
  return '#9CA3AF'
}

function cellWeight(val: string) {
  return val === '✓' ? 800 : 600
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await getSession()
  if (session) redirect('/today')

  const C = SECTION_COLORS

  return (
    <>
      <style>{`
        .hp-hero-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .hp-btn-primary {
          display: inline-block;
          background: #fff;
          color: #EF4444;
          font-weight: 800;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 12px;
          border: none;
          border-bottom: 3px solid #D1D5DB;
          text-decoration: none;
          font-family: var(--font-nunito);
        }
        .hp-btn-secondary {
          display: inline-block;
          background: transparent;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.5);
          text-decoration: none;
          font-family: var(--font-nunito);
        }
        .hp-bento-row-a { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
        .hp-bento-row-b { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-top: 16px; }
        .hp-bento-row-c { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
        .hp-comp-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .hp-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hp-footer-links { display: flex; gap: 20px; }
        @media (max-width: 640px) {
          .hp-hero-btns { flex-direction: column; align-items: center; }
          .hp-btn-primary, .hp-btn-secondary { width: min(100%, 280px); text-align: center; box-sizing: border-box; }
          .hp-bento-row-a, .hp-bento-row-b, .hp-bento-row-c { grid-template-columns: 1fr !important; }
          .hp-footer-inner { flex-direction: column; align-items: center; text-align: center; }
          .hp-footer-links { justify-content: center; }
        }
      `}</style>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: C.chores.base,
          minHeight: '87vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '60px 24px',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          {/* Logo placeholder */}
          <div
            style={{
              width: 96,
              height: 96,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 24,
              margin: '0 auto 28px',
            }}
            className="hp-logo"
          />

          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-1px',
              margin: '0 0 14px',
              lineHeight: 1.1,
              fontFamily: 'var(--font-nunito)',
            }}
            className="hp-h1"
          >
            One App, Zero Excuses
          </h1>

          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              margin: '0 0 36px',
              fontFamily: 'var(--font-nunito)',
            }}
            className="hp-tagline"
          >
            Home, sorted.
          </p>

          <div className="hp-hero-btns" style={{ marginBottom: 16 }}>
            <Link href="/signup" className="hp-btn-primary">
              Get started free
            </Link>
            <Link href="/login" className="hp-btn-secondary">
              Sign in
            </Link>
          </div>

          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
              fontFamily: 'var(--font-nunito)',
            }}
          >
            Free to start. No credit card needed.
          </p>
        </div>
      </section>

      {/* ── 2. BENTO GRID ───────────────────────────────────────────────── */}
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
              fontFamily: 'var(--font-nunito)',
              textTransform: 'uppercase',
            }}
          >
            Everything your house needs
          </p>

          {/* Row 1: Chores (2/3) + Grocery (1/3) */}
          <div className="hp-bento-row-a">
            {/* Chores — tall with mockup */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: `4px solid ${C.chores.dark}`,
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
                    backgroundColor: `${C.chores.base}1F`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <CheckSquare size={18} color={C.chores.base} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                  Chores
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
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
                borderBottom: `4px solid ${C.grocery.dark}`,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${C.grocery.base}1F`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <ShoppingCart size={18} color={C.grocery.base} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                Grocery
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
                One list everyone adds to. No more &ldquo;I thought you got the milk.&rdquo;
              </p>
            </div>
          </div>

          {/* Row 2: Expenses (1/3) + Meals (2/3) */}
          <div className="hp-bento-row-b">
            {/* Expenses — small */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: `4px solid ${C.expenses.dark}`,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${C.expenses.base}1F`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <DollarSign size={18} color={C.expenses.base} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                Expenses
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
                Split bills three ways, scan a receipt, settle up. No spreadsheets.
              </p>
            </div>

            {/* Meals — tall with mockup */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: `4px solid ${C.meals.dark}`,
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
                    backgroundColor: `${C.meals.base}1F`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <UtensilsCrossed size={18} color={C.meals.base} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                  Meals
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
                  Plan the week, vote on dinners, push ingredients straight to your grocery list.
                </p>
              </div>
              <MealsMockup />
            </div>
          </div>

          {/* Row 3: Calendar (1/2) + Reminders (1/2) */}
          <div className="hp-bento-row-c">
            {/* Calendar */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: `4px solid ${C.calendar.dark}`,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${C.calendar.base}1F`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <CalendarDays size={18} color={C.calendar.base} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                Calendar
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
                Household events everyone can see. School pickups, dentist, game night.
              </p>
            </div>

            {/* Reminders */}
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                borderBottom: `4px solid ${C.reminders.dark}`,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${C.reminders.base}1F`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Bell size={18} color={C.reminders.base} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-nunito)' }}>
                Reminders
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-nunito)' }}>
                Nag the right people at the right time, so you don&apos;t have to.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. COMPARISON TABLE ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#F9FAFB', padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#9CA3AF',
                marginBottom: 12,
                fontFamily: 'var(--font-nunito)',
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
                margin: 0,
                fontFamily: 'var(--font-nunito)',
              }}
            >
              Everything they don&apos;t have. Nothing you don&apos;t need.
            </h2>
          </div>

          {/* Table card */}
          <div
            className="hp-comp-table"
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              border: '1.5px solid #E5E7EB',
              borderBottom: `4px solid ${C.chores.base}`,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '14px 18px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#6B7280',
                      fontFamily: 'var(--font-nunito)',
                      borderBottom: '1.5px solid #E5E7EB',
                      width: '40%',
                    }}
                  >
                    Feature
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 900,
                      color: C.chores.base,
                      fontFamily: 'var(--font-nunito)',
                      borderBottom: '1.5px solid #E5E7EB',
                      backgroundColor: `${C.chores.base}0D`,
                    }}
                  >
                    Roost
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#6B7280',
                      fontFamily: 'var(--font-nunito)',
                      borderBottom: '1.5px solid #E5E7EB',
                    }}
                  >
                    Splitwise
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#6B7280',
                      fontFamily: 'var(--font-nunito)',
                      borderBottom: '1.5px solid #E5E7EB',
                    }}
                  >
                    Cozi
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#6B7280',
                      fontFamily: 'var(--font-nunito)',
                      borderBottom: '1.5px solid #E5E7EB',
                    }}
                  >
                    OurHome
                  </th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row, i) => (
                  <tr key={row.feature}>
                    <td
                      style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#374151',
                        fontFamily: 'var(--font-nunito)',
                        borderBottom: i < compRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      {row.feature}
                    </td>
                    <td
                      style={{
                        padding: '12px 18px',
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: cellWeight(row.roost),
                        color: cellColor(row.roost),
                        fontFamily: 'var(--font-nunito)',
                        borderBottom: i < compRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                        backgroundColor: `${C.chores.base}06`,
                      }}
                    >
                      {row.roost}
                    </td>
                    <td
                      style={{
                        padding: '12px 18px',
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: cellWeight(row.splitwise),
                        color: cellColor(row.splitwise),
                        fontFamily: 'var(--font-nunito)',
                        borderBottom: i < compRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      {row.splitwise}
                    </td>
                    <td
                      style={{
                        padding: '12px 18px',
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: cellWeight(row.cozi),
                        color: cellColor(row.cozi),
                        fontFamily: 'var(--font-nunito)',
                        borderBottom: i < compRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      {row.cozi}
                    </td>
                    <td
                      style={{
                        padding: '12px 18px',
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: cellWeight(row.ourHome),
                        color: cellColor(row.ourHome),
                        fontFamily: 'var(--font-nunito)',
                        borderBottom: i < compRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      {row.ourHome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. BOTTOM CTA ───────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: C.chores.base,
          padding: '80px 40px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.8px',
            margin: '0 0 12px',
            fontFamily: 'var(--font-nunito)',
          }}
          className="hp-cta-h2"
        >
          Your house runs better. Starting today.
        </h2>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 32px',
            fontFamily: 'var(--font-nunito)',
          }}
        >
          Free to start. $4/month when you&apos;re ready for more.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            backgroundColor: '#fff',
            color: C.chores.base,
            fontWeight: 800,
            fontSize: 15,
            padding: '16px 36px',
            borderRadius: 12,
            border: 'none',
            borderBottom: `3px solid ${C.chores.dark}`,
            textDecoration: 'none',
            fontFamily: 'var(--font-nunito)',
          }}
        >
          Get started free
        </Link>
      </section>

      {/* ── 5. FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#111827', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="hp-footer-inner">
            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.5px',
                fontFamily: 'var(--font-nunito)',
              }}
            >
              Roost
            </span>
            <div className="hp-footer-links">
              <Link
                href="/privacy"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6B7280',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-nunito)',
                }}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6B7280',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-nunito)',
                }}
              >
                Terms
              </Link>
            </div>
          </div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#4B5563',
              textAlign: 'center',
              margin: '20px 0 0',
              fontFamily: 'var(--font-nunito)',
            }}
          >
            &copy; 2026 Roost. Built for families and roommates who share a home.
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 640px) {
          .hp-h1 { font-size: 36px !important; }
          .hp-tagline { font-size: 16px !important; }
          .hp-logo { width: 72px !important; height: 72px !important; }
          .hp-cta-h2 { font-size: 28px !important; }
        }
      `}</style>
    </>
  )
}
