import { parseReceiptText } from "@/lib/utils/googleVision";

describe("parseReceiptText", () => {
  it("returns empty lineItems for empty text", () => {
    const result = parseReceiptText("");
    expect(result.lineItems).toHaveLength(0);
    expect(result.rawText).toBe("");
  });

  it("uses first line as merchant name", () => {
    const text = "WALMART SUPERCENTER\nMilk 3.49\nTotal 3.49";
    const result = parseReceiptText(text);
    expect(result.merchant).toBe("WALMART SUPERCENTER");
  });

  it("parses a simple same-line item", () => {
    const text = "STORE\nMilk 2.99\nTotal 2.99";
    const result = parseReceiptText(text);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].description).toBe("Milk");
    expect(result.lineItems[0].amount).toBe(2.99);
  });

  it("detects total", () => {
    const text = "STORE\nMilk 2.99\nBread 1.50\nTotal 4.49";
    const result = parseReceiptText(text);
    expect(result.total).toBe(4.49);
  });

  it("detects subtotal", () => {
    const text = "STORE\nMilk 2.99\nSubtotal 2.99\nTax 0.24\nTotal 3.23";
    const result = parseReceiptText(text);
    expect(result.subtotal).toBe(2.99);
    expect(result.tax).toBe(0.24);
    expect(result.total).toBe(3.23);
  });

  it("detects date", () => {
    const text = "STORE\nDate: 04/15/2026\nMilk 2.99\nTotal 2.99";
    const result = parseReceiptText(text);
    expect(result.date).toBe("04/15/2026");
  });

  it("skips obvious header/footer lines", () => {
    const text = "STORE\nThank you for shopping!\nMilk 2.99\nTotal 2.99";
    const result = parseReceiptText(text);
    // "Thank you..." should be skipped, no extra item
    expect(result.lineItems).toHaveLength(1);
  });

  it("handles price-only line with previous description", () => {
    const text = "STORE\nOrganic Whole Milk\n3.49\nTotal 3.49";
    const result = parseReceiptText(text);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].description).toBe("Organic Whole Milk");
    expect(result.lineItems[0].amount).toBe(3.49);
  });

  it("falls back to summing line items when no total found", () => {
    const text = "STORE\nApples 1.50\nBananas 0.75";
    const result = parseReceiptText(text);
    expect(result.total).toBe(2.25);
  });

  it("parses multiple items correctly", () => {
    const text = [
      "Target",
      "Eggs 4.99",
      "Butter 3.49",
      "Cheese 5.99",
      "Subtotal 14.47",
      "Tax 1.01",
      "Total 15.48",
    ].join("\n");
    const result = parseReceiptText(text);
    expect(result.lineItems).toHaveLength(3);
    expect(result.total).toBe(15.48);
    expect(result.tax).toBe(1.01);
  });
});
