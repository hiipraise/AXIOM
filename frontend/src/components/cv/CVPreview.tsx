import { CVData } from "../../types";
import { X } from "lucide-react";
import { useAnnouncement } from "../../context/announcement";

interface Props {
  cvData: CVData;
  theme: string;
  onClose: () => void;
}

const THEME_STYLES: Record<string, { accent: string; secondary: string }> = {
  minimal: { accent: "#0F172A", secondary: "#555555" },
  classic: { accent: "#1E3A5F", secondary: "#4A4A4A" },
  sharp: { accent: "#DC2626", secondary: "#3F3F3F" },
};

export default function CVPreview({ cvData, theme, onClose }: Props) {
  const pi = cvData.personal_info;
  const t = THEME_STYLES[theme] || THEME_STYLES.minimal;

  const Sec = ({ label }: { label: string }) => (
    <div className="mt-5 mb-2">
      <p
        className="text-[10px] font-bold tracking-widest uppercase"
        style={{ color: t.accent }}
      >
        {label}
      </p>
      <div className="border-t mt-1" style={{ borderColor: "#E2E8F0" }} />
    </div>
  );

      const { bannerH } = useAnnouncement()
  

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ash-border">
          <span className="text-sm font-medium text-ink">CV Preview</span>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-8">
          <div
            className="max-w-[600px] mx-auto"
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              color: "#111111",
              fontSize: "12px",
            }}
          >
            {/* Header */}
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: t.accent,
                marginBottom: "4px",
              }}
            >
              {pi.full_name || "Your Name"}
            </h1>
            {pi.job_title && (
              <p style={{ color: t.secondary, marginBottom: "6px" }}>
                {pi.job_title}
              </p>
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                color: t.secondary,
                fontSize: "11px",
                marginBottom: "4px",
              }}
            >
              {[
                pi.email,
                pi.phone,
                pi.location,
                pi.linkedin,
                pi.github,
                pi.portfolio,
              ]
                .filter(Boolean)
                .map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
            </div>
            <div
              style={{
                borderTop: `2px solid ${t.accent}`,
                marginBottom: "4px",
              }}
            />

            {cvData.summary && (
              <>
                <Sec label="Profile" />
                <p style={{ lineHeight: "1.6" }}>{cvData.summary}</p>
              </>
            )}

            {cvData.experience.length > 0 && (
              <>
                <Sec label="Experience" />
                {cvData.experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <strong>
                        {exp.role} — {exp.company}
                      </strong>
                      <span style={{ fontSize: "10px", color: t.secondary }}>
                        {exp.start_date}
                        {exp.start_date && " – "}
                        {exp.current ? "Present" : exp.end_date}
                      </span>
                    </div>
                    {exp.description && (
                      <p style={{ marginTop: "2px", lineHeight: "1.5" }}>
                        {exp.description}
                      </p>
                    )}
                    {exp.achievements.map((a, ai) => (
                      <p
                        key={ai}
                        style={{ paddingLeft: "12px", marginTop: "2px" }}
                      >
                        • {a}
                      </p>
                    ))}
                  </div>
                ))}
              </>
            )}

            {cvData.education.length > 0 && (
              <>
                <Sec label="Education" />
                {cvData.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <strong>
                        {edu.degree}
                        {edu.field ? `, ${edu.field}` : ""} — {edu.institution}
                      </strong>
                      <span style={{ fontSize: "10px", color: t.secondary }}>
                        {edu.start_date}
                        {edu.start_date && " – "}
                        {edu.end_date}
                      </span>
                    </div>
                    {edu.grade && (
                      <p style={{ color: t.secondary, fontSize: "11px" }}>
                        {edu.grade}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {cvData.skills.length > 0 && (
              <>
                <Sec label="Skills" />
                <p>{cvData.skills.join(", ")}</p>
              </>
            )}

            {cvData.certifications.length > 0 && (
              <>
                <Sec label="Certifications" />
                {cvData.certifications.map((c, i) => (
                  <div key={i} style={{ marginBottom: "6px" }}>
                    <strong>{c.name}</strong>
                    <span style={{ color: t.secondary }}>
                      {" "}
                      — {c.issuer}
                      {c.date ? ` (${c.date})` : ""}
                    </span>
                    {c.url && (
                      <p style={{ fontSize: "10px", color: t.secondary }}>
                        {c.url}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {cvData.projects.length > 0 && (
              <>
                <Sec label="Projects" />
                {cvData.projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <strong>{p.name}</strong>
                    {p.description && <p>{p.description}</p>}
                    {p.technologies.length > 0 && (
                      <p style={{ fontSize: "10px", color: t.secondary }}>
                        Tech: {p.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {cvData.awards.length > 0 && (
              <>
                <Sec label="Awards" />
                {cvData.awards.map((aw, i) => (
                  <div key={i} style={{ marginBottom: "6px" }}>
                    <strong>{aw.title}</strong>
                    <span style={{ color: t.secondary }}>
                      {" "}
                      — {aw.issuer}
                      {aw.date ? ` (${aw.date})` : ""}
                    </span>
                  </div>
                ))}
              </>
            )}

            {cvData.languages.length > 0 && (
              <>
                <Sec label="Languages" />
                <p>
                  {cvData.languages
                    .map(
                      (l) =>
                        `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`,
                    )
                    .join("  •  ")}
                </p>
              </>
            )}

            {cvData.volunteer.length > 0 && (
              <>
                <Sec label="Volunteer" />
                {cvData.volunteer.map((v, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <strong>
                      {v.role} — {v.organization}
                    </strong>
                    <span style={{ fontSize: "10px", color: t.secondary }}>
                      {" "}
                      {v.start_date}
                      {v.start_date && " – "}
                      {v.end_date}
                    </span>
                    {v.description && <p>{v.description}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
