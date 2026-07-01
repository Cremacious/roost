import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseCategories, users } from '@/db/schema'
import { eq, and, isNull, gte, lte, desc } from 'drizzle-orm'
import PDFDocument from 'pdfkit'

// pdfkit ships built-in AFM font metrics; using only the standard fonts keeps
// the route serverless-safe (no filesystem font loading beyond the package).
export const runtime = 'nodejs'

interface ExportRow {
  title: string
  amount: string
  notes: string | null
  createdAt: Date
  paidByName: string | null
  categoryName: string | null
}

function parseLocalDay(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  // Parse as local midnight (not UTC) so ranges match the user's calendar day.
  const d = new Date(`${value}T00:00:00`)
  if (isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

async function loadRows(householdId: string, from: Date, to: Date): Promise<ExportRow[]> {
  return db
    .select({
      title: expenses.title,
      amount: expenses.amount,
      notes: expenses.notes,
      createdAt: expenses.createdAt,
      paidByName: users.name,
      categoryName: expenseCategories.name,
    })
    .from(expenses)
    .leftJoin(users, eq(expenses.paidBy, users.id))
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(
      and(
        eq(expenses.householdId, householdId),
        isNull(expenses.deletedAt),
        eq(expenses.isRecurringDraft, false),
        gte(expenses.createdAt, from),
        lte(expenses.createdAt, to),
      ),
    )
    .orderBy(desc(expenses.createdAt))
}

function csvCell(value: string): string {
  // Quote when the value contains a comma, quote, or newline; escape quotes.
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildCsv(rows: ExportRow[]): string {
  const header = ['Date', 'Title', 'Amount', 'Paid by', 'Category', 'Notes']
  const lines = [header.map(csvCell).join(',')]
  for (const r of rows) {
    lines.push(
      [
        formatDate(new Date(r.createdAt)),
        r.title,
        parseFloat(r.amount).toFixed(2),
        r.paidByName ?? 'Unknown',
        r.categoryName ?? 'Uncategorized',
        r.notes ?? '',
      ]
        .map((c) => csvCell(String(c)))
        .join(','),
    )
  }
  // Prefix a BOM so Excel opens the file as UTF-8.
  return '﻿' + lines.join('\r\n')
}

function monthKey(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

async function buildPdf(rows: ExportRow[], from: Date, to: Date, householdName: string): Promise<Buffer> {
  const total = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0)

  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks: Buffer[] = []

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const green = '#22C55E'
  const dark = '#111827'
  const muted = '#6B7280'
  const pageLeft = doc.page.margins.left
  const pageRight = doc.page.width - doc.page.margins.right
  const contentWidth = pageRight - pageLeft

  // ── Header ──
  doc.fillColor(green).fontSize(22).font('Helvetica-Bold').text('Roost', pageLeft, 48)
  doc.fillColor(dark).fontSize(16).font('Helvetica-Bold').text('Expense report', pageLeft, 76)
  doc
    .fillColor(muted)
    .fontSize(10)
    .font('Helvetica')
    .text(`${householdName} · ${formatDate(from)} to ${formatDate(to)}`, pageLeft, 98)

  // ── Summary box ──
  const boxTop = 122
  doc.roundedRect(pageLeft, boxTop, contentWidth, 54, 8).fillAndStroke('#F0FDF4', '#BBF7D0')
  doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('EXPENSES', pageLeft + 16, boxTop + 12)
  doc.fillColor(dark).fontSize(18).font('Helvetica-Bold').text(String(rows.length), pageLeft + 16, boxTop + 24)
  doc
    .fillColor(muted)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('TOTAL', pageLeft + contentWidth / 2, boxTop + 12)
  doc
    .fillColor(green)
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(`$${total.toFixed(2)}`, pageLeft + contentWidth / 2, boxTop + 24)

  let y = boxTop + 54 + 28

  if (rows.length === 0) {
    doc.fillColor(muted).fontSize(11).font('Helvetica').text('No expenses in this date range.', pageLeft, y)
    doc.end()
    return done
  }

  // Column layout: Date | Title | Category | Amount(right)
  const colDate = pageLeft
  const colTitle = pageLeft + 90
  const colCategory = pageLeft + 300
  const amountRight = pageRight

  const drawTableHeader = (top: number) => {
    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold')
    doc.text('DATE', colDate, top)
    doc.text('TITLE', colTitle, top)
    doc.text('CATEGORY', colCategory, top)
    doc.text('AMOUNT', amountRight - 80, top, { width: 80, align: 'right' })
    doc
      .moveTo(pageLeft, top + 14)
      .lineTo(pageRight, top + 14)
      .strokeColor('#E5E7EB')
      .stroke()
  }

  // Group rows by month (rows already sorted newest-first).
  const groups = new Map<string, ExportRow[]>()
  for (const r of rows) {
    const key = monthKey(new Date(r.createdAt))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  const bottomLimit = doc.page.height - doc.page.margins.bottom - 30

  for (const [month, monthRows] of groups) {
    if (y > bottomLimit - 60) {
      doc.addPage()
      y = doc.page.margins.top
    }

    const monthTotal = monthRows.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text(month, pageLeft, y)
    doc
      .fillColor(muted)
      .fontSize(10)
      .font('Helvetica')
      .text(`$${monthTotal.toFixed(2)}`, amountRight - 100, y, { width: 100, align: 'right' })
    y += 20
    drawTableHeader(y)
    y += 22

    for (const r of monthRows) {
      if (y > bottomLimit) {
        doc.addPage()
        y = doc.page.margins.top
        drawTableHeader(y)
        y += 22
      }
      doc.fillColor(dark).fontSize(9).font('Helvetica')
      doc.text(formatDate(new Date(r.createdAt)), colDate, y, { width: 85 })
      doc.text(r.title, colTitle, y, { width: 200, ellipsis: true })
      doc.fillColor(muted).text(r.categoryName ?? 'Uncategorized', colCategory, y, { width: 120, ellipsis: true })
      doc
        .fillColor(dark)
        .font('Helvetica-Bold')
        .text(`$${parseFloat(r.amount).toFixed(2)}`, amountRight - 80, y, { width: 80, align: 'right' })
      y += 20
    }
    y += 12
  }

  doc.end()
  return done
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  // Financial data: children are blocked from the export entirely.
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canView = await checkMemberPermission(session.user.id, householdId, role, 'expensesView')
  if (!canView) {
    return NextResponse.json({ error: 'You do not have permission to view expenses', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'EXPORT_PREMIUM' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const fromRaw = searchParams.get('from') ?? ''
  const toRaw = searchParams.get('to') ?? ''
  const format = (searchParams.get('format') ?? 'csv').toLowerCase()

  const from = parseLocalDay(fromRaw, false)
  const to = parseLocalDay(toRaw, true)
  if (!from || !to) {
    return NextResponse.json({ error: 'Invalid date range. Use from and to as YYYY-MM-DD.' }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: 'The start date must be before the end date.' }, { status: 400 })
  }
  if (format !== 'csv' && format !== 'pdf') {
    return NextResponse.json({ error: 'Invalid format. Use csv or pdf.' }, { status: 400 })
  }

  const rows = await loadRows(householdId, from, to)
  const filename = `roost-expenses-${fromRaw}-${toRaw}.${format}`

  if (format === 'csv') {
    const csv = buildCsv(rows)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // PDF
  const pdfBuffer = await buildPdf(rows, from, to, membership.household.name)
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
