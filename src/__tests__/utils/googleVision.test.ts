import { parseReceiptText } from "@/lib/utils/googleVision";

describe("parseReceiptText", () => {
  it("returns empty lineItems for empty text", () => {
    const result = parseReceiptText("");
    expect(result.lineItems).toHaveLength(0);
  });

  it("sets merchant to first ASCII line", () => {
    const result = parseReceiptText("WALMART SUPERCENTER\n5.26 N\nCRM COCO VAN 818290017570 F\nTOTAL 5.26");
    expect(result.merchant).toBe("WALMART SUPERCENTER");
  });

  // FORMAT 1: Walmart (price-before, no $, barcode on item line)
  describe("Walmart format (price before item)", () => {
    const receipt = [
      "WALMART SUPERCENTER",
      "Cashier # 4",
      "5.26 N",
      "CRM COCO VAN 818290017570 F",
      "4.67 N",
      "CHO COCO 4PK 818290012770 F",
      "1.94 N",
      "COLESLAW 681131387480 F",
      "SUBTOTAL 11.87",
      "TAX1 7.0000 % 0.83",
      "TOTAL 12.70",
    ].join("\n");

    it("parses all three items", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems).toHaveLength(3);
    });

    it("strips barcodes from item names", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems[0].description).toBe("CRM COCO VAN");
      expect(result.lineItems[1].description).toBe("CHO COCO 4PK");
      expect(result.lineItems[2].description).toBe("COLESLAW");
    });

    it("assigns correct prices", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems[0].amount).toBe(5.26);
      expect(result.lineItems[1].amount).toBe(4.67);
      expect(result.lineItems[2].amount).toBe(1.94);
    });

    it("extracts subtotal, tax, total", () => {
      const result = parseReceiptText(receipt);
      expect(result.subtotal).toBe(11.87);
      expect(result.tax).toBe(0.83);
      expect(result.total).toBe(12.70);
    });
  });

  // FORMAT 2: Asian market (price-after, $ sign, continuation lines)
  describe("Asian market format (price after item, $ sign)", () => {
    const receipt = [
      "Heng Long Asian Supermarket",
      "7113 S Tamiami Trl",
      "Sarasota,FL 34231",
      "(941)922-3106",
      "01/24/2026 10:26:00",
      "Cashier # 104",
      "DF SOUP DUMPLING WITH PORK",
      "$6.99 F",
      "SHIRAKIKU PORK GYOZA",
      "$6.99 F",
      "DUMPLINGS WITH PORK",
      "WEI CHUAN CHA SHU BUN",
      "$7.99 F",
      "Subtotal $77.04",
      "Tax $2.25",
      "Total $79.29",
    ].join("\n");

    it("parses three items", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems).toHaveLength(3);
    });

    it("reads item names correctly", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems[0].description).toBe("DF SOUP DUMPLING WITH PORK");
      expect(result.lineItems[1].description).toContain("SHIRAKIKU PORK GYOZA");
      expect(result.lineItems[2].description).toBe("WEI CHUAN CHA SHU BUN");
    });

    it("appends continuation lines to previous item", () => {
      const result = parseReceiptText(receipt);
      // "DUMPLINGS WITH PORK" has no price so it appends to SHIRAKIKU line
      expect(result.lineItems[1].description).toContain("DUMPLINGS WITH PORK");
    });

    it("assigns correct prices", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems[0].amount).toBe(6.99);
      expect(result.lineItems[1].amount).toBe(6.99);
      expect(result.lineItems[2].amount).toBe(7.99);
    });

    it("skips phone number and date from header", () => {
      const result = parseReceiptText(receipt);
      // No item should be a phone or date
      const descs = result.lineItems.map((i) => i.description);
      expect(descs).not.toContain("(941)922-3106");
      expect(descs).not.toContain("01/24/2026 10:26:00");
    });

    it("extracts date from header", () => {
      const result = parseReceiptText(receipt);
      expect(result.date).toBe("01/24/2026");
    });
  });

  // FORMAT 3: inline price on same line
  describe("inline format (name + $ price on same line)", () => {
    const receipt = [
      "STORE NAME",
      "FUMANG MANGO FLAVORED ICE CRE $3.99 FT",
      "NINGXIA LEMON FLAVORED ICE CR $3.99 FT",
      "GOLDEN CHEESE FLAVOR DORITOS  $2.99 FT",
      "Subtotal $10.97",
      "Tax $0.00",
      "Total $10.97",
    ].join("\n");

    it("parses three inline items", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems).toHaveLength(3);
    });

    it("strips tax flag from name", () => {
      const result = parseReceiptText(receipt);
      expect(result.lineItems[0].description).not.toMatch(/FT$/);
      expect(result.lineItems[0].amount).toBe(3.99);
    });
  });

  // Fallback total
  it("sums line items when no footer total found", () => {
    const receipt = "STORE\n$1.50 F\nAPPLES\n$0.75 F\nBANANAS";
    const result = parseReceiptText(receipt);
    // items: APPLES 1.50, BANANAS 0.75 — but they need a name before price
    // With price-after format: APPLES gets price 1.50 ... actually "STORE" is header
    // Let's use inline format for fallback test
    const receipt2 = "STORE\nAPPLES $1.50\nBANANAS $0.75";
    const result2 = parseReceiptText(receipt2);
    expect(result2.total).toBe(2.25);
  });
});
