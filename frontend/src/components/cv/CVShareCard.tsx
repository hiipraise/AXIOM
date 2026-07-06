import { useMemo } from "react";

export interface CVShareCardProps {
  fullName: string;
  jobTitle: string;
  summary: string;
  skills: string[];
  location: string;
  publicUrl: string;
  username: string;
}

// ─── Card dimensions (1200×630 = OG image ratio, good for social sharing) ───
export const SHARE_CARD_W = 1200;
export const SHARE_CARD_H = 630;

export default function CVShareCard({
  fullName,
  jobTitle,
  summary,
  skills,
  location,
  publicUrl,
  username,
}: CVShareCardProps) {
  const displaySkills = useMemo(() => skills.slice(0, 6), [skills]);
  const displaySummary = useMemo(
    () => (summary.length > 160 ? summary.slice(0, 157) + "..." : summary),
    [summary],
  );

  return (
    <div
      style={{
        width: SHARE_CARD_W,
        height: SHARE_CARD_H,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none" as const,
        }}
      />

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header: AXIOM logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <img
            src="/axiom_bg.png"
            alt="AXIOM"
            style={{
              width: 36,
              height: 36,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#ffffff",
              fontFamily: "Inter, sans-serif",
            }}
          >
            AXIOM CV
          </span>
        </div>

        {/* Name & title */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.15,
              margin: 0,
              color: "#ffffff",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {fullName || `@${username}`}
          </h1>
          {jobTitle && (
            <p
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: "rgba(255,255,255,0.7)",
                margin: "6px 0 0 0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {jobTitle}
              {location ? ` · ${location}` : ""}
            </p>
          )}
        </div>

        {/* Summary */}
        {displaySummary && (
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.6)",
              margin: 0,
              maxWidth: 700,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {displaySummary}
          </p>
        )}

        {/* Skills */}
        {displaySkills.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: "auto",
              paddingTop: 24,
            }}
          >
            {displaySkills.map((skill) => (
              <span
                key={skill}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Footer: public URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "Inter, monospace",
              fontFeatureSettings: "'liga' 0",
            }}
          >
            {publicUrl}
          </span>
        </div>
      </div>
    </div>
  );
}
