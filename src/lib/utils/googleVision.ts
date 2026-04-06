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
  if (!apiKey) throw new Error("Google Vision API key not configured");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Google Vision API request failed");
  }

  const data = await response.json();
  const fullText = data.responses?.[0]?.textAnnotations?.[0]?.description ?? "";

  return parseReceiptText(fullText);
}

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: ParsedReceipt = { lineItems: [], rawText: text };

  const totalPatterns = /total|amount due|balance due|grand total/i;
  const subtotalPatterns = /subtotal|sub-total/i;
  const taxPatterns = /tax|hst|gst|vat/i;
  const skipPatterns =
    /thank you|receipt|welcome|visit|www\.|\.com|phone|tel:|cashier|register|change|cash|credit|debit|visa|mastercard|approved|auth/i;

  result.merchant = lines[0] ?? undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const amountMatch = line.match(/\$?(\d+\.\d{2})/);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1]);
    const label = line.replace(/\$?\d+\.\d{2}/, "").trim();

    if (totalPatterns.test(line)) {
      result.total = amount;
    } else if (subtotalPatterns.test(line)) {
      result.subtotal = amount;
    } else if (taxPatterns.test(line)) {
      result.tax = amount;
    } else if (!skipPatterns.test(line) && label.length > 0) {
      result.lineItems.push({
        description: label || `Item ${result.lineItems.length + 1}`,
        amount,
      });
    }
  }

  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      result.date = dateMatch[0];
      break;
    }
  }

  if (!result.total && result.lineItems.length > 0) {
    result.total = result.lineItems.reduce((sum, item) => sum + item.amount, 0);
  }

  return result;
}
