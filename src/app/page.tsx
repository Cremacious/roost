import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Bell, GraduationCap, Home, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { ROOST_ICON_SRC } from '@/lib/brand';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Roost - Homes run better with Roost.',
  description:
    'The household app for families and roommates. Chores, groceries, bills, meals, reminders, and a shared calendar. One app.',
};

// ---------------------------------------------------------------------------
// Mockup components (decorative static UI previews)
// ---------------------------------------------------------------------------

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

function GroceryMockup() {
  const items = [
    { name: 'Milk (2 gallons)', person: 'Sam', checked: true },
    { name: 'Eggs', person: 'Alex', checked: true },
    { name: 'Chicken breast', person: 'Sam', checked: false },
    { name: 'Pasta (3 boxes)', person: 'Jordan', checked: false },
    { name: 'Dish soap', person: 'Alex', checked: false },
    { name: 'Paper towels', person: 'Jordan', checked: false },
  ];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #fde68a',
        borderBottom: '4px solid #D97706',
        padding: 16,
        maxWidth: 300,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 12,
          flexWrap: 'wrap' as const,
        }}
      >
        {['Weekly Shop', 'Costco Run', 'Target'].map((tab, i) => (
          <span
            key={tab}
            style={{
              fontSize: 11,
              fontWeight: i === 0 ? 800 : 700,
              backgroundColor: i === 0 ? '#D97706' : '#fef3c7',
              color: i === 0 ? 'white' : '#92400e',
              padding: '4px 10px',
              borderRadius: 99,
            }}
          >
            {tab}
          </span>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 0',
            borderBottom: '1px solid #fef3c7',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              backgroundColor: item.checked ? '#D97706' : 'transparent',
              border: item.checked ? 'none' : '1.5px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.checked && (
              <span style={{ color: 'white', fontSize: 9, fontWeight: 900 }}>
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
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '2px 7px',
              borderRadius: 99,
            }}
          >
            {item.person}
          </span>
        </div>
      ))}
    </div>
  );
}

function CalendarMockup() {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const row1: (number | string)[] = ['', '', '', 1, 2, 3, 4];
  const row2 = [5, 6, 7, 8, 9, 10, 11];
  const dotsRow2 = [7, 8, 10, 11];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #bfdbfe',
        borderBottom: '4px solid #2563EB',
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
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>
          April 2026
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF' }}>
          4 events this week
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: 2,
        }}
      >
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#9CA3AF',
              paddingBottom: 3,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: 2,
        }}
      >
        {row1.map((d, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: d ? '#374151' : 'transparent',
              }}
            >
              {d || ''}
            </div>
            {[3, 4].includes(d as number) ? (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                }}
              />
            ) : (
              <div style={{ width: 4, height: 4 }} />
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: 10,
        }}
      >
        {row2.map((d) => (
          <div
            key={d}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: d === 10 ? 900 : 600,
                color: d === 10 ? 'white' : '#374151',
                backgroundColor: d === 10 ? '#2563EB' : 'transparent',
              }}
            >
              {d}
            </div>
            {dotsRow2.includes(d) ? (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                }}
              />
            ) : (
              <div style={{ width: 4, height: 4 }} />
            )}
          </div>
        ))}
      </div>
      {[
        { color: '#EF4444', name: 'Alex dentist appt', time: '9am' },
        { color: '#16A34A', name: 'Rent due', time: '1st' },
        { color: '#D97706', name: 'Sam&apos;s game night', time: '7pm' },
      ].map((ev) => (
        <div
          key={ev.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            backgroundColor: '#EFF6FF',
            borderRadius: 8,
            marginBottom: 5,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: ev.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1e40af' }}
          >
            {ev.name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>
            {ev.time}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExpensesMockup() {
  const expenses = [
    {
      icon: 'G',
      iconBg: '#f0fdf4',
      iconColor: '#16A34A',
      name: 'Grocery run',
      sub: 'Split 3 ways',
      amount: '$84.20',
      status: 'You owe $28.07',
      statusColor: '#dc2626',
      statusBg: '#fff1f2',
    },
    {
      icon: 'E',
      iconBg: '#fefce8',
      iconColor: '#D97706',
      name: 'Electric bill',
      sub: 'Split equally',
      amount: '$127.50',
      status: 'Settled',
      statusColor: '#16A34A',
      statusBg: '#f0fdf4',
    },
    {
      icon: 'P',
      iconBg: '#fff7ed',
      iconColor: '#ea580c',
      name: 'Pizza Friday',
      sub: 'Item split',
      amount: '$56.00',
      status: 'Jordan owes $18',
      statusColor: '#dc2626',
      statusBg: '#fff1f2',
    },
  ];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #bbf7d0',
        borderBottom: '4px solid #16A34A',
        padding: 16,
        maxWidth: 300,
        width: '100%',
      }}
    >
      {expenses.map((e) => (
        <div
          key={e.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 0',
            borderBottom: '1px solid #f0fdf4',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: e.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900, color: e.iconColor }}>
              {e.icon}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
              {e.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
              {e.sub}
            </div>
          </div>
          <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
              {e.amount}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: e.statusColor,
                backgroundColor: e.statusBg,
                padding: '1px 6px',
                borderRadius: 99,
                whiteSpace: 'nowrap' as const,
              }}
            >
              {e.status}
            </div>
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 10,
          backgroundColor: '#f0fdf4',
          borderRadius: 10,
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A' }}>
            $46.14
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF' }}>
            You&apos;re owed
          </div>
        </div>
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>
            $28.07
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF' }}>
            You owe
          </div>
        </div>
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A' }}>
            $312
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF' }}>
            This month
          </div>
        </div>
      </div>
    </div>
  );
}

function RemindersMockup() {
  const reminders = [
    {
      name: 'Pay rent',
      sub: '1st of every month',
      badge: 'Household',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
    },
    {
      name: 'Change AC filter',
      sub: 'Every 3 months',
      badge: 'Recurring',
      badgeBg: '#ecfeff',
      badgeColor: '#0891B2',
    },
    {
      name: 'Water plants',
      sub: 'Every Sunday',
      badge: 'Recurring',
      badgeBg: '#ecfeff',
      badgeColor: '#0891B2',
    },
    {
      name: 'Trash day',
      sub: 'Every Tuesday',
      badge: 'Household',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
    },
  ];
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #a5f3fc',
        borderBottom: '4px solid #0891B2',
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
          Active reminders
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#0891B2' }}>
          5 set
        </span>
      </div>
      {reminders.map((r) => (
        <div
          key={r.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '8px 0',
            borderBottom: '1px solid #ecfeff',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: '#ecfeff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={13} color="#0891B2" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
              {r.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
              {r.sub}
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              backgroundColor: r.badgeBg,
              color: r.badgeColor,
              padding: '2px 7px',
              borderRadius: 99,
              flexShrink: 0,
            }}
          >
            {r.badge}
          </span>
        </div>
      ))}
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

function AllowancesMockup() {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: '1.5px solid #ddd6fe',
        borderBottom: '4px solid #7C3AED',
        padding: 16,
        maxWidth: 300,
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: '#7C3AED',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
          marginBottom: 12,
        }}
      >
        Weekly allowances
      </div>
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 900, color: '#7C3AED' }}>
              EJ
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
              Ethan Jr
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
              Earned{' '}
              <span style={{ color: '#7C3AED', fontWeight: 700 }}>$4.50</span>{' '}
              of $5.00
            </div>
          </div>
        </div>
        <div
          style={{
            height: 6,
            backgroundColor: '#ede9fe',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: '90%',
              height: '100%',
              backgroundColor: '#7C3AED',
              borderRadius: 99,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>
            90% chores done
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>
            1 chore left
          </span>
        </div>
      </div>
      <div
        style={{ height: 1, backgroundColor: '#ede9fe', margin: '10px 0' }}
      />
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#fce7f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 900, color: '#BE185D' }}>
              LS
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
              Lily S
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
              Earned{' '}
              <span style={{ color: '#BE185D', fontWeight: 700 }}>$2.50</span>{' '}
              of $5.00
            </div>
          </div>
        </div>
        <div
          style={{
            height: 6,
            backgroundColor: '#fce7f3',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: '50%',
              height: '100%',
              backgroundColor: '#BE185D',
              borderRadius: 99,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#BE185D' }}>
            50% done
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#BE185D' }}>
            5 chores left
          </span>
        </div>
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
          .hero-section { padding: 40px 20px 52px !important; }
          .hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
          .hero-copy { font-size: 15px !important; max-width: 320px !important; margin-bottom: 24px !important; }
          .hero-logo {
            width: 180px !important;
            height: 180px !important;
            margin-bottom: -8px !important;
          }
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
        className="hero-section"
        style={{
          backgroundColor: brandBg,
          padding: '64px 40px 72px',
          textAlign: 'center',
        }}
      >
        <Image
          src={ROOST_ICON_SRC}
          alt="Roost"
          width={220}
          height={220}
          className="hero-logo"
          style={{ display: 'block', margin: '0 auto -12px' }}
        />

        <h1
          className="hero-h1"
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-1.5px',
            lineHeight: 1,
            maxWidth: 600,
            margin: '0 auto 16px',
            fontFamily: ff,
          }}
        >
          Roost
        </h1>
        <h1
          className="hero-h1"
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-1.5px',
            lineHeight: 1.06,
            maxWidth: 600,
            margin: '0 auto 16px',
            fontFamily: ff,
          }}
        >
          One app. Zero excuses.
        </h1>
        <p
          className="hero-copy"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6,
            maxWidth: 420,
            margin: '0 auto 30px',
            fontFamily: ff,
          }}
        >
          One app for chores, groceries, bills, meals, and everything in
          between.
        </p>
        <div className="hero-actions">
          <Link
            href="/signup"
            className="hero-primary"
            style={{ fontFamily: ff }}
          >
            Create your household
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

      {/* 4. PROBLEM */}
      <section
        className="problem-section"
        style={{
          backgroundColor: brandTint,
          padding: '64px 40px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: brandAccent,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 12,
            fontFamily: ff,
          }}
        >
          Sound familiar?
        </div>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: '#1a1a1a',
            letterSpacing: '-0.8px',
            lineHeight: 1.2,
            maxWidth: 560,
            margin: '0 auto 14px',
            fontFamily: ff,
          }}
        >
          Your household runs on five apps, a whiteboard, and a prayer.
        </h2>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#666',
            lineHeight: 1.7,
            maxWidth: 520,
            margin: '0 auto 24px',
            fontFamily: ff,
          }}
        >
          One app for splitting bills, another for the grocery list nobody
          updates, a shared calendar three people ignore, and a group chat full
          of did anyone do the dishes messages.
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#666',
            marginBottom: 14,
            fontFamily: ff,
          }}
        >
          All of that becomes a thing of the past.
        </p>
      </section>

      {/* 5. FEATURES */}
      <div id="features">
        {/* CHORES: copy LEFT, UI RIGHT */}
        <section style={{ backgroundColor: '#FFF5F5' }}>
          <div className="feat-inner">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#EF4444',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Chores
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                Nobody can pretend they forgot.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Assign chores to specific people, set them on a recurring
                schedule, and let Roost reset them automatically, daily dishes,
                weekly vacuuming, monthly deep cleans, set it once and let the
                leaderboard add just enough competition to get everyone off the
                couch.
              </p>
            </div>
            <div className="feat-ui">
              <ChoresMockup />
            </div>
          </div>
        </section>

        {/* GROCERY: UI LEFT, copy RIGHT */}
        <section style={{ backgroundColor: '#FFFBF0' }}>
          <div className="feat-inner feat-ui-left">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#D97706',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Grocery lists
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                The list that everyone can actually find.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Create multiple lists for different stores and trips, add items
                from anywhere, and see who put what in the cart, no more buying
                three bottles of dish soap because nobody checked the list, and
                no more can you grab milk texts because the list is right there.
              </p>
            </div>
            <div className="feat-ui">
              <GroceryMockup />
            </div>
          </div>
        </section>

        {/* CALENDAR: copy LEFT, UI RIGHT */}
        <section style={{ backgroundColor: '#EFF6FF' }}>
          <div className="feat-inner">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#2563EB',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Shared calendar
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                The calendar everyone is actually on.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Add events, assign them to household members, and set them to
                repeat so nothing falls through the cracks, dentist
                appointments, rent due dates, game nights, everyone sees the
                same calendar and nobody gets to say they did not know.
              </p>
            </div>
            <div className="feat-ui">
              <CalendarMockup />
            </div>
          </div>
        </section>

        {/* EXPENSES: UI LEFT, copy RIGHT */}
        <section style={{ backgroundColor: '#F0FDF4' }}>
          <div className="feat-inner feat-ui-left">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#16A34A',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Expenses
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                Split bills, no awkward texts required.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Log a shared expense, split it equally or by item, and watch the
                balances update in real time, scan a receipt to split it item by
                item, set recurring bills to post automatically, and track
                exactly who owes what so the awkward money conversations never
                have to happen.
              </p>
            </div>
            <div className="feat-ui">
              <ExpensesMockup />
            </div>
          </div>
        </section>

        {/* REMINDERS: copy LEFT, UI RIGHT */}
        <section style={{ backgroundColor: '#ECFEFF' }}>
          <div className="feat-inner">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#0891B2',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Reminders
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                The nudge that actually gets things done.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Set a reminder for yourself or send it to the whole household,
                make it repeat as often as you need, and never pay a late fee
                again, rent on the first, trash on Tuesdays, filter changes
                every three months, just set it and move on.
              </p>
            </div>
            <div className="feat-ui">
              <RemindersMockup />
            </div>
          </div>
        </section>

        {/* MEALS: UI LEFT, copy RIGHT */}
        <section style={{ backgroundColor: '#FFF7ED' }}>
          <div className="feat-inner feat-ui-left">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#EA580C',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Meal planning
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                What is for dinner is now a solved problem.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Plan the week, vote on what sounds good, and tap any meal to
                send its ingredients straight to your grocery list, no more
                standing in front of the fridge at 6pm with no plan, no more
                defaulting to takeout because nobody could decide.
              </p>
            </div>
            <div className="feat-ui">
              <MealsMockup />
            </div>
          </div>
        </section>

        {/* ALLOWANCES: copy LEFT, UI RIGHT */}
        <section style={{ backgroundColor: '#F5F3FF' }}>
          <div className="feat-inner">
            <div className="feat-copy">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#7C3AED',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 8,
                  fontFamily: ff,
                }}
              >
                Allowances
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#1a1a1a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  fontFamily: ff,
                }}
              >
                Kids earn it, you set the rules.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#555',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: ff,
                }}
              >
                Set a weekly allowance for each kid, tie it to how many chores
                they complete, and watch the motivation sort itself out, kids
                see exactly what they have earned and what is left to do, and
                parents get a chore system that basically runs itself.
              </p>
            </div>
            <div className="feat-ui">
              <AllowancesMockup />
            </div>
          </div>
        </section>
      </div>

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
              style={{ borderRadius: 8, objectFit: 'cover' }}
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
  );
}
