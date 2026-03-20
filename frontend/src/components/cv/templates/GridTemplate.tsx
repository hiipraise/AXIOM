import { TemplateProps, has, contactItems } from "./templateUtils";

export default function GridTemplate({ cvData, t }: TemplateProps) {
  const pi = cvData.personal_info;
  const contacts = contactItems(pi);

  const experience = cvData.experience.filter(
    (e) => has(e.role) || has(e.company),
  );
  const education = cvData.education.filter(
    (e) => has(e.institution) || has(e.degree),
  );
  const skills = cvData.skills;
  const certs = cvData.certifications.filter((c) => has(c.name));
  const langs = cvData.languages.filter((l) => has(l.language));
  const projects = cvData.projects.filter((p) => has(p.name));
  const awards = cvData.awards.filter((a) => has(a.title));
  const volunteer = cvData.volunteer.filter(
    (v) => has(v.role) || has(v.organization),
  );

  const boxLabel = (text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `2px solid ${t.accent}`,
      }}
    >
      <p
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: t.accent,
        }}
      >
        {text}
      </p>
    </div>
  );

  const Box = ({
    children,
    style = {},
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <div
      style={{
        border: `1px solid ${t.line}`,
        borderRadius: 8,
        padding: "16px 18px",
        background: t.background,
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        fontFamily: t.fontFamily,
        color: t.text,
        background: `${t.accent}06`,
        padding: "32px 32px 40px",
      }}
    >
      {/* ── Header card ── */}
      <div
        style={{
          background: t.background,
          border: `1px solid ${t.line}`,
          borderRadius: 10,
          padding: "24px 28px",
          marginBottom: 20,
          borderLeft: `4px solid ${t.accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            {has(pi.full_name) && (
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: t.accent,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.1,
                  marginBottom: 4,
                }}
              >
                {pi.full_name}
              </h1>
            )}
            {has(pi.job_title) && (
              <p style={{ fontSize: 12, color: t.secondary, fontWeight: 400 }}>
                {pi.job_title}
              </p>
            )}
          </div>
          {contacts.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {contacts.map((c, i) => (
                <p key={i} style={{ fontSize: 9.5, color: t.secondary }}>
                  {c}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary ── */}
      {has(cvData.summary) && (
        <Box style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10.5, lineHeight: 1.7, color: t.text }}>
            {cvData.summary}
          </p>
        </Box>
      )}

      {/* ── Main grid ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Left column — 62% */}
        <div
          style={{
            flex: "1 1 62%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {experience.length > 0 && (
            <Box>
              {boxLabel("Experience")}
              {experience.map((exp, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: i < experience.length - 1 ? 14 : 0,
                    marginBottom: i < experience.length - 1 ? 14 : 0,
                    borderBottom:
                      i < experience.length - 1
                        ? `1px dashed ${t.line}`
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "baseline",
                    }}
                  >
                    <p
                      style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}
                    >
                      {exp.role}
                    </p>
                    {(has(exp.start_date) || has(exp.end_date)) && (
                      <p
                        style={{
                          fontSize: 9,
                          color: t.secondary,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {exp.start_date}
                        {exp.start_date ? "–" : ""}
                        {exp.current ? "Present" : exp.end_date}
                      </p>
                    )}
                  </div>
                  {has(exp.company) && (
                    <p
                      style={{
                        fontSize: 10,
                        color: t.accent,
                        fontWeight: 600,
                        marginBottom: 5,
                      }}
                    >
                      {exp.company}
                    </p>
                  )}
                  {has(exp.description) && (
                    <p
                      style={{ fontSize: 9.5, lineHeight: 1.65, color: t.text }}
                    >
                      {exp.description}
                    </p>
                  )}
                  {(exp.achievements || []).filter(has).map((a, ai) => (
                    <p
                      key={ai}
                      style={{
                        fontSize: 9.5,
                        lineHeight: 1.55,
                        marginTop: 3,
                        paddingLeft: 10,
                        color: t.text,
                      }}
                    >
                      • {a}
                    </p>
                  ))}
                </div>
              ))}
            </Box>
          )}

          {education.length > 0 && (
            <Box>
              {boxLabel("Education")}
              {education.map((edu, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: i < education.length - 1 ? 12 : 0,
                    marginBottom: i < education.length - 1 ? 12 : 0,
                    borderBottom:
                      i < education.length - 1
                        ? `1px dashed ${t.line}`
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 700 }}>
                      {edu.degree}
                      {has(edu.field) ? `, ${edu.field}` : ""}
                    </p>
                    {(has(edu.start_date) || has(edu.end_date)) && (
                      <p
                        style={{
                          fontSize: 9,
                          color: t.secondary,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {edu.start_date}
                        {edu.start_date ? "–" : ""}
                        {edu.end_date}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: t.secondary, marginTop: 2 }}>
                    {edu.institution}
                  </p>
                  {has(edu.grade) && (
                    <p
                      style={{
                        fontSize: 9.5,
                        color: t.secondary,
                        marginTop: 2,
                      }}
                    >
                      {edu.grade}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}

          {volunteer.length > 0 && (
            <Box>
              {boxLabel("Volunteer")}
              {volunteer.map((v, i) => (
                <div
                  key={i}
                  style={{ marginBottom: i < volunteer.length - 1 ? 12 : 0 }}
                >
                  <p style={{ fontSize: 11, fontWeight: 700 }}>{v.role}</p>
                  {has(v.organization) && (
                    <p style={{ fontSize: 10, color: t.secondary }}>
                      {v.organization}
                    </p>
                  )}
                  {has(v.description) && (
                    <p style={{ fontSize: 9.5, lineHeight: 1.6, marginTop: 3 }}>
                      {v.description}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}
        </div>

        {/* Right column — 38% */}
        <div
          style={{
            flex: "0 0 38%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {skills.length > 0 && (
            <Box>
              {boxLabel("Skills")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9.5,
                      padding: "3px 9px",
                      background: `${t.accent}10`,
                      border: `1px solid ${t.accent}30`,
                      borderRadius: 4,
                      color: t.text,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Box>
          )}

          {projects.length > 0 && (
            <Box>
              {boxLabel("Projects")}
              {projects.map((p, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: i < projects.length - 1 ? 12 : 0,
                    paddingBottom: i < projects.length - 1 ? 12 : 0,
                    borderBottom:
                      i < projects.length - 1 ? `1px dashed ${t.line}` : "none",
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 700, color: t.text }}>
                    {p.name}
                  </p>
                  {has(p.description) && (
                    <p
                      style={{
                        fontSize: 9.5,
                        color: t.secondary,
                        lineHeight: 1.5,
                        marginTop: 3,
                      }}
                    >
                      {p.description}
                    </p>
                  )}
                  {(p.technologies || []).filter(has).length > 0 && (
                    <p style={{ fontSize: 9, color: t.accent, marginTop: 3 }}>
                      {p.technologies.filter(has).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}

          {certs.length > 0 && (
            <Box>
              {boxLabel("Certifications")}
              {certs.map((c, i) => (
                <div
                  key={i}
                  style={{ marginBottom: i < certs.length - 1 ? 10 : 0 }}
                >
                  <p style={{ fontSize: 10.5, fontWeight: 600 }}>{c.name}</p>
                  {has(c.issuer) && (
                    <p style={{ fontSize: 9.5, color: t.secondary }}>
                      {c.issuer}
                      {has(c.date) ? ` · ${c.date}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}

          {langs.length > 0 && (
            <Box>
              {boxLabel("Languages")}
              {langs.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <p style={{ fontSize: 10.5, fontWeight: 500 }}>
                    {l.language}
                  </p>
                  {has(l.proficiency) && (
                    <p style={{ fontSize: 9.5, color: t.secondary }}>
                      {l.proficiency}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}

          {awards.length > 0 && (
            <Box>
              {boxLabel("Awards")}
              {awards.map((a, i) => (
                <div
                  key={i}
                  style={{ marginBottom: i < awards.length - 1 ? 10 : 0 }}
                >
                  <p style={{ fontSize: 10.5, fontWeight: 600 }}>{a.title}</p>
                  {has(a.issuer) && (
                    <p style={{ fontSize: 9.5, color: t.secondary }}>
                      {a.issuer}
                    </p>
                  )}
                </div>
              ))}
            </Box>
          )}
        </div>
      </div>
    </div>
  );
}
