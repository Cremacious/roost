export interface ReceiptLineItem {
  description: string;
  amount: number;
  quantity?: string;
}

export interface ParsedReceipt {
  merchant?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  lineItems: ReceiptLineItem[];
  rawText: string;
}

// ---- Always-skip patterns --------------------------------------------------
// Lines matching ANY of these are ignored everywhere in the document.
// No headerDone flag needed — these are unconditionally discarded.

const ALWAYS_SKIP: RegExp[] = [
  /^walmart/i,
  /^neighborhood market/i,
  /^\d{3}[\s\-]\d{3}[\s\-]\d{4}/,                          // phone number
  /^\d+\s+[A-Z0-9]+(\s+[A-Z0-9]+)*\s+(RD|ST|AVE|BLVD|TRL|DR|WAY|LN|CT|PL)\b/i, // street address
  /^[a-z\s]+,\s*[a-z]{2}\s+\d{5}/i,                        // city, state zip
  /^sarasota/i,                                             // city name
  /^(st|tc|op|te|tr)#/i,                                   // store/terminal codes
  /^#\s*items\s+sold/i,
  /^cashier/i,
  /^station\s+\d/i,
  /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d/,                        // datetime lines
  /^mgr\./i,
  /^[a-z]{1,3}\s+[a-z]{1,3}\s+and\s/i,                    // OCR gibberish
  /^[^\x00-\x7F]+$/,                                       // purely non-ASCII
];

function isAlwaysSkip(line: string): boolean {
  return ALWAYS_SKIP.some((re) => re.test(line));
}

// ---- Line classification ---------------------------------------------------

type LineTag =
  | "PRICE"        // Walmart: "5.26 N" — decimal + tax letter, no $
  | "PRICE_AFTER"  // Asian market: "$6.99 F" — standalone $ price
  | "PRICE_INLINE" // Asian market: "ITEM NAME $3.99 FT" — name + $ price
  | "BARCODE"      // 8+ digit number line, optional trailing letter
  | "WEIGHT"       // "0.520 lb. @ 1 lb. /1.26" — weight description
  | "FOOTER"       // subtotal / tax / total / payment lines
  | "ITEM";        // everything else — item name

const RE_PRICE        = /^(\d{1,4}\.\d{2})\s+[NXOF0]\s*$/;
const RE_PRICE_AFTER  = /^\$(\d+\.\d{2})\s*[A-Z]{0,2}\s*$/;
const RE_PRICE_INLINE = /^(.+?)\s+\$(\d+\.\d{2})\s*[A-Z]{0,2}\s*$/;
const RE_BARCODE      = /^\d{8,}\s*[A-Z]?\s*$/;
const RE_WEIGHT       = /^\d+\.\d{3}\s+lb/;
const RE_FOOTER       = /^(subtotal|sub.?total|tax\d*\s|total\s|payment|visa|master|amex|debit|change|validation|trans|ref\s|expir|item count|#\s*items)/i;
const RE_DATE         = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/;

function tagLine(line: string): LineTag {
  if (RE_FOOTER.test(line))       return "FOOTER";
  if (RE_WEIGHT.test(line))       return "WEIGHT";
  if (RE_BARCODE.test(line))      return "BARCODE";
  if (RE_PRICE.test(line))        return "PRICE";
  if (RE_PRICE_AFTER.test(line))  return "PRICE_AFTER";
  if (RE_PRICE_INLINE.test(line)) return "PRICE_INLINE";
  return "ITEM";
}

// Strip embedded barcodes, trailing flags, and weight descriptions
function cleanName(line: string): string {
  return line
    .replace(/\s+\d{8,}\s*/g, " ") // strip 8+ digit barcode
    .replace(/\s+[A-Z]\s*$/, "")   // strip trailing single-letter flag
    .replace(/@.+$/, "")           // strip "@ X lb. /X.XX" weight description
    .replace(/[>*]/g, "")
    .trim();
}

// ---- Main parser -----------------------------------------------------------

export function parseReceiptText(text: string): ParsedReceipt {
  console.log("=== VISION RAW TEXT (first 800 chars) ===");
  console.log(text.substring(0, 800));
  console.log("=== END RAW TEXT ===");

  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const result: ParsedReceipt = { lineItems: [], rawText: text };

  if (lines.length === 0) return result;

  // Tag all lines up front (always-skip checked separately)
  const tagged = lines.map((line) => ({ line, tag: tagLine(line) }));

  // Extract date from any line
  for (const { line } of tagged) {
    const m = line.match(RE_DATE);
    if (m) { result.date = m[1]; break; }
  }

  // Merchant: first ITEM-tagged line that is not always-skipped
  for (const { line, tag } of tagged) {
    if (isAlwaysSkip(line)) continue;
    if (tag === "ITEM" && line.length >= 2) {
      result.merchant = cleanName(line) || line.replace(/[>*]/g, "").trim();
      break;
    }
  }

  // Queue-based state machine — handles both:
  //   Walmart batch: multiple ITEM lines followed by a matching block of PRICE lines
  //   Asian market: ITEM then PRICE_AFTER (one-to-one), or PRICE_INLINE (immediate)
  const nameQueue: string[] = [];
  const priceQueue: number[] = [];

  function emitPair(name: string, amount: number) {
    const clean = cleanName(name);
    if (clean.length >= 2) {
      result.lineItems.push({ description: clean, amount });
    }
  }

  for (let i = 0; i < tagged.length; i++) {
    const { line, tag } = tagged[i];

    // Unconditionally skip always-skip lines
    if (isAlwaysSkip(line)) continue;

    // Stop at footer and harvest totals
    if (tag === "FOOTER") {
      for (let j = i; j < tagged.length; j++) {
        const fl = tagged[j].line;

        const subM = fl.match(/subtotal\s+(\d+\.\d{2})/i);
        if (subM) { result.subtotal = parseFloat(subM[1]); continue; }

        const taxM = fl.match(/tax\d*\s+[\d.]+\s*%?\s+(\d+\.\d{2})/i);
        if (taxM) { result.tax = parseFloat(taxM[1]); continue; }

        const totM = fl.match(/^total\s+(\d+\.\d{2})/i);
        if (totM) { result.total = parseFloat(totM[1]); }
      }
      break;
    }

    // Weight and barcode lines: skip, their item is already in the queue
    if (tag === "WEIGHT" || tag === "BARCODE") continue;

    // Asian market: name + price on the same line — emit immediately
    if (tag === "PRICE_INLINE") {
      const m = line.match(RE_PRICE_INLINE)!;
      emitPair(m[1], parseFloat(m[2]));
      continue;
    }

    // ITEM: if a price is already waiting in priceQueue, claim it immediately;
    // otherwise queue the name and wait for the next PRICE line.
    if (tag === "ITEM") {
      if (line.length < 2) continue;
      const name = cleanName(line);
      if (name.length < 2) continue;
      if (priceQueue.length > 0) {
        emitPair(line, priceQueue.shift()!);
      } else {
        nameQueue.push(line); // push raw; emitPair calls cleanName
      }
      continue;
    }

    // PRICE or PRICE_AFTER: pair with the oldest queued name, or queue the price
    if (tag === "PRICE" || tag === "PRICE_AFTER") {
      const price = tag === "PRICE"
        ? parseFloat(line.match(RE_PRICE)![1])
        : parseFloat(line.match(RE_PRICE_AFTER)![1]);

      if (nameQueue.length > 0) {
        emitPair(nameQueue.shift()!, price);
      } else {
        priceQueue.push(price);
      }
      continue;
    }
  }

  // Drain any remaining queued pairs (edge case: prices arrived before names)
  const pairCount = Math.min(nameQueue.length, priceQueue.length);
  for (let k = 0; k < pairCount; k++) {
    emitPair(nameQueue[k], priceQueue[k]);
  }

  // Fallback total: sum items
  if (!result.total && result.lineItems.length > 0) {
    result.total = parseFloat(
      result.lineItems.reduce((s, item) => s + item.amount, 0).toFixed(2)
    );
  }

  console.log("Parsed items:", result.lineItems.length);
  result.lineItems.forEach((item) =>
    console.log(" -", item.description, "$" + item.amount.toFixed(2))
  );

  return result;
}

// ---- Vision API call -------------------------------------------------------

export async function parseReceiptImage(imageBase64: string): Promise<ParsedReceipt> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  console.log("[Vision] API key present:", !!apiKey, "| prefix:", apiKey?.substring(0, 8));

  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY environment variable is not set");
  }

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: cleanBase64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Could not read error body");
    console.error("[Vision] API error status:", response.status);
    console.error("[Vision] API error body:", errorBody);

    if (response.status === 403) {
      console.error(
        "[Vision] 403: The API key may be invalid, OR the Cloud Vision API may not be enabled. " +
        "Go to https://console.cloud.google.com/apis/library/vision.googleapis.com and enable it for your project."
      );
    } else if (response.status === 400) {
      console.error(
        "[Vision] 400: Request format is wrong. Check that imageBase64 is plain base64 with no data URI prefix."
      );
    }

    throw new Error(`Google Vision API request failed: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.responses?.[0]?.textAnnotations?.[0]?.description ?? "";

  return parseReceiptText(rawText);
}
