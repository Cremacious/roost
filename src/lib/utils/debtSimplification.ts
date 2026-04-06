export interface Balance {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Simplify a list of pairwise debts into the minimum number of transactions.
 * Uses the greedy net-balance algorithm: compute each person's net position,
 * then match the largest creditor with the largest debtor until settled.
 */
export function simplifyDebts(balances: Balance[]): Balance[] {
  // Compute net balance per person (+= owed to them, -= they owe)
  const net = new Map<string, number>();

  for (const { fromUserId, toUserId, amount } of balances) {
    net.set(fromUserId, (net.get(fromUserId) ?? 0) - amount);
    net.set(toUserId, (net.get(toUserId) ?? 0) + amount);
  }

  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of net.entries()) {
    if (balance > 0.005) creditors.push({ id, amount: balance });
    else if (balance < -0.005) debtors.push({ id, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: Balance[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const settled = Math.min(creditor.amount, debtor.amount);
    result.push({
      fromUserId: debtor.id,
      toUserId: creditor.id,
      amount: parseFloat(settled.toFixed(2)),
    });

    creditor.amount -= settled;
    debtor.amount -= settled;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return result;
}
