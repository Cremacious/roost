import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";

export interface ParsedReceipt {
  merchant?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  lineItems: { description: string; amount: number }[];
}

function detectContentType(base64: string): "image/jpeg" | "image/png" | "image/heic" {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("AAAAF") || base64.startsWith("AAAA")) return "image/heic";
  return "image/jpeg"; // safe default
}

export async function parseReceiptImage(imageBase64: string): Promise<ParsedReceipt> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error("Azure Document Intelligence credentials not configured");
  }

  console.log("[Azure] Starting receipt analysis...");

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

  // Strip data URL prefix if present
  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const buffer = Buffer.from(cleanBase64, "base64");
  const contentType = detectContentType(cleanBase64);

  const poller = await client.beginAnalyzeDocument("prebuilt-receipt", buffer, { contentType });
  const result = await poller.pollUntilDone();
  const doc = result.documents?.[0];

  if (!doc) {
    console.log("[Azure] No document detected in image");
    return { lineItems: [] };
  }

  const fields = doc.fields;

  const merchant = fields?.MerchantName?.value as string | undefined;

  const dateVal = fields?.TransactionDate?.value;
  const date = dateVal
    ? new Date(dateVal as string).toLocaleDateString("en-US")
    : undefined;

  const subtotal = fields?.Subtotal?.value as number | undefined;
  const tax = fields?.TotalTax?.value as number | undefined;
  const total = fields?.Total?.value as number | undefined;

  const lineItems: { description: string; amount: number }[] = [];

  const itemsField = fields?.Items;
  if (itemsField?.values) {
    for (const item of itemsField.values) {
      const f = item.properties;
      const description = (f?.Description?.value as string | undefined)?.trim() ?? "";
      const amount =
        (f?.TotalPrice?.value as number | undefined) ??
        (f?.Price?.value as number | undefined) ??
        0;
      if (description.length > 0 && amount > 0) {
        lineItems.push({ description, amount });
      }
    }
  }

  console.log("[Azure] Merchant:", merchant ?? "unknown");
  console.log("[Azure] Subtotal:", subtotal, "| Tax:", tax, "| Total:", total);
  console.log("[Azure] Line items found:", lineItems.length);
  lineItems.forEach((i) => console.log("  -", i.description, "$" + i.amount.toFixed(2)));

  return { merchant, date, subtotal, tax, total, lineItems };
}
