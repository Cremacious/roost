import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, user, users, households } from "@/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format } from "date-fns";
import PDFDocument from "pdfkit";

const COLOR_GREEN = "#16A34A";
const COLOR_RED = "#DC2626";
const COLOR_GRAY = "#6B7280";

// ---- GET: export expenses as CSV or PDF -------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId } = membership;

  const [household] = await db
    .select({ subscription_status: households.subscription_status, name: households.name })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const fmt = searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const filters = [eq(expenses.household_id, householdId), isNull(expenses.deleted_at)];
  if (fromStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    if (!isNaN(from.getTime())) filters.push(gte(expenses.created_at, from));
  }
  if (toStr) {
    const to = new Date(`${toStr}T23:59:59`);
    if (!isNaN(to.getTime())) filters.push(lte(expenses.created_at, to));
  }

  const expenseRows = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      total_amount: expenses.total_amount,
      paid_by: expenses.paid_by,
      category: expenses.category,
      created_at: expenses.created_at,
      payer_name: user.name,
    })
    .from(expenses)
    .leftJoin(user, eq(expenses.paid_by, user.id))
    .where(and(...filters))
    .orderBy(desc(expenses.created_at));

  const expenseIds = expenseRows.map((e) => e.id);
  let allSplits: {
    expense_id: string;
    user_id: string;
    amount: string;
    settled: boolean;
    user_name: string | null;
  }[] = [];

  if (expenseIds.length > 0) {
    allSplits = await db
      .select({
        expense_id: expense_splits.expense_id,
        user_id: expense_splits.user_id,
        amount: expense_splits.amount,
        settled: expense_splits.settled,
        user_name: user.name,
      })
      .from(expense_splits)
      .leftJoin(user, eq(expense_splits.user_id, user.id))
      .where(inArray(expense_splits.expense_id, expenseIds));
  }

  const splitsByExpense: Record<string, typeof allSplits> = {};
  for (const s of allSplits) {
    if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
    splitsByExpense[s.expense_id].push(s);
  }

  const currentUserId = session.user.id;
  const [currentUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  const dateStr = format(new Date(), "yyyy-MM-dd");

  if (fmt === "csv") {
    const lines: string[] = [];
    lines.push("Date,Title,Category,Paid By,Total Amount,Your Share,Settled");
    for (const e of expenseRows) {
      const splits = splitsByExpense[e.id] ?? [];
      const mySplit = splits.find((s) => s.user_id === currentUserId);
      const myShare = mySplit ? parseFloat(mySplit.amount).toFixed(2) : "0.00";
      const settled = mySplit ? (mySplit.settled ? "Yes" : "No") : "N/A";
      const date = e.created_at ? format(e.created_at, "yyyy-MM-dd") : "";
      const row = [
        date,
        `"${(e.title ?? "").replace(/"/g, '""')}"`,
        `"${(e.category ?? "").replace(/"/g, '""')}"`,
        `"${(e.payer_name ?? "").replace(/"/g, '""')}"`,
        parseFloat(e.total_amount ?? "0").toFixed(2),
        myShare,
        settled,
      ].join(",");
      lines.push(row);
    }
    const csv = lines.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="roost-expenses-${dateStr}.csv"`,
      },
    });
  }

  // PDF generation
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // subtract margins
    const fromLabel = fromStr ?? "All time";
    const toLabel = toStr ?? format(new Date(), "yyyy-MM-dd");
    const dateRange = `${fromLabel} to ${toLabel}`;

    // ---- HEADER ----
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#111827").text("ROOST", 50, 50);
    doc.fontSize(12).font("Helvetica").fillColor(COLOR_GRAY).text("Household Expense Report", 50, 80);

    const headerRight = 50 + pageWidth;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#111827").text(household.name ?? "Household", 0, 50, { align: "right", width: headerRight });
    doc.fontSize(11).font("Helvetica").fillColor(COLOR_GRAY).text(dateRange, 0, 72, { align: "right", width: headerRight });
    doc.fontSize(11).fillColor(COLOR_GRAY).text(`Exported: ${format(new Date(), "MMM d, yyyy")}`, 0, 88, { align: "right", width: headerRight });

    doc.moveTo(50, 108).lineTo(50 + pageWidth, 108).strokeColor("#E5E7EB").lineWidth(1).stroke();

    // ---- SUMMARY BOX ----
    const totalAmount = expenseRows.reduce((acc, e) => acc + parseFloat(e.total_amount ?? "0"), 0);
    const unsettledAmount = allSplits
      .filter((s) => !s.settled && s.user_id !== expenseRows.find((e) => e.id === s.expense_id)?.paid_by)
      .reduce((acc, s) => acc + parseFloat(s.amount ?? "0"), 0);

    const boxY = 118;
    doc.rect(50, boxY, pageWidth, 56).fillColor("#F9FAFB").fill();
    doc.fillColor("#111827");

    const colW = pageWidth / 3;
    const statY = boxY + 10;

    doc.fontSize(10).font("Helvetica").fillColor(COLOR_GRAY).text("Total expenses", 60, statY);
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#111827").text(String(expenseRows.length), 60, statY + 14);

    doc.fontSize(10).font("Helvetica").fillColor(COLOR_GRAY).text("Total amount", 60 + colW, statY);
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#111827").text(`$${totalAmount.toFixed(2)}`, 60 + colW, statY + 14);

    doc.fontSize(10).font("Helvetica").fillColor(COLOR_GRAY).text("Outstanding", 60 + colW * 2, statY);
    doc.fontSize(16).font("Helvetica-Bold").fillColor(unsettledAmount > 0 ? COLOR_RED : COLOR_GREEN)
      .text(`$${unsettledAmount.toFixed(2)}`, 60 + colW * 2, statY + 14);

    // ---- EXPENSE TABLE ----
    let y = boxY + 72;

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#111827").text("Expenses", 50, y);
    y += 20;

    // Table headers
    const cols = { date: 50, desc: 120, paidBy: 300, amount: 390, status: 470 };
    doc.fontSize(9).font("Helvetica-Bold").fillColor(COLOR_GRAY);
    doc.text("DATE", cols.date, y);
    doc.text("DESCRIPTION", cols.desc, y);
    doc.text("PAID BY", cols.paidBy, y);
    doc.text("AMOUNT", cols.amount, y);
    doc.text("STATUS", cols.status, y);
    y += 14;
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
    y += 6;

    // Group by month if range > 1 month
    let currentMonth = "";
    let monthTotal = 0;
    let rowIndex = 0;

    for (let i = 0; i < expenseRows.length; i++) {
      const e = expenseRows[i];

      // Page break
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      const month = e.created_at ? format(e.created_at, "MMMM yyyy") : "";
      if (month !== currentMonth) {
        if (currentMonth && monthTotal > 0) {
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827")
            .text(`${currentMonth} total: $${monthTotal.toFixed(2)}`, 50, y, { align: "right", width: pageWidth });
          y += 16;
          doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
          y += 8;
        }
        currentMonth = month;
        monthTotal = 0;

        if (month) {
          doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151").text(month, 50, y);
          y += 16;
        }
      }
      monthTotal += parseFloat(e.total_amount ?? "0");

      const rowBg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
      doc.rect(50, y - 2, pageWidth, 18).fillColor(rowBg).fill();

      const splits = splitsByExpense[e.id] ?? [];
      const mySplit = splits.find((s) => s.user_id === currentUserId);
      const isSettled = mySplit?.settled ?? false;
      const dateLabel = e.created_at ? format(e.created_at, "MM/dd/yy") : "-";

      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      doc.text(dateLabel, cols.date, y, { width: 65 });
      doc.text((e.title ?? "").slice(0, 28), cols.desc, y, { width: 175 });
      doc.text((e.payer_name ?? "").split(" ")[0], cols.paidBy, y, { width: 85 });
      doc.text(`$${parseFloat(e.total_amount ?? "0").toFixed(2)}`, cols.amount, y, { width: 75 });
      doc.fillColor(isSettled ? COLOR_GREEN : COLOR_RED)
        .text(isSettled ? "Settled" : "Unsettled", cols.status, y, { width: 80 });

      y += 18;
      rowIndex++;
    }

    // Last month total
    if (currentMonth && monthTotal > 0) {
      if (y > doc.page.height - 60) { doc.addPage(); y = 50; }
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827")
        .text(`${currentMonth} total: $${monthTotal.toFixed(2)}`, 50, y, { align: "right", width: pageWidth });
      y += 16;
    }

    // ---- FOOTER ----
    const footerY = doc.page.height - 40;
    doc.fontSize(9).font("Helvetica").fillColor(COLOR_GRAY)
      .text("Generated by Roost", 50, footerY);
    doc.text(`Page 1`, 0, footerY, { align: "right", width: 50 + pageWidth });

    doc.end();
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="roost-expenses-${dateStr}.pdf"`,
    },
  });
}
