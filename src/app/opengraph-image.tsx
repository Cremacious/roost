import { ImageResponse } from "next/og";
import { ROOST_BRAND_ACCENT, ROOST_BRAND_BG, ROOST_BRAND_SOFT_BG } from "@/lib/brand";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #7F1D1D 0%, #B91C1C 55%, #F87171 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: ROOST_BRAND_SOFT_BG,
                color: ROOST_BRAND_BG,
                fontSize: "34px",
                fontWeight: 900,
              }}
            >
              R
            </div>
            <div
              style={{
                fontSize: "42px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Roost
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              maxWidth: "860px",
            }}
          >
            <div
              style={{
                fontSize: "66px",
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.06em",
              }}
            >
              Household management for families and roommates
            </div>
            <div
              style={{
                fontSize: "26px",
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Chores, groceries, bills, reminders, calendars, meals, and allowances in one shared app.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
            }}
          >
            {["Chores", "Groceries", "Bills", "Calendar", "Allowances"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 18px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.14)",
                  border: `2px solid ${ROOST_BRAND_ACCENT}`,
                  fontSize: "22px",
                  fontWeight: 700,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
