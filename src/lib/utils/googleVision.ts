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

export async function parseReceiptImage(imageBase64: string): Promise<ParsedReceipt> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  console.log("[Vision] API key present:", !!apiKey, "| prefix:", apiKey?.substring(0, 8));

  if (!apiKey) throw new Error("Google Vision API key not configured");

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
    const errorBody = await response
      .json()
      .catch(() => response.text())
      .catch(() => "Could not read error body");
    console.error("[Vision] API error response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(`Google Vision API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const fullText = data.responses?.[0]?.textAnnotations?.[0]?.description ?? "";

  // Debug: log raw Vision output to server terminal
  console.log(
    "[Vision] raw text:",
    fullText.substring(0, 500)
  );

  return parseReceiptText(fullText);
}

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ParsedReceipt = { lineItems: [], rawText: text };

  if (lines.length === 0) return result;

  result.merchant = lines[0];

  const totalPattern = /total|amount due|balance|grand total|tot[ae]l/i;
  const subtotalPattern = /sub.?total/i;
  const taxPattern = /\btax\b|hst|gst|vat|pst/i;

  // Only hard-skip lines that are clearly non-item metadata
  const hardSkip =
    /^(thank|welcome|receipt #|cashier|register #|server:|table:|auth|approval|ref #|trans|card:|visa|master|amex|discover|change:|cash:|debit:|credit:)/i;

  // Extract an amount from the end of a line (handles $X.XX, X.XX, X,XX)
  function extractAmount(str: string): number | null {
    const cleaned = str.replace(/,/g, ".");
    const matches = cleaned.match(/\$?\s*(\d{1,6}\.?\d{0,2})\s*$/);
    if (!matches) return null;
    const val = parseFloat(matches[1]);
    if (isNaN(val) || val <= 0 || val > 99999) return null;
    return val;
  }

  // Extract any amount anywhere in a string (used for total fallback)
  function extractAmountAnywhere(str: string): number | null {
    const cleaned = str.replace(/,/g, ".");
    const matches = [...cleaned.matchAll(/\$?\s*(\d{1,6}\.\d{2})/g)];
    if (matches.length === 0) return null;
    const val = parseFloat(matches[matches.length - 1][1]);
    if (isNaN(val) || val <= 0) return null;
    return val;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (hardSkip.test(line)) continue;
    if (line.length < 2) continue;

    const amount = extractAmount(line);

    if (amount !== null) {
      // Strip the trailing amount and noise chars to get a label
      const label = line
        .replace(/\$?\s*\d{1,6}\.?\d{0,2}\s*$/, "")
        .replace(/[*@#]/g, "")
        .trim();

      if (totalPattern.test(line)) {
        result.total = amount;
        continue;
      }

      if (subtotalPattern.test(line)) {
        result.subtotal = amount;
        continue;
      }

      if (taxPattern.test(line)) {
        result.tax = amount;
        continue;
      }

      if (label.length >= 1) {
        // Same-line: "Milk 2.99"
        result.lineItems.push({
          description: label,
          amount,
        });
      } else if (i > 0) {
        // Price-only line: look at previous line for description
        const prevLine = lines[i - 1];
        if (
          !hardSkip.test(prevLine) &&
          !extractAmount(prevLine) &&
          prevLine.length > 1 &&
          !totalPattern.test(prevLine) &&
          !taxPattern.test(prevLine)
        ) {
          result.lineItems.push({
            description: prevLine,
            amount,
          });
        }
      }
    }
  }

  // Total fallback: find last line matching total pattern with any amount
  if (!result.total) {
    const totalLine = [...lines].reverse().find(
      (l) => totalPattern.test(l) && extractAmountAnywhere(l) !== null
    );
    if (totalLine) {
      result.total = extractAmountAnywhere(totalLine) ?? undefined;
    }
  }

  // Last resort: sum line items
  if (!result.total && result.lineItems.length > 0) {
    result.total = parseFloat(
      result.lineItems.reduce((s, i) => s + i.amount, 0).toFixed(2)
    );
  }

  // Date extraction
  const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/;
  for (const line of lines) {
    const m = line.match(datePattern);
    if (m) {
      result.date = m[1];
      break;
    }
  }

  return result;
}
