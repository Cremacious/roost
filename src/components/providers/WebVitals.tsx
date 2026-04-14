"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackWebVital } from "@/lib/observability/client";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const handleWebVital: ReportWebVitalsCallback = (metric) => {
  trackWebVital({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
  });
};

export default function WebVitals() {
  useReportWebVitals(handleWebVital);
  return null;
}
