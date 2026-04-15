import Link from "next/link";
import type { SeoPage } from "@/lib/seo";

type RelatedLink = {
  href: string;
  label: string;
  description: string;
};

interface SeoContentPageShellProps {
  page: SeoPage;
  relatedLinks: RelatedLink[];
}

export default function SeoContentPageShell({
  page,
  relatedLinks,
}: SeoContentPageShellProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #B91C1C 0%, #991B1B 240px, #FFF7F7 240px, #FFF7F7 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "24px 20px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 32,
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
              href="/login"
              style={{
                color: "rgba(255,255,255,0.88)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign in
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
              Create your household
            </Link>
          </div>
        </div>

        <article
          style={{
            backgroundColor: "white",
            borderRadius: 28,
            border: "1px solid #FECACA",
            boxShadow: "0 24px 60px rgba(127, 29, 29, 0.12)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              padding: "40px 24px 28px",
              background:
                "linear-gradient(180deg, rgba(254, 226, 226, 0.7) 0%, rgba(255,255,255,0.98) 100%)",
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
              {page.eyebrow}
            </div>
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.05em",
                color: "#111827",
                maxWidth: 820,
              }}
            >
              {page.heroTitle}
            </h1>
            <p
              style={{
                margin: "0 0 18px",
                maxWidth: 820,
                fontSize: 17,
                lineHeight: 1.7,
                color: "#4B5563",
                fontWeight: 600,
              }}
            >
              {page.heroDescription}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  backgroundColor: "#B91C1C",
                  color: "white",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Start free
              </Link>
              <Link
                href="/"
                style={{
                  backgroundColor: "#FFF1F2",
                  color: "#991B1B",
                  padding: "12px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                See the product overview
              </Link>
            </div>

            <div
              style={{
                marginTop: 24,
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {page.intent.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.82)",
                    border: "1px solid #FEE2E2",
                    color: "#881337",
                    fontWeight: 800,
                    lineHeight: 1.4,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </header>

          <div style={{ padding: "32px 24px 40px" }}>
            <div style={{ display: "grid", gap: 28 }}>
              {page.sections.map((section) => (
                <section
                  key={section.title}
                  style={{
                    paddingBottom: 28,
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 14px",
                      fontSize: 26,
                      lineHeight: 1.15,
                      letterSpacing: "-0.03em",
                      color: "#111827",
                    }}
                  >
                    {section.title}
                  </h2>
                  <div style={{ display: "grid", gap: 12 }}>
                    {section.paragraphs.map((paragraph, index) => (
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
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 20,
                          display: "grid",
                          gap: 10,
                          color: "#374151",
                        }}
                      >
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            style={{
                              fontSize: 15,
                              lineHeight: 1.7,
                              fontWeight: 700,
                            }}
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            <section style={{ padding: "32px 0", borderBottom: "1px solid #F3F4F6" }}>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: 26,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "#111827",
                }}
              >
                Frequently asked questions
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {page.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    style={{
                      border: "1px solid #FECACA",
                      borderRadius: 18,
                      padding: "16px 18px",
                      backgroundColor: "#FFF7F7",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontWeight: 800,
                        color: "#7F1D1D",
                        lineHeight: 1.5,
                      }}
                    >
                      {faq.question}
                    </summary>
                    <p
                      style={{
                        margin: "12px 0 0",
                        fontSize: 15,
                        lineHeight: 1.75,
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section style={{ paddingTop: 32 }}>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: 26,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "#111827",
                }}
              >
                Keep exploring
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: "block",
                      padding: "18px 18px 20px",
                      borderRadius: 20,
                      border: "1px solid #FECACA",
                      backgroundColor: "white",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        color: "#991B1B",
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 8,
                      }}
                    >
                      Related page
                    </div>
                    <div
                      style={{
                        color: "#111827",
                        fontSize: 18,
                        fontWeight: 900,
                        lineHeight: 1.25,
                        marginBottom: 8,
                      }}
                    >
                      {link.label}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#4B5563",
                        lineHeight: 1.65,
                        fontWeight: 600,
                      }}
                    >
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
