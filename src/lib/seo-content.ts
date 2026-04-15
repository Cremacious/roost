import { comparePages, guidePages, relatedRouteDetails } from "@/lib/seo-content-editorial";
import {
  homepageResourceLinks,
  solutionPages,
  type RouteSummary,
} from "@/lib/seo-content-solutions";

export { comparePages, guidePages, homepageResourceLinks, solutionPages };

export function getRelatedLinks(paths: string[]): RouteSummary[] {
  return paths
    .map((path) => relatedRouteDetails[path])
    .filter((value): value is RouteSummary => Boolean(value));
}

export const allSeoPages = [
  ...Object.values(solutionPages),
  ...Object.values(guidePages),
  ...Object.values(comparePages),
];
