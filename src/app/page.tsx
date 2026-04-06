import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Roost - Home, sorted.",
  description:
    "The household app for families and roommates. Chores, groceries, bills, meals, reminders, and calendars. One app.",
};

// ---- Shared style helpers ---------------------------------------------------

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#C93B3B",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 12,
};

const H2_STYLE: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  color: "#1A0505",
  letterSpacing: "-0.8px",
  marginBottom: 12,
  lineHeight: 1.2,
};

const BODY_STYLE: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#5A2020",
  maxWidth: 520,
  margin: "0 auto 24px",
  lineHeight: 1.6,
};

// ---- Feature screen mockups -------------------------------------------------

function ChoresScreen() {
  const chores = [
    { label: "Vacuum living room", done: true },
    { label: "Wash the dishes", done: false },
    { label: "Take out trash", done: false },
  ];
  return (
    <div style={{ border: "1.5px solid #EF444430", borderBottom: "4px solid #C93B3B", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #EF444415", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#EF4444", letterSpacing: "0.5px" }}>CHORES</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#9B9590" }}>3 total</span>
      </div>
      {chores.map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", borderBottom: i < chores.length - 1 ? "1px solid #EF444410" : "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, backgroundColor: c.done ? "#EF4444" : "transparent", border: c.done ? "none" : "2px solid #EF444440", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {c.done && <span style={{ color: "white", fontSize: 9, fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: c.done ? "#9B9590" : "#1A0505", textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
        </div>
      ))}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #EF444415", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "#EF444420", overflow: "hidden" }}>
          <div style={{ width: "33%", height: "100%", backgroundColor: "#EF4444", borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444" }}>1/3</span>
      </div>
    </div>
  );
}

function GroceryScreen() {
  const items = [
    { label: "Milk", by: "Alex", checked: true },
    { label: "Bread", by: "Sam", checked: false },
    { label: "Pasta", by: "Alex", checked: false },
  ];
  return (
    <div style={{ border: "1.5px solid #F59E0B30", borderBottom: "4px solid #C87D00", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #F59E0B15", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#F59E0B", letterSpacing: "0.5px" }}>SHOPPING LIST</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#9B9590" }}>3 items</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ padding: "9px 12px", borderBottom: i < items.length - 1 ? "1px solid #F59E0B10" : "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, backgroundColor: item.checked ? "#F59E0B" : "transparent", border: item.checked ? "none" : "2px solid #F59E0B50" }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: item.checked ? "#9B9590" : "#1A0505", textDecoration: item.checked ? "line-through" : "none" }}>{item.label}</span>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#9B9590", marginTop: 1 }}>Added by {item.by}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarScreen() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const dates = [3, 4, 5, 6, 7, 8, 9];
  const todayIdx = 2;
  const hasDot = [false, false, false, true, true, false, false];
  const events = [
    { label: "Rent due", color: "#3B82F6" },
    { label: "School pickup", color: "#3B82F6" },
    { label: "Family dinner", color: "#3B82F6" },
  ];
  return (
    <div style={{ border: "1.5px solid #3B82F630", borderBottom: "4px solid #1A5CB5", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #3B82F615" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#3B82F6", letterSpacing: "0.5px" }}>APRIL 2026</span>
      </div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #3B82F610" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
          {days.map((d, i) => (
            <div key={i} style={{ fontSize: 8, fontWeight: 800, color: "#9B9590", paddingBottom: 3 }}>{d}</div>
          ))}
          {dates.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: i === todayIdx ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, fontWeight: i === todayIdx ? 900 : 700, color: i === todayIdx ? "white" : "#1A0505" }}>{d}</span>
              </div>
              {hasDot[i] && <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#3B82F6" }} />}
            </div>
          ))}
        </div>
      </div>
      {events.map((ev, i) => (
        <div key={i} style={{ padding: "7px 12px", borderBottom: i < events.length - 1 ? "1px solid #3B82F610" : "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: ev.color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1A0505" }}>{ev.label}</span>
        </div>
      ))}
    </div>
  );
}

function RemindersScreen() {
  const reminders = [
    { label: "Pay electricity bill", state: "done" },
    { label: "Call the vet", state: "active" },
    { label: "Renew parking permit", state: "snoozed" },
  ];
  return (
    <div style={{ border: "1.5px solid #06B6D430", borderBottom: "4px solid #0891B2", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #06B6D415" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", letterSpacing: "0.5px" }}>REMINDERS</span>
      </div>
      {reminders.map((r, i) => (
        <div key={i} style={{ padding: "9px 12px", borderBottom: i < reminders.length - 1 ? "1px solid #06B6D410" : "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, backgroundColor: r.state === "done" ? "#06B6D4" : "transparent", border: r.state === "done" ? "none" : r.state === "snoozed" ? "2px solid #06B6D430" : "2px solid #06B6D450" }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.state === "done" ? "#9B9590" : "#1A0505", textDecoration: r.state === "done" ? "line-through" : "none" }}>{r.label}</span>
            {r.state === "snoozed" && (
              <div style={{ fontSize: 9, fontWeight: 600, color: "#06B6D4", marginTop: 1 }}>Resets in 3 days</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpensesScreen() {
  const expenses = [
    { label: "Electric bill", amount: "$120", you: "You owe $40" },
    { label: "Groceries", amount: "$86", you: "Owed $28" },
    { label: "Netflix", amount: "$18", you: "You owe $6" },
  ];
  return (
    <div style={{ border: "1.5px solid #22C55E30", borderBottom: "4px solid #159040", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #22C55E15", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#22C55E", letterSpacing: "0.5px" }}>EXPENSES</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#22C55E" }}>Owed $28</span>
      </div>
      {expenses.map((ex, i) => (
        <div key={i} style={{ padding: "9px 12px", borderBottom: i < expenses.length - 1 ? "1px solid #22C55E10" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1A0505" }}>{ex.label}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#9B9590", marginTop: 1 }}>{ex.amount}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: ex.you.startsWith("Owed") ? "#22C55E" : "#EF4444" }}>{ex.you}</span>
        </div>
      ))}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #22C55E15" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#9B9590" }}>Net balance</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#22C55E" }}>+$22</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, backgroundColor: "#22C55E20" }}>
          <div style={{ width: "40%", height: "100%", backgroundColor: "#22C55E", borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

// ---- Feature row ------------------------------------------------------------

interface FeatureRowProps {
  reverse?: boolean;
  borderColor: string;
  darkColor: string;
  h3: string;
  p: string;
  points: string[];
  screen: React.ReactNode;
}

function FeatureRow({ reverse, borderColor, darkColor: _darkColor, h3, p, points, screen }: FeatureRowProps) {
  return (
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto 48px",
        display: "flex",
        flexDirection: reverse ? "row-reverse" : "row",
        gap: 40,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Screen card */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          backgroundColor: "white",
          borderRadius: 18,
          border: `1.5px solid ${borderColor}`,
          borderBottom: `4px solid ${_darkColor}`,
          padding: 14,
        }}
      >
        {screen}
      </div>

      {/* Copy */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: "#1A0505", letterSpacing: "-0.5px", marginBottom: 8, lineHeight: 1.2 }}>
          {h3}
        </h3>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#5A2020", lineHeight: 1.6, marginBottom: 14 }}>
          {p}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {points.map((pt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A0505" }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Comparison table -------------------------------------------------------

const TABLE_ROWS = [
  { feature: "Chores and recurring schedules", roost: "✓", split: "No", cozi: "Basic" },
  { feature: "Shared grocery lists", roost: "✓", split: "No", cozi: "✓" },
  { feature: "Shared household calendar", roost: "✓", split: "No", cozi: "✓" },
  { feature: "Bill splitting and receipts", roost: "✓", split: "✓", cozi: "No" },
  { feature: "Meal planning and voting", roost: "✓", split: "No", cozi: "No" },
  { feature: "Household reminders", roost: "✓", split: "No", cozi: "Basic" },
  { feature: "Child accounts and allowances", roost: "✓", split: "No", cozi: "No" },
  { feature: "Per-household pricing", roost: "✓", split: "Per user", cozi: "Per user" },
  { feature: "iOS and Android app", roost: "Soon", split: "✓", cozi: "✓" },
];

function cellStyle(val: string): React.CSSProperties {
  if (val === "✓") return { color: "#22C55E", fontWeight: 800, fontSize: 13 };
  if (val === "No") return { color: "#9B6060", fontWeight: 700, fontSize: 13 };
  return { color: "#F59E0B", fontWeight: 800, fontSize: 13 };
}

// ---- Page -------------------------------------------------------------------

export default function HomePage() {
  return (
    <main style={{ fontFamily: nunito.style.fontFamily }}>
      {/* 1. NAV */}
      <nav
        style={{
          backgroundColor: "#EF4444",
          height: 64,
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Logo + wordmark */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image
            src="/brand/roost-icon.png"
            alt="Roost"
            width={32}
            height={32}
            style={{ borderRadius: 9, objectFit: "cover" }}
          />
          <span style={{ fontFamily: nunito.style.fontFamily, fontWeight: 900, fontSize: 20, color: "white", letterSpacing: "-0.3px" }}>
            Roost
          </span>
        </Link>

        {/* Nav links + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a
            href="#features"
            className="hidden sm:block"
            style={{ fontFamily: nunito.style.fontFamily, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", textDecoration: "none" }}
          >
            Features
          </a>
          <Link
            href="/login"
            style={{ fontFamily: nunito.style.fontFamily, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              fontFamily: nunito.style.fontFamily,
              backgroundColor: "white",
              color: "#EF4444",
              fontWeight: 800,
              borderRadius: 20,
              padding: "7px 16px",
              fontSize: 14,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* 2. MOBILE APP TEASER BAR */}
      <div
        style={{
          backgroundColor: "#C93B3B",
          padding: "11px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: nunito.style.fontFamily, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
          iOS and Android apps coming soon.
        </span>
        <span
          style={{
            fontFamily: nunito.style.fontFamily,
            backgroundColor: "rgba(255,255,255,0.15)",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            padding: "3px 10px",
            borderRadius: 20,
          }}
        >
          COMING SOON
        </span>
      </div>

      {/* 3. HERO */}
      <section
        style={{
          backgroundColor: "#EF4444",
          padding: "64px 40px 72px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "white",
              fontSize: 12,
              fontWeight: 800,
              padding: "5px 14px",
              borderRadius: 20,
              marginBottom: 20,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            The Household App
          </div>
          <h1
            style={{
              fontFamily: nunito.style.fontFamily,
              fontSize: "clamp(28px, 5vw, 46px)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginBottom: 16,
            }}
          >
            Your house deserves better than a group chat.
          </h1>
          <p
            style={{
              fontFamily: nunito.style.fontFamily,
              fontSize: 17,
              fontWeight: 600,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 500,
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}
          >
            Chores, groceries, bills, meals, reminders, and calendars. One app. Everyone finally on the same page.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              style={{
                fontFamily: nunito.style.fontFamily,
                backgroundColor: "white",
                color: "#EF4444",
                fontWeight: 800,
                fontSize: 15,
                padding: "14px 28px",
                borderRadius: 14,
                border: "1.5px solid white",
                borderBottom: "3px solid #F5C5C5",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Get started free
            </Link>
            <a
              href="#features"
              style={{
                fontFamily: nunito.style.fontFamily,
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                padding: "14px 28px",
                borderRadius: 14,
                border: "1.5px solid rgba(255,255,255,0.3)",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              See the features
            </a>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM SECTION */}
      <section
        style={{
          backgroundColor: "#FFF5F5",
          padding: "56px 40px",
          borderBottom: "1px solid #F5C5C5",
          textAlign: "center",
        }}
      >
        <p style={LABEL_STYLE}>Sound Familiar?</p>
        <h2 style={{ ...H2_STYLE, maxWidth: 480, margin: "0 auto 12px" }}>
          You are running your home with four apps and a prayer.
        </h2>
        <p style={{ ...BODY_STYLE, marginBottom: 24 }}>
          One app for splitting bills. Another for the grocery list nobody updates. A shared calendar three people
          ignore. And a group chat full of did anyone do the dishes messages. There is a better way.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 640, margin: "0 auto" }}>
          {[
            "A bill splitting app",
            "A grocery list nobody checks",
            "A calendar three people ignore",
            "A notes app with one note",
            "A group chat full of chore arguments",
          ].map((pill) => (
            <span
              key={pill}
              style={{
                fontFamily: nunito.style.fontFamily,
                backgroundColor: "white",
                border: "1.5px solid #F5C5C5",
                borderBottom: "3px solid #D4CFC9",
                borderRadius: 20,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: "#5A2020",
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* 5. FEATURES SECTION */}
      <section id="features" style={{ backgroundColor: "white", padding: "56px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={LABEL_STYLE}>Everything Your House Needs</p>
          <h2 style={{ ...H2_STYLE, maxWidth: 400, margin: "0 auto" }}>Built for real households.</h2>
        </div>

        <FeatureRow
          borderColor="#EF444430"
          darkColor="#C93B3B"
          h3="Chores that actually get done."
          p="Assign chores, set recurring schedules, and watch the leaderboard light up as people compete to be the most productive household member. Spoiler: the nagging notifications help."
          points={[
            "Assign chores to specific members",
            "Daily, weekly, monthly and auto-resets",
            "Streaks and weekly leaderboard",
            "Nagging push notifications until it is done",
          ]}
          screen={<ChoresScreen />}
        />

        <FeatureRow
          reverse
          borderColor="#F59E0B30"
          darkColor="#C87D00"
          h3="A grocery list the whole house actually uses."
          p="Anyone in the household can add to the list throughout the week. By the time someone heads to the store everything is already there waiting. No more why did not you tell me we needed milk moments."
          points={[
            "Anyone can add items from anywhere",
            "See who added what and when",
            "Check off items as you shop",
            "Multiple named lists for different stores",
          ]}
          screen={<GroceryScreen />}
        />

        <FeatureRow
          borderColor="#3B82F630"
          darkColor="#1A5CB5"
          h3="One calendar the whole house actually checks."
          p="Stop texting wait when is that. Add events once and everyone sees them. Rent due dates, school pickups, family dinners. It all lives in one place now."
          points={[
            "Shared across every household member",
            "Add events and invite specific members",
            "Recurring events for things that repeat",
            "Reminders so nobody forgets anything",
          ]}
          screen={<CalendarScreen />}
        />

        <FeatureRow
          reverse
          borderColor="#06B6D430"
          darkColor="#0891B2"
          h3="Never forget anything important again."
          p="Set a reminder once and let Roost handle the rest. Recurring reminders reset automatically so you never have to think about it. Notify just yourself, specific people, or the whole household at once."
          points={[
            "One-time and recurring reminders",
            "Notify yourself, specific people, or everyone",
            "Auto-resets after completion",
            "Never manually recreate a reminder again",
          ]}
          screen={<RemindersScreen />}
        />

        <FeatureRow
          borderColor="#22C55E30"
          darkColor="#159040"
          h3="No more awkward money conversations."
          p="Track every shared expense, split bills in seconds, and settle up without the spreadsheet. Scan a receipt and Roost splits it automatically. Everyone sees exactly what they owe and nobody has an excuse."
          points={[
            "Add and split any bill or expense",
            "Scan receipts and split by item",
            "Automatic debt simplification",
            "Full history so nobody forgets",
          ]}
          screen={<ExpensesScreen />}
        />
      </section>

      {/* 6. COMPARISON TABLE */}
      <section
        style={{
          backgroundColor: "#FFF5F5",
          borderTop: "1px solid #F5C5C5",
          padding: "56px 40px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={LABEL_STYLE}>How We Stack Up</p>
          <h2 style={{ ...H2_STYLE, maxWidth: 480, margin: "0 auto 12px" }}>
            Spoiler: the other guys only do one thing.
          </h2>
          <p style={{ fontFamily: nunito.style.fontFamily, fontSize: 14, fontWeight: 600, color: "#5A2020", textAlign: "center", marginBottom: 28 }}>
            Splitwise is great at splitting bills. Cozi is decent at calendars. Roost does everything.
          </p>
        </div>

        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            borderRadius: 16,
            overflow: "hidden",
            border: "1.5px solid #F5C5C5",
          }}
        >
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <div style={{ padding: "12px 16px", backgroundColor: "white", fontFamily: nunito.style.fontFamily, fontSize: 12, fontWeight: 800, color: "#1A0505" }}>Feature</div>
            <div style={{ padding: "12px 16px", backgroundColor: "#EF4444", textAlign: "center", fontFamily: nunito.style.fontFamily, fontSize: 12, fontWeight: 800, color: "white" }}>Roost</div>
            <div style={{ padding: "12px 16px", backgroundColor: "white", textAlign: "center", fontFamily: nunito.style.fontFamily, fontSize: 12, fontWeight: 800, color: "#9B6060" }}>Splitwise</div>
            <div style={{ padding: "12px 16px", backgroundColor: "white", textAlign: "center", fontFamily: nunito.style.fontFamily, fontSize: 12, fontWeight: 800, color: "#9B6060" }}>Cozi</div>
          </div>

          {TABLE_ROWS.map((row, i) => {
            const bg = i % 2 === 0 ? "white" : "#FFFAFA";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "1px solid #F5C5C5" }}>
                <div style={{ padding: "10px 16px", backgroundColor: bg, fontFamily: nunito.style.fontFamily, fontSize: 13, fontWeight: 700, color: "#1A0505" }}>{row.feature}</div>
                <div style={{ padding: "10px 16px", backgroundColor: i % 2 === 0 ? "#FFF8F8" : "#FFF5F5", textAlign: "center", fontFamily: nunito.style.fontFamily, ...cellStyle(row.roost) }}>{row.roost}</div>
                <div style={{ padding: "10px 16px", backgroundColor: bg, textAlign: "center", fontFamily: nunito.style.fontFamily, ...cellStyle(row.split) }}>{row.split}</div>
                <div style={{ padding: "10px 16px", backgroundColor: bg, textAlign: "center", fontFamily: nunito.style.fontFamily, ...cellStyle(row.cozi) }}>{row.cozi}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. PERSONAS */}
      <section
        style={{
          backgroundColor: "white",
          borderTop: "1px solid #F5C5C5",
          padding: "56px 40px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={LABEL_STYLE}>Built for Everyone</p>
          <h2 style={{ ...H2_STYLE, maxWidth: 480, margin: "0 auto" }}>
            Whether you share a house or a last name.
          </h2>
        </div>

        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
              title: "Families",
              body: "Assign chores to kids, set allowances they actually have to earn, plan meals, and keep the whole family in sync without the daily interrogation.",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ),
              title: "Roommates",
              body: "Split rent, utilities, and groceries without the awkward texts. Everyone sees what they owe and nobody gets to pretend they forgot about the electric bill.",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              ),
              title: "College houses",
              body: "Five people, one fridge, zero adults. Roost handles the boring stuff so nobody has to be the responsible one who sends the passive aggressive chore reminder text.",
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                backgroundColor: "#FFF5F5",
                borderRadius: 18,
                border: "1.5px solid #F5C5C5",
                borderBottom: "4px solid #C93B3B",
                padding: 20,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: "rgba(239,68,68,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                {card.icon}
              </div>
              <h3 style={{ fontFamily: nunito.style.fontFamily, fontSize: 16, fontWeight: 900, color: "#1A0505", marginBottom: 6 }}>
                {card.title}
              </h3>
              <p style={{ fontFamily: nunito.style.fontFamily, fontSize: 13, fontWeight: 600, color: "#5A2020", lineHeight: 1.6 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BOTTOM CTA */}
      <section style={{ backgroundColor: "#EF4444", padding: "56px 40px", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: nunito.style.fontFamily,
            fontSize: 34,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.8px",
            marginBottom: 10,
          }}
        >
          Your household is waiting.
        </h2>
        <p
          style={{
            fontFamily: nunito.style.fontFamily,
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            marginBottom: 28,
          }}
        >
          Free to get started. No credit card. No excuses.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
            style={{
              fontFamily: nunito.style.fontFamily,
              backgroundColor: "white",
              color: "#EF4444",
              fontWeight: 800,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 14,
              border: "1.5px solid white",
              borderBottom: "3px solid #F5C5C5",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Create your household
          </Link>
          <Link
            href="/login"
            style={{
              fontFamily: nunito.style.fontFamily,
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 14,
              border: "1.5px solid rgba(255,255,255,0.3)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer
        style={{
          backgroundColor: "#1A0505",
          padding: "28px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image
            src="/brand/roost-icon.png"
            alt="Roost"
            width={28}
            height={28}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
          <span style={{ fontFamily: nunito.style.fontFamily, fontWeight: 900, fontSize: 16, color: "white" }}>Roost</span>
        </Link>

        {/* Tagline */}
        <span style={{ fontFamily: nunito.style.fontFamily, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>
          Home, sorted.
        </span>

        {/* Links */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Sign in", href: "/login" },
            { label: "Sign up", href: "/signup" },
            { label: "Privacy", href: "/privacy" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                fontFamily: nunito.style.fontFamily,
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.45)",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
