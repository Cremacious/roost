import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.expenses;
const COLOR_DARK = "#16A34A";

const MOCK_EXPENSES = [
  { title: "Groceries", amount: "84.50", payer: "Alex", label: "owed $42.25", labelColor: COLOR },
  { title: "Electric bill", amount: "120.00", payer: "Jordan", label: "you owe $40.00", labelColor: "#EF4444" },
  { title: "Netflix", amount: "18.00", payer: "Alex", label: "settled", labelColor: COLOR },
];

const MOCK_DEBTS = [
  { name: "Jordan", amount: "40.00", isOwer: true },
  { name: "Alex", amount: "12.75", isOwer: false },
];

export default function MockExpensesPreview() {
  return (
    <div className="space-y-3">
      {/* Balance card */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "#EF444418",
          border: "1.5px solid #EF444430",
          borderBottom: "4px solid #C93B3B50",
        }}
      >
        <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
          You owe
        </p>
        <p className="text-2xl" style={{ color: "#EF4444", fontWeight: 900 }}>
          $40.00
        </p>
      </div>

      {/* Settle up */}
      <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
        Settle up
      </p>
      {MOCK_DEBTS.map((debt) => (
        <div
          key={debt.name}
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: debt.isOwer ? "4px solid #EF444460" : `4px solid ${COLOR}60`,
            minHeight: 64,
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: debt.isOwer ? "#EF444418" : `${COLOR}18` }}
          >
            {debt.isOwer
              ? <TrendingDown className="size-5 text-red-500" />
              : <TrendingUp className="size-5" style={{ color: COLOR }} />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              {debt.isOwer ? `You owe ${debt.name}` : `${debt.name} owes you`}
            </p>
          </div>
          <p className="text-sm" style={{ color: debt.isOwer ? "#EF4444" : COLOR, fontWeight: 800 }}>
            ${debt.amount}
          </p>
        </div>
      ))}

      {/* Expense list */}
      <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
        All expenses
      </p>
      {MOCK_EXPENSES.map((expense) => (
        <div
          key={expense.title}
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: `4px solid ${COLOR_DARK}30`,
            minHeight: 64,
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${COLOR}18` }}
          >
            <DollarSign className="size-5" style={{ color: COLOR }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              {expense.title}
            </p>
            <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              {expense.payer} · 2d ago
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              ${expense.amount}
            </p>
            <p className="text-xs" style={{ color: expense.labelColor, fontWeight: 700 }}>
              {expense.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
