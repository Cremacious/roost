import { simplifyDebts, Balance } from "@/lib/utils/debtSimplification";

describe("simplifyDebts", () => {
  it("returns empty array for no balances", () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it("handles a single debt", () => {
    const balances: Balance[] = [
      { fromUserId: "alice", toUserId: "bob", amount: 10 },
    ];
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fromUserId: "alice", toUserId: "bob", amount: 10 });
  });

  it("simplifies A owes B and B owes C into A owes C", () => {
    const balances: Balance[] = [
      { fromUserId: "alice", toUserId: "bob", amount: 10 },
      { fromUserId: "bob", toUserId: "carol", amount: 10 },
    ];
    const result = simplifyDebts(balances);
    // Net: alice -10, bob 0, carol +10 => alice owes carol 10
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fromUserId: "alice", toUserId: "carol", amount: 10 });
  });

  it("reduces three-way debt to minimum transactions", () => {
    // alice owes bob 10, alice owes carol 5, bob owes carol 3
    const balances: Balance[] = [
      { fromUserId: "alice", toUserId: "bob", amount: 10 },
      { fromUserId: "alice", toUserId: "carol", amount: 5 },
      { fromUserId: "bob", toUserId: "carol", amount: 3 },
    ];
    // Net: alice = -15, bob = +10-3 = +7, carol = +5+3 = +8
    // alice owes carol 8, alice owes bob 7
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    const totalOwed = result.reduce((s, b) => s + b.amount, 0);
    expect(totalOwed).toBeCloseTo(15);
  });

  it("handles equal split (all net zero)", () => {
    const balances: Balance[] = [
      { fromUserId: "alice", toUserId: "bob", amount: 5 },
      { fromUserId: "bob", toUserId: "alice", amount: 5 },
    ];
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("rounds amounts to 2 decimal places", () => {
    const balances: Balance[] = [
      { fromUserId: "alice", toUserId: "bob", amount: 10 },
      { fromUserId: "carol", toUserId: "bob", amount: 5 },
    ];
    const result = simplifyDebts(balances);
    result.forEach((b) => {
      expect(b.amount).toBe(parseFloat(b.amount.toFixed(2)));
    });
  });
});
