import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  id: string;
  title: string;
  body: ReactNode[];
};

interface LegalPageShellProps {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  summaryItems?: string[];
}

export default function LegalPageShell({
  title,
  intro,
  lastUpdated,
  sections,
  summaryItems = [],
}: LegalPageShellProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #B91C1C 0%, #991B1B 220px, #FFF7F7 220px, #FFF7F7 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "24px 20px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 36,
          }}
        >
          <Link
            href="/"
            style={{
              color: "white",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: "-0.04em",
              textDecoration: "none",
            }}
          >
            Roost
          </Link>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/privacy"
              style={{
                color: "rgba(255,255,255,0.9)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              style={{
                color: "rgba(255,255,255,0.9)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Terms
            </Link>
            <Link
              href="/signup"
              style={{
                backgroundColor: "white",
                color: "#991B1B",
                padding: "10px 16px",
                borderRadius: 999,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </div>
        </div>

        <section
          style={{
            backgroundColor: "white",
            borderRadius: 28,
            border: "1px solid #FECACA",
            boxShadow: "0 24px 60px rgba(127, 29, 29, 0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "40px 24px 28px",
              background:
                "linear-gradient(180deg, rgba(254, 226, 226, 0.65) 0%, rgba(255,255,255,0.98) 100%)",
              borderBottom: "1px solid #FEE2E2",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FEE2E2",
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderRadius: 999,
                padding: "6px 12px",
                marginBottom: 18,
              }}
            >
              Legal
            </div>
            <h1
              style={{
                margin: "0 0 10px",
                fontSize: "clamp(2.1rem, 5vw, 3.25rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.05em",
                color: "#111827",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: "0 0 16px",
                maxWidth: 760,
                fontSize: 16,
                lineHeight: 1.7,
                color: "#4B5563",
                fontWeight: 600,
              }}
            >
              {intro}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color: "#991B1B",
              }}
            >
              Last updated: {lastUpdated}
            </p>

            {summaryItems.length > 0 ? (
              <div
                style={{
                  marginTop: 24,
                  display: "grid",
                  gap: 10,
                  padding: "18px 18px 20px",
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.78)",
                  border: "1px solid #FEE2E2",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#991B1B",
                  }}
                >
                  What this page covers
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {summaryItems.map((item) => (
                    <span
                      key={item}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 999,
                        backgroundColor: "#FFF1F2",
                        color: "#9F1239",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ padding: "32px 24px 40px" }}>
            <nav
              aria-label="Legal page sections"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 28,
              }}
            >
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 999,
                    backgroundColor: "#FFF1F2",
                    color: "#991B1B",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {section.title}
                </a>
              ))}
            </nav>

            {sections.map((section) => (
              <section
                id={section.id}
                key={section.title}
                style={{
                  padding: "0 0 28px",
                  marginBottom: 28,
                  borderBottom: "1px solid #F3F4F6",
                  scrollMarginTop: 96,
                }}
              >
                <h2
                  style={{
                    margin: "0 0 14px",
                    fontSize: 24,
                    lineHeight: 1.15,
                    letterSpacing: "-0.03em",
                    color: "#111827",
                  }}
                >
                  {section.title}
                </h2>
                <div style={{ display: "grid", gap: 12 }}>
                  {section.body.map((paragraph, index) => (
                    <p
                      key={`${section.title}-${index}`}
                      style={{
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <Link
                href="/"
                style={{
                  backgroundColor: "#B91C1C",
                  color: "white",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Back to homepage
              </Link>
              <Link
                href="/signup"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "#991B1B",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Create your household
              </Link>
            </div>

            <p
              style={{
                margin: "18px 0 0",
                color: "#6B7280",
                fontSize: 13,
                lineHeight: 1.7,
                fontWeight: 600,
              }}
            >
              These pages describe how Roost currently operates the service and
              may be refined as billing, support, and data-handling practices
              evolve.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
