export interface RawSplit {
  creditorId: string  // who is owed money (expense paidBy)
  debtorId: string    // who owes money
  amount: number
  splitId: string
  settled: boolean
  settledByPayer: boolean
  settledByPayee: boolean
  settlementDisputed: boolean
  settlementLastRemindedAt: Date | null
  settledAt: Date | null
}

export interface DebtItem {
  from: string        // debtor userId
  to: string          // creditor userId
  amount: number
  splitIds: string[]  // underlying splits (for settlement)
  pendingClaim?: {
    splitId: string
    settledByPayer: boolean
    settledByPayee: boolean
    settlementDisputed: boolean
    lastRemindedAt: Date | null
  } | null
}

export function simplifyDebts(splits: RawSplit[]): DebtItem[] {
  // build net balance map: positive = owed to this person, negative = this person owes
  const unsettled = splits.filter(s => !s.settled)
  const net = new Map<string, number>()

  for (const s of unsettled) {
    net.set(s.creditorId, (net.get(s.creditorId) ?? 0) + s.amount)
    net.set(s.debtorId, (net.get(s.debtorId) ?? 0) - s.amount)
  }

  // collect creditors and debtors
  const creditors: Array<{ id: string; amount: number }> = []
  const debtors: Array<{ id: string; amount: number }> = []

  for (const [id, balance] of net) {
    if (balance > 0.005) creditors.push({ id, amount: balance })
    else if (balance < -0.005) debtors.push({ id, amount: -balance })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const debts: DebtItem[] = []

  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const amount = Math.min(c.amount, d.amount)

    // find matching raw split IDs (for settlement)
    const matchingSplits = unsettled.filter(
      s => s.creditorId === c.id && s.debtorId === d.id
    )

    // check for a pending two-sided claim
    const pendingSplit = matchingSplits.find(s => s.settledByPayer && !s.settled)

    debts.push({
      from: d.id,
      to: c.id,
      amount: Math.round(amount * 100) / 100,
      splitIds: matchingSplits.map(s => s.splitId),
      pendingClaim: pendingSplit
        ? {
            splitId: pendingSplit.splitId,
            settledByPayer: pendingSplit.settledByPayer,
            settledByPayee: pendingSplit.settledByPayee,
            settlementDisputed: pendingSplit.settlementDisputed,
            lastRemindedAt: pendingSplit.settlementLastRemindedAt,
          }
        : null,
    })

    c.amount -= amount
    d.amount -= amount
    if (c.amount < 0.005) ci++
    if (d.amount < 0.005) di++
  }

  return debts
}
