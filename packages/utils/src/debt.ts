export interface DebtEntry {
  from: string
  to: string
  amount: number
}

export function simplifyDebts(rawDebts: DebtEntry[]): DebtEntry[] {
  const net: Record<string, number> = {}

  for (const { from, to, amount } of rawDebts) {
    net[from] = (net[from] ?? 0) - amount
    net[to] = (net[to] ?? 0) + amount
  }

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .sort(([, a], [, b]) => a - b)

  const result: DebtEntry[] = []
  let ci = 0
  let di = 0
  const cred = creditors.map(([id, v]) => ({ id, v }))
  const debt = debtors.map(([id, v]) => ({ id, v }))

  while (ci < cred.length && di < debt.length) {
    const c = cred[ci]
    const d = debt[di]
    const amount = Math.min(c.v, -d.v)

    if (amount > 0.005) {
      result.push({ from: d.id, to: c.id, amount: Math.round(amount * 100) / 100 })
    }

    c.v -= amount
    d.v += amount
    if (Math.abs(c.v) < 0.005) ci++
    if (Math.abs(d.v) < 0.005) di++
  }

  return result
}
