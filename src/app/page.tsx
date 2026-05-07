import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Bell, CalendarDays, CheckSquare, DollarSign, GraduationCap, Home, ShoppingCart, Users, UtensilsCrossed } from 'lucide-react';
import StructuredDataScript from '@/components/marketing/StructuredDataScript';
import { auth } from '@/lib/auth';
import { ROOST_ICON_SRC } from '@/lib/brand';
import { homepageResourceLinks } from '@/lib/seo-content';
import { buildPublicMetadata, getHomepageJsonLd } from '@/lib/seo';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = buildPublicMetadata({
  title: 'Household Management App for Families and Roommates',
  description:
    'Roost is a household management app for families and roommates with chores, grocery lists, bill splitting, reminders, meal planning, allowances, and a shared calendar.',
  path: '/',
  keywords: [
    'household management app',
    'family organizer app',
    'roommate app',
    'shared grocery list app',
    'roommate chore app',
    'split bills for roommates',
  ],
});

const homepageFaqs = [
  {
    question: 'What is Roost?',
    answer:
      'Roost is a household management app for families and roommates that combines chores, grocery lists, bills, reminders, calendars, meals, and allowances in one place.',
  },
  {
    question: 'Is Roost for roommates or families?',
    answer:
      'Both. Roost is designed for shared homes, so it fits roommates, families, college houses, and other households that need a shared operating system.',
  },
  {
    question: 'Why not just use separate apps for chores, groceries, and bills?',
    answer:
      'Separate apps create more switching, more missed handoffs, and more household context trapped in different tools. Roost keeps those workflows connected in one place.',
  },
];


function ChoresMockup() {
  const items = [
    { name: 'Take out trash', detail: '7 day streak', checked: true },
    { name: 'Unload dishwasher', detail: '3 day streak', checked: true },
    { name: 'Wipe counters', detail: '12 day streak', checked: true },
    { name: 'Vacuum living room', detail: 'Alex', checked: false },
    { name: 'Clean bathroom', detail: 'Jordan', checked: false },
  ];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #fecaca',
        borderBottom: '4px solid #EF4444',
        padding: 16,
        maxWidth: 300,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
          Today&apos;s chores
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>
          3 of 5 done
        </span>
      </div>
      {items.map((item) => (
        <div
          key={item.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 0',
            borderBottom: '1px solid #fef2f2',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: item.checked ? '#EF4444' : 'transparent',
              border: item.checked ? 'none' : '2px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.checked && (
              <span
                style={{
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                &#10003;
              </span>
            )}
          </div>
          <span
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              color: item.checked ? '#9CA3AF' : '#374151',
              textDecoration: item.checked ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: item.checked ? '#EF4444' : '#9CA3AF',
            }}
          >
            {item.detail}
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 12,
          height: 8,
          backgroundColor: '#fef2f2',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '72%',
            height: '100%',
            backgroundColor: '#EF4444',
            borderRadius: 99,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>
          Alex leading with 72 pts
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>
          Week resets Sun
        </span>
      </div>
    </div>
  );
}

function MealsMockup() {
  const days = [
    { day: 'MON', meal: 'Spaghetti carbonara', votes: '3 votes', empty: false },
    { day: 'TUE', meal: 'Chicken tacos', votes: '2 votes', empty: false },
    { day: 'WED', meal: 'Stir fry + rice', votes: '1 vote', empty: false },
    { day: 'THU', meal: 'No plan yet', votes: '', empty: true },
    { day: 'FRI', meal: 'Pizza night', votes: '5 votes', empty: false },
  ];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #fed7aa',
        borderBottom: '4px solid #EA580C',
        padding: 16,
        maxWidth: 300,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
          This week&apos;s meals
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#EA580C' }}>
          Tap to add to list
        </span>
      </div>
      {days.map((d) => (
        <div
          key={d.day}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 0',
            borderBottom: '1px solid #fff7ed',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: '#EA580C',
              minWidth: 26,
              flexShrink: 0,
            }}
          >
            {d.day}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              color: d.empty ? '#9CA3AF' : '#374151',
              fontStyle: d.empty ? 'italic' : 'normal',
            }}
          >
            {d.meal}
          </span>
          {!d.empty && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#EA580C',
                flexShrink: 0,
              }}
            >
              {d.votes}
            </span>
          )}
        </div>
      ))}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          gap: 5,
          flexWrap: 'wrap' as const,
        }}
      >
        {['Alex voted', 'Sam voted', 'Jordan voted'].map((v) => (
          <span
            key={v}
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#EA580C',
              backgroundColor: '#fff7ed',
              padding: '2px 8px',
              borderRadius: 99,
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

const TABLE_ROWS = [
  {
    feature: 'Chores + assignment',
    roost: 'check',
    split: 'cross',
    cozi: 'check',
    ourhome: 'check',
  },
  {
    feature: 'Chore streaks + leaderboard',
    roost: 'check',
    split: 'cross',
    cozi: 'cross',
    ourhome: 'Basic',
  },
  {
    feature: 'Bill splitting + debt tracking',
    roost: 'check',
    split: 'check',
    cozi: 'cross',
    ourhome: 'cross',
  },
  {
    feature: 'Receipt scanning (item split)',
    roost: 'check',
    split: 'Paid',
    cozi: 'cross',
    ourhome: 'cross',
  },
  {
    feature: 'Shared grocery lists',
    roost: 'check',
    split: 'cross',
    cozi: 'check',
    ourhome: 'check',
  },
  {
    feature: 'Multiple grocery lists',
    roost: 'check',
    split: 'cross',
    cozi: 'cross',
    ourhome: 'cross',
  },
  {
    feature: 'Shared household calendar',
    roost: 'check',
    split: 'cross',
    cozi: 'check',
    ourhome: 'Basic',
  },
  {
    feature: 'Reminders (recurring)',
    roost: 'check',
    split: 'cross',
    cozi: 'Basic',
    ourhome: 'check',
  },
  {
    feature: 'Meal planning + voting',
    roost: 'check',
    split: 'cross',
    cozi: 'Basic',
    ourhome: 'cross',
  },
  {
    feature: 'Child accounts + allowances',
    roost: 'check',
    split: 'cross',
    cozi: 'cross',
    ourhome: 'Basic',
  },
  {
    feature: 'Spending insights + budgets',
    roost: 'check',
    split: 'Paid',
    cozi: 'cross',
    ourhome: 'cross',
  },
  {
    feature: 'Notes + household tasks',
    roost: 'check',
    split: 'cross',
    cozi: 'cross',
    ourhome: 'Basic',
  },
  {
    feature: 'iOS + Android app',
    roost: 'Soon',
    split: 'check',
    cozi: 'check',
    ourhome: 'check',
  },
];

function CellValue({ value }: { value: string }) {
  if (value === 'check')
    return (
      <span style={{ color: '#16A34A', fontWeight: 800, fontSize: 15 }}>
        &#10003;
      </span>
    );
  if (value === 'cross')
    return (
      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>
        &#10007;
      </span>
    );
  if (value === 'Soon')
    return (
      <span style={{ color: '#D97706', fontWeight: 800, fontSize: 11 }}>
        Soon
      </span>
    );
  if (value === 'Paid')
    return (
      <span style={{ color: '#D97706', fontWeight: 800, fontSize: 11 }}>
        Paid
      </span>
    );
  if (value === 'Basic')
    return (
      <span style={{ color: '#D97706', fontWeight: 700, fontSize: 11 }}>
        Basic
      </span>
    );
  return (
    <span style={{ color: '#9CA3AF', fontWeight: 600, fontSize: 12 }}>
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/dashboard');
  }

  const ff = nunito.style.fontFamily;
  const brandBg = '#B91C1C';
  const brandAccent = '#EF4444';
  const brandTint = '#FFF1F2';

  return (
    <>
      {getHomepageJsonLd().map((item, index) => (
        <StructuredDataScript key={index} data={item} />
      ))}
      <StructuredDataScript
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: homepageFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }}
      />
      <main
        style={{
          fontFamily: ff,
          margin: 0,
          padding: 0,
          backgroundColor: brandBg,
        }}
      >
      <style>{`
        .landing-nav {
          background: ${brandBg};
          min-height: 72px;
          padding: 12px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .landing-brand {
          display: flex;
          align-items: center;
          text-decoration: none;
          min-width: 0;
          flex-shrink: 1;
        }
        .landing-brand-mark {
          font-weight: 900;
          font-size: 30px;
          color: white;
          letter-spacing: -0.3px;
          line-height: 1;
          white-space: nowrap;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
          flex-wrap: nowrap;
          flex-shrink: 0;
        }
        .landing-nav-link {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.86);
          text-decoration: none;
          white-space: nowrap;
        }
        .landing-nav-cta {
          background: white;
          color: ${brandBg};
          font-weight: 800;
          font-size: 13px;
          padding: 8px 18px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(127, 29, 29, 0.22);
          white-space: nowrap;
        }
        .hero-actions, .cta-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }
        .hero-primary, .cta-primary {
          background: white;
          color: ${brandBg};
          font-weight: 800;
          font-size: 15px;
          padding: 12px 28px;
          border-radius: 999px;
          text-decoration: none;
          border-bottom: 3px solid rgba(0,0,0,0.12);
          box-shadow: 0 12px 28px rgba(127, 29, 29, 0.2);
        }
        .hero-secondary, .cta-secondary {
          background: rgba(255,255,255,0.08);
          color: white;
          font-weight: 700;
          font-size: 15px;
          padding: 12px 28px;
          border-radius: 999px;
          text-decoration: none;
          border: 2px solid rgba(252, 165, 165, 0.65);
        }
        .feat-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          min-height: 300px;
        }
        .feat-copy { flex: 1; padding: 48px 44px; }
        .feat-ui {
          flex: 1; padding: 32px;
          display: flex; align-items: center; justify-content: center;
        }
        .feat-ui-left .feat-copy { order: 2; }
        .feat-ui-left .feat-ui { order: 1; }
        @media (max-width: 640px) {
          .landing-nav {
            padding: 12px 16px !important;
            min-height: 0 !important;
            gap: 16px !important;
          }
          .landing-brand {
            max-width: none;
            flex: 1 1 auto;
          }
          .landing-brand-mark {
            font-size: 22px !important;
            letter-spacing: -0.5px !important;
          }
          .landing-nav-actions {
            gap: 12px !important;
            flex: 0 0 auto;
          }
          .landing-nav-link {
            font-size: 12px !important;
          }
          .landing-nav-cta {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          .nav-features { display: none !important; }
          .feat-inner { flex-direction: column; }
          .feat-copy { order: 1 !important; padding: 32px 20px 16px; width: 100%; box-sizing: border-box; }
          .feat-ui { order: 2 !important; padding: 16px 20px 32px; width: 100%; box-sizing: border-box; }
          .hero-copy { max-width: 320px !important; margin-bottom: 24px !important; }
          .hero-actions, .cta-actions {
            flex-direction: column;
            align-items: center;
          }
          .hero-primary, .hero-secondary, .cta-primary, .cta-secondary {
            width: min(100%, 280px);
            text-align: center;
            box-sizing: border-box;
          }
          .problem-section { padding: 48px 20px !important; }
          .comp-section { padding: 48px 16px !important; }
          .comp-grid { border-radius: 10px !important; }
          .comp-feat { font-size: 11px !important; padding: 8px 10px !important; }
          .comp-val { font-size: 11px !important; padding: 8px 5px !important; }
          .personas-section { padding: 48px 20px !important; }
          .personas-grid { grid-template-columns: 1fr !important; }
          .cta-section { padding: 52px 20px !important; }
          .footer-inner { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 12px !important; }
          .footer-links { gap: 12px !important; flex-wrap: wrap; justify-content: center; }
          .teaser-bar {
            padding: 10px 16px !important;
            flex-direction: column !important;
            gap: 6px !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* 1. NAV */}
      <nav className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="landing-brand-mark" style={{ fontFamily: ff }}>
            Roost
          </span>
        </Link>
        <div className="landing-nav-actions">
          <a
            href="#features"
            className="nav-features landing-nav-link"
            style={{ fontFamily: ff }}
          >
            Features
          </a>
          <Link
            href="/login"
            className="landing-nav-link"
            style={{ fontFamily: ff }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="landing-nav-cta"
            style={{ fontFamily: ff }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* 2. TEASER BAR */}
      <div
        className="teaser-bar"
        style={{
          backgroundColor: brandAccent,
          padding: '10px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            backgroundColor: 'rgba(255,255,255,0.18)',
            color: 'white',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 99,
            fontFamily: ff,
          }}
        >
          COMING SOON
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: ff,
          }}
        >
          iOS and Android apps are on the way
        </span>
      </div>

      {/* 3.  HERO */}
      <section
        className="hero-section px-6 pt-10 pb-13 md:px-10 md:pt-16 md:pb-18 text-center"
        style={{ backgroundColor: brandBg }}
      >
        <Image
          src={ROOST_ICON_SRC}
          alt="Roost"
          width={120}
          height={120}
          className="block mx-auto mb-4 md:mb-5 w-18 h-18 md:w-30 md:h-30 rounded-[20px] md:rounded-[32px]"
          priority
          sizes="(max-width: 768px) 72px, 120px"
        />

        <p
          className="text-[44px] md:text-[56px] font-black"
          style={{
            color: 'white',
            letterSpacing: '-1.5px',
            lineHeight: 1,
            maxWidth: 600,
            margin: '0 auto 16px',
            fontFamily: ff,
          }}
        >
          Roost
        </p>
        <h1
          className="hero-h1 text-[28px] md:text-[40px] font-black"
          style={{
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1.06,
            maxWidth: 760,
            margin: '0 auto 16px',
            fontFamily: ff,
          }}
        >
          One App, Zero Excuses
        </h1>
        <p
          className="hero-copy text-[14px] md:text-[16px]"
          style={{
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6,
            maxWidth: 700,
            margin: '0 auto 30px',
            fontFamily: ff,
          }}
        >
          Chores. Groceries. Bills. Meals. One place, everyone on the same page.
        </p>
        <div className="hero-actions">
          <Link
            href="/signup"
            className="hero-primary"
            style={{ fontFamily: ff }}
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="hero-secondary"
            style={{ fontFamily: ff }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* bento grid goes here (Task 4) */}

      {/* 6. COMPARISON TABLE */}
      <section
        className="comp-section"
        style={{ backgroundColor: brandTint, padding: '56px 40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
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
        </div>
        <div
          className="comp-grid"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1.5px solid #FECACA',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            }}
          >
            <div
              className="comp-feat"
              style={{
                backgroundColor: '#f9fafb',
                padding: '12px 16px',
                borderBottom: '1px solid #FECACA',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#666',
                  fontFamily: ff,
                }}
              >
                Feature
              </span>
            </div>
            <div
              className="comp-val"
              style={{
                backgroundColor: brandBg,
                padding: '12px 8px',
                textAlign: 'center',
                borderBottom: '1px solid #991B1B',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'white',
                  fontFamily: ff,
                }}
              >
                Roost
              </span>
            </div>
            {['Splitwise', 'Cozi', 'OurHome'].map((h) => (
              <div
                key={h}
                className="comp-val"
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '12px 8px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#888',
                    fontFamily: ff,
                  }}
                >
                  {h}
                </span>
              </div>
            ))}
          </div>
          {TABLE_ROWS.map((row, i) => (
            <div
              key={row.feature}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
              }}
            >
              <div
                className="comp-feat"
                style={{
                  padding: '11px 16px',
                  borderBottom: '1px solid #fef2f2',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a1a1a',
                    fontFamily: ff,
                  }}
                >
                  {row.feature}
                </span>
              </div>
              <div
                className="comp-val"
                style={{
                  padding: '11px 8px',
                  textAlign: 'center',
                  backgroundColor: '#FFE4E6',
                  borderBottom: '1px solid rgba(239,68,68,0.1)',
                }}
              >
                <CellValue value={row.roost} />
              </div>
              <div
                className="comp-val"
                style={{
                  padding: '11px 8px',
                  textAlign: 'center',
                  borderBottom: '1px solid #fef2f2',
                }}
              >
                <CellValue value={row.split} />
              </div>
              <div
                className="comp-val"
                style={{
                  padding: '11px 8px',
                  textAlign: 'center',
                  borderBottom: '1px solid #fef2f2',
                }}
              >
                <CellValue value={row.cozi} />
              </div>
              <div
                className="comp-val"
                style={{
                  padding: '11px 8px',
                  textAlign: 'center',
                  borderBottom: '1px solid #fef2f2',
                }}
              >
                <CellValue value={row.ourhome} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WHO IS IT FOR */}
      <section
        className="personas-section"
        style={{
          backgroundColor: 'white',
          padding: '56px 40px',
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#1a1a1a',
            letterSpacing: '-0.7px',
            textAlign: 'center',
            margin: '0 0 28px',
            fontFamily: ff,
          }}
        >
          Built for any household
        </h2>
        <div
          className="personas-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            maxWidth: 880,
            margin: '0 auto',
          }}
        >
          {[
            {
              Icon: Users,
              title: 'Families',
              body: 'Manage chores, allowances, and a shared calendar that the whole family can see, kids earn their allowance, parents keep their sanity.',
            },
            {
              Icon: Home,
              title: 'Roommates',
              body: 'Split rent, utilities, and groceries without the awkward texts, everyone sees what they owe and nobody gets to pretend they forgot about the electric bill.',
            },
            {
              Icon: GraduationCap,
              title: 'College houses',
              body: 'Five people, one fridge, and nobody wants to be the house manager, Roost handles the boring stuff so you can handle everything else.',
            },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              style={{
                borderRadius: 16,
                border: '1.5px solid #e5e7eb',
                borderBottom: `4px solid ${brandAccent}`,
                padding: 20,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: brandTint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Icon size={20} color={brandAccent} />
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  marginBottom: 6,
                  fontFamily: ff,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#666',
                  lineHeight: 1.55,
                  fontFamily: ff,
                }}
              >
                {body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          backgroundColor: '#FFF7F7',
          padding: '56px 40px',
          borderTop: '1px solid #FEE2E2',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#1a1a1a',
              letterSpacing: '-0.7px',
              margin: '0 0 10px',
              textAlign: 'center',
              fontFamily: ff,
            }}
          >
            Explore Roost by use case
          </h2>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#666',
              margin: '0 auto 24px',
              maxWidth: 760,
              textAlign: 'center',
              lineHeight: 1.7,
              fontFamily: ff,
            }}
          >
            These pages are built around the problems people actually search
            for, from roommate chores and shared grocery lists to family
            organization and allowances.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              maxWidth: 880,
              margin: '0 auto',
            }}
          >
            {homepageResourceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'block',
                  borderRadius: 18,
                  border: '1.5px solid #FECACA',
                  borderBottom: `4px solid ${brandAccent}`,
                  backgroundColor: 'white',
                  padding: 20,
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    color: '#1a1a1a',
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    marginBottom: 8,
                    fontFamily: ff,
                  }}
                >
                  {link.label}
                </div>
                <div
                  style={{
                    color: '#666',
                    fontSize: 14,
                    lineHeight: 1.65,
                    fontWeight: 600,
                    fontFamily: ff,
                  }}
                >
                  {link.description}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          backgroundColor: 'white',
          padding: '56px 40px',
          borderTop: '1px solid #F3F4F6',
        }}
      >
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#1a1a1a',
              letterSpacing: '-0.7px',
              margin: '0 0 22px',
              textAlign: 'center',
              fontFamily: ff,
            }}
          >
            Frequently asked questions
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {homepageFaqs.map((faq) => (
              <details
                key={faq.question}
                style={{
                  border: '1.5px solid #FECACA',
                  borderRadius: 16,
                  padding: '16px 18px',
                  backgroundColor: '#FFF7F7',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    color: '#7F1D1D',
                    fontWeight: 800,
                    lineHeight: 1.5,
                    fontFamily: ff,
                  }}
                >
                  {faq.question}
                </summary>
                <p
                  style={{
                    margin: '12px 0 0',
                    color: '#4B5563',
                    fontSize: 15,
                    lineHeight: 1.75,
                    fontWeight: 600,
                    fontFamily: ff,
                  }}
                >
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. BOTTOM CTA */}
      <section
        className="cta-section"
        style={{
          backgroundColor: brandBg,
          padding: '72px 40px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.8px',
            margin: '0 0 10px',
            fontFamily: ff,
          }}
        >
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
        <div className="cta-actions">
          <Link
            href="/signup"
            className="cta-primary"
            style={{ fontFamily: ff }}
          >
            Create your household
          </Link>
          <Link
            href="/login"
            className="cta-secondary"
            style={{ fontFamily: ff }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer
        style={{
          backgroundColor: brandBg,
          padding: '28px 40px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <div
          className="footer-inner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <Image
              src={ROOST_ICON_SRC}
              alt="Roost"
              width={28}
              height={28}
              sizes="28px"
              style={{ borderRadius: 8, objectFit: 'cover', width: 28, height: 'auto' }}
            />
            <span
              style={{
                fontWeight: 900,
                color: 'white',
                fontSize: 15,
                fontFamily: ff,
              }}
            >
              Roost
            </span>
          </Link>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: ff,
            }}
          >
            Homes run better with Roost.
          </span>
          <div className="footer-links" style={{ display: 'flex', gap: 20 }}>
            <Link
              href="/login"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontFamily: ff,
              }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontFamily: ff,
              }}
            >
              Sign up
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontFamily: ff,
              }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontFamily: ff,
              }}
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
      </main>
    </>
  );
}
