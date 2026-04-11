import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Roost — Homes run better with Roost.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#EF4444",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 20,
          }}
        >
          Roost
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.82)",
          }}
        >
          Homes run better with Roost.
        </div>
      </div>
    ),
    { ...size }
  );
}
