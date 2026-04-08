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

// ---- Line type tags --------------------------------------------------------

type LineTag =
  | "PRICE_BEFORE"   // Walmart: "5.26 N" — price then tax flag, no $
  | "PRICE_AFTER"    // Asian market: "$6.99 F" — standalone price with $
  | "PRICE_INLINE"   // Asian market: "ITEM NAME $3.99 FT" — name + price on one line
  | "BARCODE"        // 8+ digit number, optional trailing letter
  | "FOOTER"         // subtotal / tax / total / payment lines
  | "HEADER"         // cashier / station / TC# / phone lines
  | "DATE"           // date pattern — extract then skip
  | "SKIP"           // gibberish, pure non-ASCII, etc.
  | "TEXT";          // everything else — potential item name / continuation

const RE_PRICE_BEFORE  = /^(\d{1,4}\.\d{2})\s+[A-Z0-9]$/;
const RE_PRICE_AFTER   = /^\$(\d+\.\d{2})\s*[A-Z]{0,2}\s*$/;
const RE_PRICE_INLINE  = /^(.+?)\s+\$(\d+\.\d{2})\s*[A-Z]{0,2}\s*$/;
const RE_BARCODE       = /^\d{8,}\s*[A-Z]?$/;
const RE_FOOTER        = /^(subtotal|sub total|sub-total|tax|total|payment|visa|master|amex|debit|change|validation|trans|ref #|expiration|approval|item count|#\s*items)/i;
const RE_HEADER        = /^(st#|tc#|op#|te#|tr#|cashier|station|\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4})/i;
const RE_DATE          = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/;
const RE_PURE_NUMERIC  = /^\d{6,}$/;
const RE_GIBBERISH     = /^[a-z]{2}\s+[a-z]+\s+and$/i;
// Lines that are purely non-ASCII (e.g. Chinese characters)
const RE_NON_ASCII     = /^[^\x00-\x7F]+$/;

function tagLine(line: string): LineTag {
  if (line.length < 2)          return "SKIP";
  if (RE_NON_ASCII.test(line))  return "SKIP";
  if (RE_GIBBERISH.test(line))  return "SKIP";
  if (RE_PURE_NUMERIC.test(line)) return "SKIP";
  if (RE_DATE.test(line))       return "DATE";
  if (RE_HEADER.test(line))     return "HEADER";
  if (RE_FOOTER.test(line))     return "FOOTER";
  if (RE_BARCODE.test(line))    return "BARCODE";
  if (RE_PRICE_BEFORE.test(line)) return "PRICE_BEFORE";
  if (RE_PRICE_AFTER.test(line))  return "PRICE_AFTER";
  if (RE_PRICE_INLINE.test(line)) return "PRICE_INLINE";
  return "TEXT";
}

// Strip 8+ digit barcodes and trailing single-letter tax flags from a name
function cleanItemName(raw: string): string {
  return raw
    .replace(/\s+\d{8,}\s*/g, " ")  // remove barcodes
    .replace(/\s+[A-Z]{1,2}\s*$/, "") // remove trailing tax flag (F, FT, N, etc.)
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

  // Merchant: first ASCII-dominant line, skip pure non-ASCII lines
  for (const line of lines) {
    if (!RE_NON_ASCII.test(line) && line.length >= 2) {
      result.merchant = line.replace(/[>*]/g, "").trim();
      break;
    }
  }

  // Pass 1: tag all lines
  const tagged = lines.map((line) => ({ line, tag: tagLine(line) }));

  // Extract date from any DATE-tagged line
  for (const { line, tag } of tagged) {
    if (tag === "DATE") {
      const m = line.match(RE_DATE);
      if (m) { result.date = m[1]; break; }
    }
  }

  // Pass 2: state machine to build items
  // headerDone = false until we see the first price-bearing line.
  // During the header phase we still track TEXT lines into pendingItemName
  // so that the item name immediately before the first price is captured.
  let headerDone = false;
  let pendingItemName: string | null = null;
  let pendingPrice: number | null = null;

  function emit(name: string, amount: number) {
    const clean = cleanItemName(name);
    if (clean.length >= 2) {
      result.lineItems.push({ description: clean, amount });
    }
  }

  for (let i = 0; i < tagged.length; i++) {
    const { line, tag } = tagged[i];

    // Header phase: skip non-price lines but let TEXT lines populate
    // pendingItemName so the line just before the first price is captured.
    if (!headerDone) {
      if (tag === "PRICE_BEFORE" || tag === "PRICE_AFTER" || tag === "PRICE_INLINE") {
        headerDone = true;
        // fall through to process this price line normally
      } else if (tag === "TEXT") {
        pendingItemName = line; // keep updating; last one wins
        continue;
      } else {
        // HEADER / DATE / SKIP / BARCODE — clear tentative name
        pendingItemName = null;
        continue;
      }
    }

    // Stop at footer and harvest totals
    if (tag === "FOOTER") {
      for (let j = i; j < tagged.length; j++) {
        const fl = tagged[j].line;
        const subM = fl.match(/subtotal\s+\$?(\d+\.\d{2})/i);
        if (subM) { result.subtotal = parseFloat(subM[1]); continue; }

        // Tax: "TAX1  7.0000 %  2.13" or "Tax:  $2.25"
        const taxM = fl.match(/^tax\S*\s+[\d.]+\s*%\s+(\d+\.\d{2})/i)
                  ?? fl.match(/^tax\s*[:\s]\s*\$?(\d+\.\d{2})/i);
        if (taxM) { result.tax = parseFloat(taxM[1]); continue; }

        const totM = fl.match(/^total\s+\$?(\d+\.\d{2})/i);
        if (totM) { result.total = parseFloat(totM[1]); }
      }
      break;
    }

    if (tag === "SKIP" || tag === "HEADER" || tag === "DATE") continue;

    // FORMAT 3: price inline — emit immediately
    if (tag === "PRICE_INLINE") {
      pendingItemName = null;
      pendingPrice = null;
      const m = line.match(RE_PRICE_INLINE)!;
      emit(m[1], parseFloat(m[2]));
      continue;
    }

    // FORMAT 1: Walmart price-before
    if (tag === "PRICE_BEFORE") {
      pendingItemName = null;
      const m = line.match(RE_PRICE_BEFORE)!;
      pendingPrice = parseFloat(m[1]);
      continue;
    }

    // If we have a pending price and this is TEXT or BARCODE, it's the item name
    if (pendingPrice !== null && (tag === "TEXT" || tag === "BARCODE")) {
      emit(line, pendingPrice);
      pendingPrice = null;
      pendingItemName = null;
      continue;
    }

    // FORMAT 2: price-after — pendingItemName is the item we just named
    if (tag === "PRICE_AFTER") {
      const m = line.match(RE_PRICE_AFTER)!;
      const price = parseFloat(m[1]);
      if (pendingItemName !== null) {
        emit(pendingItemName, price);
        pendingItemName = null;
      }
      continue;
    }

    // Plain TEXT with no pending price
    if (tag === "TEXT") {
      if (pendingItemName !== null) {
        // Two TEXT lines in a row without a price between them.
        // The first TEXT is a subtitle/description for the previously emitted
        // item (e.g. "DUMPLINGS WITH PORK" after SHIRAKIKU's price line).
        // Append it to the last emitted item, then start fresh with this line.
        if (result.lineItems.length > 0) {
          const last = result.lineItems[result.lineItems.length - 1];
          last.description = `${last.description} ${pendingItemName}`.trim();
        }
        pendingItemName = line;
      } else {
        pendingItemName = line;
      }
      continue;
    }

    // BARCODE with no pending price: skip
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
