import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";
import Link from "next/link";

export const metadata = { title: "Roost Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Detect current path via middleware-set header to skip auth on login page
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/admin/login";

  if (!isLoginPage) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!token) redirect("/admin/login");

    const valid = await verifyAdminSession(token);
    if (!valid) redirect("/admin/login");
  }

  if (isLoginPage) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0F172A",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        color: "#F1F5F9",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          background: "#1E293B",
          borderBottom: "1px solid #334155",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontSize: "17px", fontWeight: 900, color: "#6366F1", letterSpacing: "-0.02em" }}>
            Roost Admin
          </span>

          <div style={{ display: "flex", gap: "2px" }}>
            {[
              { href: "/admin", label: "Overview" },
              { href: "/admin/users", label: "Users" },
              { href: "/admin/households", label: "Households" },
              { href: "/admin/promo-codes", label: "Promo Codes" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#94A3B8",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#94A3B8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </form>
      </nav>

      <main style={{ padding: "32px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
