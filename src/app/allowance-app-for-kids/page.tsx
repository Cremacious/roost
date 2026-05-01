import SeoContentPageShell from "@/components/marketing/SeoContentPageShell";
import StructuredDataScript from "@/components/marketing/StructuredDataScript";
import { getRelatedLinks, solutionPages } from "@/lib/seo-content";
import { buildPublicMetadata, getPageJsonLd } from "@/lib/seo";

const page = solutionPages["allowance-app-for-kids"];

export const metadata = buildPublicMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
  keywords: page.keywords,
});

export default function AllowanceAppForKidsPage() {
  return (
    <>
      {getPageJsonLd(page).map((item, index) => (
        <StructuredDataScript key={index} data={item} />
      ))}
      <SeoContentPageShell page={page} relatedLinks={getRelatedLinks(page.relatedPaths)} />
    </>
  );
}
