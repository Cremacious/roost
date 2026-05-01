import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoContentPageShell from "@/components/marketing/SeoContentPageShell";
import StructuredDataScript from "@/components/marketing/StructuredDataScript";
import { comparePages, getRelatedLinks } from "@/lib/seo-content";
import { buildPublicMetadata, getPageJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return Object.keys(comparePages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = comparePages[slug];

  if (!page) {
    return {};
  }

  return buildPublicMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
    type: "article",
  });
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params;
  const page = comparePages[slug];

  if (!page) {
    notFound();
  }

  return (
    <>
      {getPageJsonLd(page).map((item, index) => (
        <StructuredDataScript key={index} data={item} />
      ))}
      <SeoContentPageShell page={page} relatedLinks={getRelatedLinks(page.relatedPaths)} />
    </>
  );
}
