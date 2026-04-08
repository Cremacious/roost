import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, user, users, households } from "@/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format } from "date-fns";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

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
  const dateStr = format(new Date(), "yyyy-MM-dd");

  // ---- CSV -------------------------------------------------------------------
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
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="roost-expenses-${dateStr}.csv"`,
      },
    });
  }

  // ---- PDF (via pdf-lib) -----------------------------------------------------
  const pdfDoc = await PDFDocument.create();

  // Embed standard fonts (no filesystem access needed)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const PAGE_W = PageSizes.A4[0]; // 595
  const PAGE_H = PageSizes.A4[1]; // 842
  const MARGIN = 50;
  const COL_W = PAGE_W - MARGIN * 2;

  const cGray = rgb(0.42, 0.45, 0.5);
  const cDark = rgb(0.07, 0.1, 0.15);
  const cGreen = rgb(0.09, 0.64, 0.27);
  const cRed = rgb(0.86, 0.15, 0.15);
  const cLightGray = rgb(0.98, 0.98, 0.98);
  const cBorder = rgb(0.9, 0.91, 0.92);

  function addPage() {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    return { page, y: PAGE_H - MARGIN };
  }

  let { page, y } = addPage();

  function text(
    str: string,
    x: number,
    yPos: number,
    opts: { size?: number; font?: typeof fontBold; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center"; maxWidth?: number } = {}
  ) {
    const { size = 10, font = fontReg, color = cDark, align = "left", maxWidth } = opts;
    let drawX = x;
    if (align !== "left" && maxWidth) {
      const w = font.widthOfTextAtSize(str, size);
      if (align === "right") drawX = x + maxWidth - w;
      else if (align === "center") drawX = x + (maxWidth - w) / 2;
    }
    page.drawText(str, { x: drawX, y: yPos, size, font, color });
  }

  function hRule(yPos: number, color = cBorder) {
    page.drawLine({ start: { x: MARGIN, y: yPos }, end: { x: MARGIN + COL_W, y: yPos }, thickness: 0.5, color });
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 40) {
      const np = addPage();
      page = np.page;
      y = np.y;
    }
  }

  // ---- Header ----------------------------------------------------------------
  text("ROOST", MARGIN, y, { size: 22, font: fontBold });
  text("Household Expense Report", MARGIN, y - 26, { size: 11, color: cGray });

  const householdName = household.name ?? "Household";
  const fromLabel = fromStr ?? "All time";
  const toLabel = toStr ?? format(new Date(), "yyyy-MM-dd");
  text(householdName, MARGIN, y, { size: 13, font: fontBold, align: "right", maxWidth: COL_W });
  text(`${fromLabel} to ${toLabel}`, MARGIN, y - 18, { size: 10, color: cGray, align: "right", maxWidth: COL_W });
  text(`Exported: ${format(new Date(), "MMM d, yyyy")}`, MARGIN, y - 32, { size: 10, color: cGray, align: "right", maxWidth: COL_W });

  y -= 50;
  hRule(y);
  y -= 16;

  // ---- Summary box -----------------------------------------------------------
  const totalAmount = expenseRows.reduce((acc, e) => acc + parseFloat(e.total_amount ?? "0"), 0);
  const unsettledAmount = allSplits
    .filter((s) => !s.settled && s.user_id !== expenseRows.find((e) => e.id === s.expense_id)?.paid_by)
    .reduce((acc, s) => acc + parseFloat(s.amount ?? "0"), 0);

  const boxH = 52;
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: COL_W, height: boxH, color: cLightGray });

  const colW3 = COL_W / 3;
  const statY = y - 18;
  text("Total expenses", MARGIN + 10, statY, { size: 9, color: cGray });
  text(String(expenseRows.length), MARGIN + 10, statY - 16, { size: 16, font: fontBold });
  text("Total amount", MARGIN + colW3 + 10, statY, { size: 9, color: cGray });
  text(`$${totalAmount.toFixed(2)}`, MARGIN + colW3 + 10, statY - 16, { size: 16, font: fontBold });
  text("Outstanding", MARGIN + colW3 * 2 + 10, statY, { size: 9, color: cGray });
  text(`$${unsettledAmount.toFixed(2)}`, MARGIN + colW3 * 2 + 10, statY - 16, { size: 16, font: fontBold, color: unsettledAmount > 0 ? cRed : cGreen });

  y -= boxH + 20;

  // ---- Expense table ---------------------------------------------------------
  text("Expenses", MARGIN, y, { size: 13, font: fontBold });
  y -= 20;

  const colDate = MARGIN;
  const colDesc = MARGIN + 65;
  const colPaidBy = MARGIN + 245;
  const colAmount = MARGIN + 330;
  const colStatus = MARGIN + 410;

  // Headers
  for (const [lbl, x] of [["DATE", colDate], ["DESCRIPTION", colDesc], ["PAID BY", colPaidBy], ["AMOUNT", colAmount], ["STATUS", colStatus]] as [string, number][]) {
    text(lbl, x, y, { size: 8, font: fontBold, color: cGray });
  }
  y -= 12;
  hRule(y);
  y -= 8;

  let currentMonth = "";
  let monthTotal = 0;
  let rowIndex = 0;

  for (let i = 0; i < expenseRows.length; i++) {
    ensureSpace(22);

    const e = expenseRows[i];
    const month = e.created_at ? format(e.created_at, "MMMM yyyy") : "";

    if (month !== currentMonth) {
      // Print previous month subtotal
      if (currentMonth && monthTotal > 0) {
        ensureSpace(28);
        text(`${currentMonth} total: $${monthTotal.toFixed(2)}`, MARGIN, y, { size: 9, font: fontBold, align: "right", maxWidth: COL_W });
        y -= 14;
        hRule(y, cBorder);
        y -= 10;
      }
      currentMonth = month;
      monthTotal = 0;

      if (month) {
        ensureSpace(22);
        text(month, MARGIN, y, { size: 10, font: fontBold, color: rgb(0.22, 0.27, 0.32) });
        y -= 16;
      }
    }
    monthTotal += parseFloat(e.total_amount ?? "0");

    // Alternating row bg
    if (rowIndex % 2 !== 0) {
      page.drawRectangle({ x: MARGIN, y: y - 4, width: COL_W, height: 18, color: cLightGray });
    }

    const splits = splitsByExpense[e.id] ?? [];
    const mySplit = splits.find((s) => s.user_id === currentUserId);
    const isSettled = mySplit?.settled ?? false;
    const dateLabel = e.created_at ? format(e.created_at, "MM/dd/yy") : "-";
    const titleTrunc = (e.title ?? "").slice(0, 26);
    const payerTrunc = (e.payer_name ?? "").split(" ")[0].slice(0, 12);

    text(dateLabel, colDate, y, { size: 9 });
    text(titleTrunc, colDesc, y, { size: 9 });
    text(payerTrunc, colPaidBy, y, { size: 9 });
    text(`$${parseFloat(e.total_amount ?? "0").toFixed(2)}`, colAmount, y, { size: 9 });
    text(isSettled ? "Settled" : "Unsettled", colStatus, y, { size: 9, color: isSettled ? cGreen : cRed });

    y -= 18;
    rowIndex++;
  }

  // Last month subtotal
  if (currentMonth && monthTotal > 0) {
    ensureSpace(22);
    text(`${currentMonth} total: $${monthTotal.toFixed(2)}`, MARGIN, y, { size: 9, font: fontBold, align: "right", maxWidth: COL_W });
    y -= 14;
  }

  // ---- Footer (each page) ----------------------------------------------------
  const pageCount = pdfDoc.getPageCount();
  for (let pi = 0; pi < pageCount; pi++) {
    const pg = pdfDoc.getPage(pi);
    pg.drawText("Generated by Roost", { x: MARGIN, y: 28, size: 9, font: fontReg, color: cGray });
    pg.drawText(`Page ${pi + 1} of ${pageCount}`, { x: PAGE_W - MARGIN - 60, y: 28, size: 9, font: fontReg, color: cGray });
  }

  const pdfBytes = await pdfDoc.save();
  // Extract a plain ArrayBuffer to satisfy BodyInit type constraints
  const pdfBuf = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;

  return new Response(pdfBuf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="roost-expenses-${dateStr}.pdf"`,
    },
  });
}
