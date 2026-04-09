"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Hard navigation forces a full page reload so the admin layout
        // re-executes server-side with the new session cookie and renders
        // the nav correctly (client-side push would reuse the cached
        // no-nav layout from the login page).
        window.location.href = "/admin";
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#F1F5F9",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#1E293B",
          border: "1px solid #334155",
          borderBottom: "4px solid #6366F1",
          borderRadius: "16px",
          padding: "36px 32px",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#6366F1",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Roost Admin
          </h1>
          <p style={{ color: "#64748B", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
            Internal access only
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em" }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em" }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#F87171",
                fontSize: "13px",
                fontWeight: 700,
                margin: 0,
                padding: "10px 14px",
                background: "#450a0a40",
                border: "1px solid #7f1d1d40",
                borderRadius: "8px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#4338CA" : "#6366F1",
              border: "none",
              borderBottom: "4px solid #4338CA",
              borderRadius: "10px",
              padding: "13px",
              color: "white",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "4px",
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
