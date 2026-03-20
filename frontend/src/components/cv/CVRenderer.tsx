import { CVData } from "../../types";
import { getCVTheme } from "../../lib/cvThemes";
import { CVThemeDefinition } from "../../lib/cvThemes";
import { has } from "./templates/templateUtils";
import AtlasTemplate      from "./templates/AtlasTemplate";
import HorizonTemplate    from "./templates/HorizonTemplate";
import PulseTemplate      from "./templates/PulseTemplate";
import GridTemplate       from "./templates/GridTemplate";
import MinimalProTemplate from "./templates/MinimalProTemplate";

// ─── Standard (original single-column) ───────────────────────────────────────
function StandardTemplate({ cvData, t }: { cvData: CVData; t: CVThemeDefinition }) {
  const pi = cvData.personal_info;
  const experience     = (cvData.experience     || []).filter(e => has(e.role) || has(e.company));
  const education      = (cvData.education      || []).filter(e => has(e.institution) || has(e.degree));
  const certifications = (cvData.certifications || []).filter(c => has(c.name));
  const projects       = (cvData.projects       || []).filter(p => has(p.name));
  const awards         = (cvData.awards         || []).filter(a => has(a.title));
  const languages      = (cvData.languages      || []).filter(l => has(l.language));
  const volunteer      = (cvData.volunteer      || []).filter(v => has(v.role) || has(v.organization));
  const skills         = (cvData.skills         || []).filter(s => has(s));
  const contacts       = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.portfolio].filter(has);

  const Sec = ({ label }: { label: string }) => (
    <div style={{ marginTop: "28px", marginBottom: "12px" }}>
      <p style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "0.15em", textTransform: "uppercase", color: t.accent, marginBottom: "6px" }}>
        {label}
      </p>
      <div style={{ borderTop: `1.5px solid ${t.line}` }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 48px 56px", fontFamily: t.fontFamily, color: t.text, background: t.background, fontSize: "12px", lineHeight: "1.6" }}>
      {has(pi.full_name) && <h1 style={{ fontSize: "24px", fontWeight: "700", color: t.accent, marginBottom: "4px", lineHeight: "1.2" }}>{pi.full_name}</h1>}
      {has(pi.job_title) && <p style={{ fontSize: "13px", color: t.secondary, marginBottom: "10px", fontWeight: "400" }}>{pi.job_title}</p>}
      {contacts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: "10.5px", color: t.secondary, marginBottom: "6px" }}>
          {contacts.map((c, i) => <span key={i}>{c}</span>)}
        </div>
      )}
      <div style={{ borderTop: `2px solid ${t.accent}`, marginTop: "12px" }} />

      {has(cvData.summary) && (<><Sec label="Profile" /><p style={{ color: t.text, lineHeight: "1.75" }}>{cvData.summary}</p></>)}

      {experience.length > 0 && (
        <><Sec label="Experience" />
        {experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
              <strong style={{ fontSize: "12.5px" }}>{[exp.role, exp.company].filter(has).join(" — ")}</strong>
              {(has(exp.start_date) || has(exp.end_date)) && (
                <span style={{ fontSize: "10px", color: t.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {exp.start_date}{exp.start_date ? " – " : ""}{exp.current ? "Present" : exp.end_date}
                </span>
              )}
            </div>
            {has(exp.description) && <p style={{ marginTop: "4px", color: t.text, lineHeight: "1.65" }}>{exp.description}</p>}
            {(exp.achievements || []).filter(has).map((a, ai) => <p key={ai} style={{ paddingLeft: "14px", marginTop: "3px", color: t.text, lineHeight: "1.6" }}>• {a}</p>)}
          </div>
        ))}</>
      )}

      {education.length > 0 && (
        <><Sec label="Education" />
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
            {has(edu.grade) && <p style={{ color: t.secondary, fontSize: "11px", marginTop: "2px" }}>{edu.grade}</p>}
          </div>
        ))}</>
      )}

      {skills.length > 0 && (<><Sec label="Skills" /><p style={{ color: t.text, lineHeight: "1.75" }}>{skills.join("  •  ")}</p></>)}

      {certifications.length > 0 && (
        <><Sec label="Certifications" />
        {certifications.map((c, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <strong>{c.name}</strong>
            {has(c.issuer) && <span style={{ color: t.secondary }}> — {c.issuer}{has(c.date) ? ` (${c.date})` : ""}</span>}
          </div>
        ))}</>
      )}

      {projects.length > 0 && (
        <><Sec label="Projects" />
        {projects.map((p, i) => (
          <div key={i} style={{ marginBottom: "14px" }}>
            <strong>{p.name}</strong>
            {has(p.description) && <p style={{ marginTop: "3px", color: t.text, lineHeight: "1.65" }}>{p.description}</p>}
            {(p.technologies || []).filter(has).length > 0 && (
              <p style={{ fontSize: "10.5px", color: t.secondary, marginTop: "3px" }}>Tech: {p.technologies.filter(has).join(", ")}</p>
            )}
          </div>
        ))}</>
      )}

      {awards.length > 0 && (
        <><Sec label="Awards" />
        {awards.map((aw, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <strong>{aw.title}</strong>
            {has(aw.issuer) && <span style={{ color: t.secondary }}> — {aw.issuer}{has(aw.date) ? ` (${aw.date})` : ""}</span>}
          </div>
        ))}</>
      )}

      {languages.length > 0 && (
        <><Sec label="Languages" />
        <p style={{ color: t.text, lineHeight: "1.75" }}>
          {languages.map(l => `${l.language}${has(l.proficiency) ? ` (${l.proficiency})` : ""}`).join("  •  ")}
        </p></>
      )}

      {volunteer.length > 0 && (
        <><Sec label="Volunteer" />
        {volunteer.map((v, i) => (
          <div key={i} style={{ marginBottom: "14px" }}>
            <strong style={{ fontSize: "12.5px" }}>{[v.role, v.organization].filter(has).join(" — ")}</strong>
            {has(v.description) && <p style={{ marginTop: "4px", color: t.text, lineHeight: "1.65" }}>{v.description}</p>}
          </div>
        ))}</>
      )}
    </div>
  );
}

// ─── Public renderer — picks the right template ───────────────────────────────
interface CVRendererProps {
  cvData: CVData;
  theme?: string;
  template?: string;
}

export default function CVRenderer({ cvData, theme = "minimal", template = "standard" }: CVRendererProps) {
  const t = getCVTheme(theme);

  switch (template) {
    case "atlas":       return <AtlasTemplate       cvData={cvData} t={t} />;
    case "horizon":     return <HorizonTemplate     cvData={cvData} t={t} />;
    case "pulse":       return <PulseTemplate       cvData={cvData} t={t} />;
    case "grid":        return <GridTemplate        cvData={cvData} t={t} />;
    case "minimal-pro": return <MinimalProTemplate  cvData={cvData} t={t} />;
    default:            return <StandardTemplate    cvData={cvData} t={t} />;
  }
}