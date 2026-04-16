"use client";

import { useState } from "react";

const CONFIRMATION_TEXT = "PURGE ALL DATA";

export function DevAdminPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isConfirmed = confirmation === CONFIRMATION_TEXT;

  async function handlePurge() {
    if (!isConfirmed || isSubmitting) return;

    const approved = window.confirm(
      "This will permanently delete all application data and reset the database. Continue?"
    );
    if (!approved) return;

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/dev/purge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to purge database");
      }

      setMessage("Database purged. All rows in the listed tables were truncated.");
      setConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purge database");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "880px" }}>
      <div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#F1F5F9",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Dev Tools
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "14px", fontWeight: 600, margin: "8px 0 0" }}>
          Local development-only tools for resetting the app state.
        </p>
      </div>

      <section
        style={{
          background: "#1E293B",
          border: "1px solid #7F1D1D",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.28)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p
            style={{
              margin: 0,
              color: "#FCA5A5",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            DANGER ZONE
          </p>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: "20px", fontWeight: 800 }}>
            Purge all database data
          </h2>
          <p style={{ margin: 0, color: "#CBD5E1", fontSize: "14px", lineHeight: 1.6 }}>
            This runs the full database reset truncate and removes all current data across admin,
            household, chores, expenses, reminders, rewards, auth, and support tables. This cannot
            be undone.
          </p>
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <p style={{ margin: 0, color: "#E2E8F0", fontSize: "13px", fontWeight: 700 }}>
            Type <span style={{ color: "#FCA5A5" }}>{CONFIRMATION_TEXT}</span> to enable the purge
            button.
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ color: "#94A3B8", fontSize: "13px", fontWeight: 700 }}>
            Confirmation
          </span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={CONFIRMATION_TEXT}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            style={{
              width: "100%",
              background: "#0F172A",
              color: "#F8FAFC",
              border: "1px solid #475569",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "14px",
              fontWeight: 600,
              outline: "none",
            }}
          />
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePurge}
            disabled={!isConfirmed || isSubmitting}
            style={{
              background: !isConfirmed || isSubmitting ? "#7F1D1D80" : "#DC2626",
              color: "#FFF",
              border: "none",
              borderRadius: "10px",
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: !isConfirmed || isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Purging..." : "Purge database"}
          </button>

          <span style={{ color: "#64748B", fontSize: "12px", fontWeight: 600 }}>
            Recommended follow-up: run the seed script if you want sample local data back.
          </span>
        </div>

        {message ? (
          <div
            style={{
              borderRadius: "10px",
              background: "#052E16",
              border: "1px solid #166534",
              color: "#86EFAC",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              borderRadius: "10px",
              background: "#450A0A",
              border: "1px solid #991B1B",
              color: "#FCA5A5",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}
