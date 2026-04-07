import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Users, Home, GraduationCap } from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Roost - Home, sorted.",
  description:
    "The household app for families and roommates. Chores, groceries, bills, meals, reminders, and calendars. One app.",
};

// ---- Mockup: Chores ----------------------------------------------------------

function ChoresMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #C93B3B", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.6px" }}>Chores</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>This week</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[{ label: "Done", value: "2", color: "#EF4444" }, { label: "Left", value: "3", color: "#9CA3AF" }, { label: "Streak", value: "7d", color: "#F59E0B" }].map((s) => (
            <div key={s.label} style={{ backgroundColor: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "#FFF5F5", borderRadius: 10, border: "1px solid #FECACA", borderBottom: "3px solid #C93B3B" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>✓</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textDecoration: "line-through" }}>Take out trash</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#FECACA" }}>Completed by Jake</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#EF4444", backgroundColor: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 6, padding: "2px 5px", flexShrink: 0 }}>Daily</span>
        </div>
        {[
          { label: "Vacuum living room", person: "Assigned to Kyle", freq: "Weekly" },
          { label: "Clean bathrooms", person: "Assigned to Emma", freq: "Weekly" },
        ].map((c) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #F3F4F6", borderBottom: "3px solid #E5E7EB" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #FECACA", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{c.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{c.person}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#9CA3AF", backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "2px 5px", flexShrink: 0 }}>{c.freq}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>Leaderboard</div>
        {[
          { initials: "JK", color: "#EF4444", pts: "42pts", barWidth: "100%" },
          { initials: "SR", color: "#EC4899", pts: "31pts", barWidth: "62%" },
        ].map((p) => (
          <div key={p.initials} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: p.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 7, fontWeight: 900, color: "white" }}>{p.initials}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 5, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: p.barWidth, height: "100%", backgroundColor: p.color, borderRadius: 3 }} />
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#374151", minWidth: 26, textAlign: "right" }}>{p.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Mockup: Grocery ---------------------------------------------------------

function GroceryMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #C87D00", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #FEF3C7" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.6px" }}>Shopping List</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>14 items</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", height: 38, borderRadius: 10, border: "1.5px solid #F59E0B", borderBottom: "3px solid #C87D00", backgroundColor: "#FFFBF0", padding: "0 12px", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#D1D5DB", flex: 1 }}>Add milk, eggs, anything...</span>
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { label: "Milk", person: "Added by Sarah", checked: true },
          { label: "Eggs", person: "Added by Jake", checked: false },
          { label: "Chicken breast", person: "Added by Kyle", checked: false },
          { label: "Pasta", person: "Added by Emma", checked: false },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", backgroundColor: item.checked ? "#FFFBF0" : "white", borderRadius: 10, border: `1px solid ${item.checked ? "#FDE68A" : "#F3F4F6"}`, borderBottom: `3px solid ${item.checked ? "#C87D00" : "#E5E7EB"}` }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: item.checked ? "#F59E0B" : "transparent", border: item.checked ? "none" : "2px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {item.checked && <span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: item.checked ? "#9CA3AF" : "#374151", textDecoration: item.checked ? "line-through" : "none" }}>{item.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{item.person}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #FEF3C7", display: "flex", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", backgroundColor: "#FFFBF0", border: "1.5px solid #FDE68A", borderBottom: "2px solid #C87D00", borderRadius: 20, padding: "4px 10px" }}>Shopping List</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", backgroundColor: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 20, padding: "4px 10px" }}>+ Costco run</span>
      </div>
    </div>
  );
}

// ---- Mockup: Calendar --------------------------------------------------------

function CalendarMockup() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const dates1 = [" ", " ", " ", 1, 2, 3, 4];
  const dates2 = [5, 6, 7, 8, 9, 10, 11];
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #1A5CB5", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #EFF6FF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 10, color: "#3B82F6", fontWeight: 800 }}>{"<"}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#3B82F6" }}>April 2026</span>
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 10, color: "#3B82F6", fontWeight: 800 }}>{">"}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
          {days.map((d, i) => (
            <div key={i} style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", paddingBottom: 4 }}>{d}</div>
          ))}
          {dates1.map((d, i) => (
            <div key={`r1-${i}`} style={{ fontSize: 11, fontWeight: d === 7 ? 900 : 600, color: typeof d === "number" ? "#374151" : "transparent", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              {typeof d === "number" ? d : ""}
            </div>
          ))}
          {dates2.map((d, i) => (
            <div key={`r2-${i}`} style={{ fontSize: 11, fontWeight: d === 7 ? 900 : 600, color: d === 7 ? "white" : "#374151", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", backgroundColor: d === 7 ? "#3B82F6" : "transparent" }}>
              {d}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { dot: "#3B82F6", label: "Emma soccer practice", time: "Today at 3:00 PM" },
          { dot: "#3B82F6", label: "Family dinner", time: "Today at 6:30 PM" },
          { dot: "#EF4444", label: "Rent due", time: "Apr 1, recurring monthly" },
        ].map((ev) => (
          <div key={ev.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #EFF6FF", borderBottom: "3px solid #BAD3F7" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ev.dot, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{ev.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{ev.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Mockup: Expenses --------------------------------------------------------

function ExpensesMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #159040", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #F0FDF4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.6px" }}>Expenses</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#22C55E" }}>You are owed $38</span>
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { title: "Electric bill", sub: "Split equally", badge: "Kyle owes $40", badgeColor: "#EF4444" },
          { title: "Costco run", sub: "Receipt scanned by Sarah", badge: "Owed $28", badgeColor: "#22C55E" },
          { title: "Netflix", sub: "Split equally", badge: "You owe $6", badgeColor: "#EF4444" },
        ].map((e) => (
          <div key={e.title} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #F0FDF4", borderBottom: "3px solid #BBF7D0" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12 }}>$</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{e.title}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{e.sub}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: e.badgeColor, flexShrink: 0 }}>{e.badge}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #F0FDF4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>Net balance</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#22C55E" }}>+$22.00</span>
        </div>
        <div style={{ height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: "65%", height: "100%", backgroundColor: "#22C55E", borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

// ---- Mockup: Reminders -------------------------------------------------------

function RemindersMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #0891B2", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #ECFEFF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: "0.6px" }}>Reminders</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>3 active</span>
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "#ECFEFF", borderRadius: 10, border: "1px solid #A5F3FC", borderBottom: "3px solid #0891B2", opacity: 0.75 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#06B6D4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>✓</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textDecoration: "line-through" }}>Dog flea treatment</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#67E8F9" }}>Done. Resets in 6 weeks.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #ECFEFF", borderBottom: "3px solid #A5F3FC" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #06B6D4", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Pay rent</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>Monthly, whole household</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#EF4444", flexShrink: 0 }}>Due Apr 1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #ECFEFF", borderBottom: "3px solid #A5F3FC" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #06B6D4", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Change air filter</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>Every 3 months, just you</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1px solid #F3F4F6", borderBottom: "3px solid #E5E7EB", opacity: 0.55 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #D1D5DB", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>Call the vet</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#06B6D4" }}>Snoozed until Friday</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Mockup: Meals -----------------------------------------------------------

function MealsMockup() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", borderBottom: "4px solid #C4581A", maxWidth: 320, width: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #FFF7ED" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#F97316", textTransform: "uppercase", letterSpacing: "0.6px" }}>Meal Planner</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>This week</span>
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { day: "MON", meal: "Chicken tacos", sub: "4 votes", filled: true },
          { day: "TUE", meal: "Spaghetti bolognese", sub: "Kyle's suggestion", filled: true },
        ].map((m) => (
          <div key={m.day} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "#FFF7ED", borderRadius: 10, border: "1px solid #FDBA74", borderLeft: "3px solid #F97316", borderBottom: "3px solid #C4581A" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#9CA3AF", minWidth: 24 }}>{m.day}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{m.meal}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{m.sub}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", backgroundColor: "white", borderRadius: 10, border: "1.5px dashed #FDBA74" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#9CA3AF", minWidth: 24 }}>WED</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>+ Add a meal</span>
        </div>
      </div>
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #FFF7ED" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>Household suggestions</div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#F97316", backgroundColor: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: 20, padding: "3px 10px" }}>Pizza 3 votes</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", backgroundColor: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 20, padding: "3px 10px" }}>Stir fry 1 vote</span>
        </div>
      </div>
    </div>
  );
}

// ---- Feature row component ---------------------------------------------------

interface FeatureRowProps {
  bg: string;
  reversed: boolean;
  mockup: React.ReactNode;
  tag: string;
  tagColor: string;
  headline: string;
  body: string;
  quote: string;
  quoteBg: string;
  quoteColor: string;
}

function FeatureRow({ bg, reversed, mockup, tag, tagColor, headline, body, quote, quoteBg, quoteColor }: FeatureRowProps) {
  return (
    <section
      style={{
        backgroundColor: bg,
        padding: "64px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: reversed ? "row-reverse" : "row",
          gap: 56,
          maxWidth: 1040,
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Mockup */}
        <div style={{ width: "46%", minWidth: 260, display: "flex", justifyContent: reversed ? "flex-end" : "flex-start" }}>
          {mockup}
        </div>
        {/* Copy */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: tagColor, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>{tag}</div>
          <h3 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#111827", letterSpacing: "-0.6px", marginBottom: 14, lineHeight: 1.2, margin: "0 0 14px" }}>{headline}</h3>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#4B5563", lineHeight: 1.75, margin: 0 }}>{body}</p>
          <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, backgroundColor: quoteBg, fontSize: 14, fontWeight: 700, fontStyle: "italic", lineHeight: 1.5, color: quoteColor }}>
            {quote}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Comparison table --------------------------------------------------------

const TABLE_ROWS = [
  { feature: "Chores and scheduling", roost: "check", split: "no", cozi: "Basic" },
  { feature: "Shared grocery lists", roost: "check", split: "no", cozi: "check" },
  { feature: "Shared calendar", roost: "check", split: "no", cozi: "check" },
  { feature: "Bill splitting and receipts", roost: "check", split: "check", cozi: "no" },
  { feature: "Meal planning and voting", roost: "check", split: "no", cozi: "no" },
  { feature: "Child accounts and allowances", roost: "check", split: "no", cozi: "no" },
  { feature: "Per-household pricing", roost: "check", split: "Per user", cozi: "Per user" },
  { feature: "iOS and Android app", roost: "soon", split: "check", cozi: "check" },
];

function TableCell({ value, isRoost }: { value: string; isRoost?: boolean }) {
  if (value === "check") return <span style={{ color: isRoost ? "white" : "#22C55E", fontWeight: 800, fontSize: 15 }}>✓</span>;
  if (value === "no") return <span style={{ color: "#9CA3AF", fontWeight: 700, fontSize: 13 }}>No</span>;
  if (value === "soon") return <span style={{ color: isRoost ? "#FDE68A" : "#F59E0B", fontWeight: 800, fontSize: 11 }}>Soon</span>;
  return <span style={{ color: isRoost ? "rgba(255,255,255,0.8)" : "#9CA3AF", fontWeight: 700, fontSize: 11 }}>{value}</span>;
}

// ---- Main page ---------------------------------------------------------------

export default function HomePage() {
  const ff = nunito.style.fontFamily;

  return (
    <main style={{ fontFamily: ff, margin: 0, padding: 0 }}>

      {/* 1. NAV */}
      <nav style={{ backgroundColor: "#EF4444", height: 64, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/brand/roost-icon.png" alt="Roost" width={32} height={32} style={{ borderRadius: 9, objectFit: "cover" }} />
          <span style={{ fontWeight: 900, fontSize: 20, color: "white", letterSpacing: "-0.3px", fontFamily: ff }}>Roost</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#features" style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", textDecoration: "none", fontFamily: ff }}>Features</a>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", textDecoration: "none", fontFamily: ff }}>Sign in</Link>
          <Link href="/signup" style={{ backgroundColor: "white", color: "#EF4444", fontWeight: 800, fontSize: 13, padding: "8px 18px", borderRadius: 20, textDecoration: "none", fontFamily: ff }}>Get started free</Link>
        </div>
      </nav>

      {/* 2. MOBILE TEASER BAR */}
      <div style={{ backgroundColor: "#C93B3B", padding: "10px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: ff }}>iOS and Android apps coming soon.</span>
        <span style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, fontFamily: ff, letterSpacing: "0.3px" }}>COMING SOON</span>
      </div>

      {/* 3. HERO */}
      <section style={{ backgroundColor: "#EF4444", padding: "80px 40px 88px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 50px)", fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: "-2px", maxWidth: 700, margin: "0 auto 18px" }}>
          Your house deserves better than a group chat.
        </h1>
        <p style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.88)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6, fontFamily: ff }}>
          Chores, groceries, bills, meals, reminders, and calendars. One app. Everyone finally on the same page.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link href="/signup" style={{ backgroundColor: "white", color: "#EF4444", fontWeight: 800, fontSize: 15, padding: "14px 28px", borderRadius: 14, textDecoration: "none", borderBottom: "3px solid rgba(0,0,0,0.1)", fontFamily: ff }}>
            Get started free
          </Link>
          <a href="#features" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 28px", borderRadius: 14, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.3)", fontFamily: ff }}>
            See the features
          </a>
        </div>
      </section>

      {/* 4. PROBLEM */}
      <section style={{ backgroundColor: "#FFF0F0", padding: "72px 40px", textAlign: "center", borderBottom: "1px solid #FECACA" }}>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 900, color: "#1A0505", letterSpacing: "-0.8px", lineHeight: 1.2, maxWidth: 560, margin: "0 auto 14px" }}>
          You are running your home with four apps and a prayer.
        </h2>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#7F1D1D", maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: ff }}>
          One app for splitting bills. Another for the grocery list nobody updates. A shared calendar three people ignore. And a group chat full of did anyone do the dishes messages.
        </p>
      </section>

      {/* 5. FEATURES */}
      <div id="features">
        <FeatureRow
          bg="#FFF5F5"
          reversed={false}
          mockup={<ChoresMockup />}
          tag="Chores"
          tagColor="#EF4444"
          headline="Chores that actually get done."
          body="Assign chores to specific people, set them on a recurring schedule, and let Roost reset them automatically. Daily dishes. Weekly vacuuming. Monthly deep cleans. Set it once and forget it. The leaderboard adds just enough competition to get everyone off the couch."
          quote="Jake is winning this week. Again."
          quoteBg="rgba(239,68,68,0.07)"
          quoteColor="#C93B3B"
        />
        <FeatureRow
          bg="#FFFBF0"
          reversed={true}
          mockup={<GroceryMockup />}
          tag="Grocery"
          tagColor="#F59E0B"
          headline="A list the whole house actually uses."
          body="Anyone can add to the list from wherever they are throughout the week. By the time someone heads to the store, everything is already there waiting. See who added what, create multiple lists for different stores, and check off items as you go."
          quote="Why didn't you tell me we needed milk? Gone forever."
          quoteBg="rgba(245,158,11,0.07)"
          quoteColor="#C87D00"
        />
        <FeatureRow
          bg="#F0F6FF"
          reversed={false}
          mockup={<CalendarMockup />}
          tag="Calendar"
          tagColor="#3B82F6"
          headline="One calendar the whole house actually checks."
          body="Stop texting wait when is that. Add events once and everyone sees them. School pickups, rent due dates, date nights, family dinners. Set recurring events for things that repeat and never add them again."
          quote="Wait, when is that? Never again."
          quoteBg="rgba(59,130,246,0.07)"
          quoteColor="#1A5CB5"
        />
        <FeatureRow
          bg="#F0FFF5"
          reversed={true}
          mockup={<ExpensesMockup />}
          tag="Expenses"
          tagColor="#22C55E"
          headline="No more awkward money conversations."
          body="Track every shared expense, split bills in seconds, and settle up without the spreadsheet. Scan a receipt with your camera and Roost reads the items automatically. Everyone sees exactly what they owe and nobody has an excuse."
          quote="Nobody owes anyone anything. Enjoy it. It never lasts."
          quoteBg="rgba(34,197,94,0.07)"
          quoteColor="#159040"
        />
        <FeatureRow
          bg="#F0FFFE"
          reversed={false}
          mockup={<RemindersMockup />}
          tag="Reminders"
          tagColor="#06B6D4"
          headline="Never forget anything important again."
          body="Set a reminder once and let Roost handle the rest. Recurring reminders reset automatically after someone marks them done. Notify just yourself, a specific person, or the entire household at once. Snooze anything that can wait."
          quote="Did anyone pay rent this month? Last time you have to ask."
          quoteBg="rgba(6,182,212,0.07)"
          quoteColor="#0891B2"
        />
        <FeatureRow
          bg="#FFF8F0"
          reversed={true}
          mockup={<MealsMockup />}
          tag="Meals"
          tagColor="#F97316"
          headline="Dinner sorted. Every night."
          body="Plan the week, let the household suggest and vote on what sounds good, then add every ingredient to the grocery list in one tap. Build a meal bank of your favorites so planning next week takes thirty seconds. Even the kids get a vote."
          quote="What do you want for dinner? Now a democratic process."
          quoteBg="rgba(249,115,22,0.07)"
          quoteColor="#C4581A"
        />
      </div>

      {/* 6. COMPARISON TABLE */}
      <section style={{ backgroundColor: "#FFF0F0", padding: "72px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#C93B3B", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>How we stack up</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1A0505", letterSpacing: "-0.8px", marginBottom: 8, lineHeight: 1.2, margin: "0 0 8px" }}>
            Spoiler: the other guys only do one thing.
          </h2>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#7F1D1D", margin: "8px 0 0" }}>
            Splitwise is great at bills. Cozi is decent at calendars. Roost does everything.
          </p>
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: "1.5px solid #FECACA" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <div style={{ backgroundColor: "white", padding: "12px 16px", borderBottom: "1px solid #FECACA" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Feature</span>
            </div>
            <div style={{ backgroundColor: "#EF4444", padding: "12px 12px", textAlign: "center", borderBottom: "1px solid #C93B3B" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Roost</span>
            </div>
            <div style={{ backgroundColor: "white", padding: "12px 12px", textAlign: "center", borderBottom: "1px solid #FECACA" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}>Splitwise</span>
            </div>
            <div style={{ backgroundColor: "white", padding: "12px 12px", textAlign: "center", borderBottom: "1px solid #FECACA" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}>Cozi</span>
            </div>
          </div>
          {/* Data rows */}
          {TABLE_ROWS.map((row, i) => (
            <div key={row.feature} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", backgroundColor: i % 2 === 0 ? "white" : "#FFFAFA" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #FEF2F2" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A0505" }}>{row.feature}</span>
              </div>
              <div style={{ padding: "12px 12px", textAlign: "center", backgroundColor: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
                <TableCell value={row.roost} isRoost />
              </div>
              <div style={{ padding: "12px 12px", textAlign: "center", borderBottom: "1px solid #FEF2F2" }}>
                <TableCell value={row.split} />
              </div>
              <div style={{ padding: "12px 12px", textAlign: "center", borderBottom: "1px solid #FEF2F2" }}>
                <TableCell value={row.cozi} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PERSONAS */}
      <section style={{ backgroundColor: "white", padding: "72px 40px", borderTop: "1px solid #E5E7EB" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: "#111827", letterSpacing: "-0.8px", textAlign: "center", marginBottom: 32, margin: "0 0 32px" }}>
          Whether you share a house or a last name.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 860, margin: "0 auto" }}>
          {[
            {
              Icon: Users,
              title: "Families",
              body: "Assign chores to kids, set allowances they actually have to earn, plan meals, and keep everyone in sync without the daily interrogation.",
            },
            {
              Icon: Home,
              title: "Roommates",
              body: "Split rent, utilities, and groceries without the awkward texts. Everyone sees what they owe and nobody pretends to forget about the electric bill.",
            },
            {
              Icon: GraduationCap,
              title: "College houses",
              body: "Five people, one fridge, zero adults. Roost handles the boring stuff so nobody has to send the passive aggressive chore reminder text.",
            },
          ].map(({ Icon, title, body }) => (
            <div key={title} style={{ backgroundColor: "#FFF0F0", borderRadius: 18, border: "1.5px solid #FECACA", borderBottom: "4px solid #C93B3B", padding: 22 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#1A0505", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7F1D1D", lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BOTTOM CTA */}
      <section style={{ backgroundColor: "#EF4444", padding: "72px 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: 38, fontWeight: 900, color: "white", letterSpacing: "-0.8px", marginBottom: 10, margin: "0 0 10px" }}>
          Your household is waiting.
        </h2>
        <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 28, margin: "0 0 28px", fontFamily: ff }}>
          Free to get started. No credit card. No excuses.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link href="/signup" style={{ backgroundColor: "white", color: "#EF4444", fontWeight: 800, fontSize: 15, padding: "14px 28px", borderRadius: 14, textDecoration: "none", borderBottom: "3px solid rgba(0,0,0,0.1)", fontFamily: ff }}>
            Create your household
          </Link>
          <Link href="/login" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 28px", borderRadius: 14, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.3)", fontFamily: ff }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer style={{ backgroundColor: "#EF4444", padding: "28px 40px", borderTop: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/brand/roost-icon.png" alt="Roost" width={28} height={28} style={{ borderRadius: 8, objectFit: "cover" }} />
          <span style={{ fontWeight: 900, color: "white", fontSize: 15, fontFamily: ff }}>Roost</span>
        </Link>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: ff }}>Home, sorted.</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/login" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", textDecoration: "none", fontFamily: ff }}>Sign in</Link>
          <Link href="/signup" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", textDecoration: "none", fontFamily: ff }}>Sign up</Link>
          <Link href="/privacy" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", textDecoration: "none", fontFamily: ff }}>Privacy</Link>
        </div>
      </footer>

    </main>
  );
}
