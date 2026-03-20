import { CVData } from "../../types";
import { X } from "lucide-react";
import { useAnnouncement } from "../../context/announcement";

interface Props {
  cvData: CVData;
  theme: string;
  onClose: () => void;
}

const THEME_STYLES: Record<string, { accent: string; secondary: string }> = {
  minimal: { accent: "#0F172A", secondary: "#64748B" },
  classic: { accent: "#1E3A5F", secondary: "#4A5568" },
  sharp:   { accent: "#DC2626", secondary: "#4B5563" },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True only if the string has at least one non-whitespace character */
const has = (s?: string | null) => Boolean(s && s.trim().length > 0);

export default function CVPreview({ cvData, theme, onClose }: Props) {
  const pi = cvData.personal_info;
  const t  = THEME_STYLES[theme] || THEME_STYLES.minimal;
  const { bannerH } = useAnnouncement();

  // ── filtered collections — only items with at least a primary field ─────────
  const experience     = (cvData.experience     || []).filter(e  => has(e.role)       || has(e.company));
  const education      = (cvData.education      || []).filter(e  => has(e.institution) || has(e.degree));
  const certifications = (cvData.certifications || []).filter(c  => has(c.name));
  const projects       = (cvData.projects       || []).filter(p  => has(p.name));
  const awards         = (cvData.awards         || []).filter(a  => has(a.title));
  const languages      = (cvData.languages      || []).filter(l  => has(l.language));
  const volunteer      = (cvData.volunteer      || []).filter(v  => has(v.role)       || has(v.organization));
  const skills         = (cvData.skills         || []).filter(s  => has(s));

  const contactFields = [
    pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.portfolio,
  ].filter(has);

  // ── shared section heading ─────────────────────────────────────────────────
  const Sec = ({ label }: { label: string }) => (
    <div style={{ marginTop: "28px", marginBottom: "12px" }}>
      <p style={{
        fontSize: "9px",
        fontWeight: "800",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: t.accent,
        marginBottom: "6px",
      }}>
        {label}
      </p>
      <div style={{ borderTop: `1.5px solid ${t.accent}`, opacity: 0.15 }} />
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ top: bannerH, transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ash-border flex-shrink-0">
          <span className="text-sm font-medium text-ink">CV Preview</span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable CV body */}
        <div className="overflow-y-auto flex-1">
          <div
            style={{
              maxWidth: "640px",
              margin: "0 auto",
              padding: "48px 48px 56px",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              color: "#1A1A1A",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            {/* ── Name & title ── */}
            {has(pi.full_name) && (
              <h1 style={{ fontSize: "24px", fontWeight: "700", color: t.accent, marginBottom: "4px", lineHeight: "1.2" }}>
                {pi.full_name}
              </h1>
            )}
            {has(pi.job_title) && (
              <p style={{ fontSize: "13px", color: t.secondary, marginBottom: "10px", fontWeight: "400" }}>
                {pi.job_title}
              </p>
            )}

            {/* ── Contact row ── */}
            {contactFields.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: "10.5px", color: t.secondary, marginBottom: "6px" }}>
                {contactFields.map((c, i) => <span key={i}>{c}</span>)}
              </div>
            )}

            {/* Top rule */}
            <div style={{ borderTop: `2px solid ${t.accent}`, marginTop: "12px" }} />

            {/* ── Summary ── */}
            {has(cvData.summary) && (
              <>
                <Sec label="Profile" />
                <p style={{ color: "#2D2D2D", lineHeight: "1.75" }}>{cvData.summary}</p>
              </>
            )}

            {/* ── Experience ── */}
            {experience.length > 0 && (
              <>
                <Sec label="Experience" />
                {experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                      <strong style={{ fontSize: "12.5px" }}>
                        {[exp.role, exp.company].filter(has).join(" — ")}
                      </strong>
                      {(has(exp.start_date) || has(exp.end_date)) && (
                        <span style={{ fontSize: "10px", color: t.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {exp.start_date}{exp.start_date ? " – " : ""}{exp.current ? "Present" : exp.end_date}
                        </span>
                      )}
                    </div>
                    {has(exp.description) && (
                      <p style={{ marginTop: "4px", color: "#3D3D3D", lineHeight: "1.65" }}>{exp.description}</p>
                    )}
                    {(exp.achievements || []).filter(has).map((a, ai) => (
                      <p key={ai} style={{ paddingLeft: "14px", marginTop: "3px", color: "#3D3D3D", lineHeight: "1.6" }}>
                        • {a}
                      </p>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* ── Education ── */}
            {education.length > 0 && (
              <>
                <Sec label="Education" />
                {education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                      <strong style={{ fontSize: "12.5px" }}>
                        {[has(edu.degree) && `${edu.degree}${has(edu.field) ? `, ${edu.field}` : ""}`, edu.institution].filter(Boolean).join(" — ")}
                      </strong>
                      {(has(edu.start_date) || has(edu.end_date)) && (
                        <span style={{ fontSize: "10px", color: t.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {edu.start_date}{edu.start_date ? " – " : ""}{edu.end_date}
                        </span>
                      )}
                    </div>
                    {has(edu.grade) && (
                      <p style={{ color: t.secondary, fontSize: "11px", marginTop: "2px" }}>{edu.grade}</p>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── Skills ── */}
            {skills.length > 0 && (
              <>
                <Sec label="Skills" />
                <p style={{ color: "#2D2D2D", lineHeight: "1.75" }}>{skills.join("  •  ")}</p>
              </>
            )}

            {/* ── Certifications ── */}
            {certifications.length > 0 && (
              <>
                <Sec label="Certifications" />
                {certifications.map((c, i) => (
                  <div key={i} style={{ marginBottom: "10px" }}>
                    <strong>{c.name}</strong>
                    {has(c.issuer) && <span style={{ color: t.secondary }}> — {c.issuer}{has(c.date) ? ` (${c.date})` : ""}</span>}
                    {has(c.url) && <p style={{ fontSize: "10px", color: t.secondary, marginTop: "2px" }}>{c.url}</p>}
                  </div>
                ))}
              </>
            )}

            {/* ── Projects ── */}
            {projects.length > 0 && (
              <>
                <Sec label="Projects" />
                {projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <strong>{p.name}</strong>
                    {has(p.description) && <p style={{ marginTop: "3px", color: "#3D3D3D", lineHeight: "1.65" }}>{p.description}</p>}
                    {(p.technologies || []).filter(has).length > 0 && (
                      <p style={{ fontSize: "10.5px", color: t.secondary, marginTop: "3px" }}>
                        Tech: {p.technologies.filter(has).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── Awards ── */}
            {awards.length > 0 && (
              <>
                <Sec label="Awards" />
                {awards.map((aw, i) => (
                  <div key={i} style={{ marginBottom: "10px" }}>
                    <strong>{aw.title}</strong>
                    {has(aw.issuer) && <span style={{ color: t.secondary }}> — {aw.issuer}{has(aw.date) ? ` (${aw.date})` : ""}</span>}
                  </div>
                ))}
              </>
            )}

            {/* ── Languages ── */}
            {languages.length > 0 && (
              <>
                <Sec label="Languages" />
                <p style={{ color: "#2D2D2D", lineHeight: "1.75" }}>
                  {languages.map(l => `${l.language}${has(l.proficiency) ? ` (${l.proficiency})` : ""}`).join("  •  ")}
                </p>
              </>
            )}

            {/* ── Volunteer ── */}
            {volunteer.length > 0 && (
              <>
                <Sec label="Volunteer" />
                {volunteer.map((v, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                      <strong style={{ fontSize: "12.5px" }}>
                        {[v.role, v.organization].filter(has).join(" — ")}
                      </strong>
                      {(has(v.start_date) || has(v.end_date)) && (
                        <span style={{ fontSize: "10px", color: t.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {v.start_date}{v.start_date ? " – " : ""}{v.end_date}
                        </span>
                      )}
                    </div>
                    {has(v.description) && (
                      <p style={{ marginTop: "4px", color: "#3D3D3D", lineHeight: "1.65" }}>{v.description}</p>
                    )}
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