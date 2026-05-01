import { sanitizeJsonLd } from "@/lib/seo";

export default function StructuredDataScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(data) }}
    />
  );
}
