import { TemplateProps, has, contactItems } from './templateUtils'

export default function MinimalProTemplate({ cvData, t }: TemplateProps) {
  const pi = cvData.personal_info
  const contacts = contactItems(pi)

  const experience  = cvData.experience.filter(e => has(e.role) || has(e.company))
  const education   = cvData.education.filter(e => has(e.institution) || has(e.degree))
  const skills      = cvData.skills
  const certs       = cvData.certifications.filter(c => has(c.name))
  const langs       = cvData.languages.filter(l => has(l.language))
  const projects    = cvData.projects.filter(p => has(p.name))
  const awards      = cvData.awards.filter(a => has(a.title))
  const volunteer   = cvData.volunteer.filter(v => has(v.role) || has(v.organization))

  const LABEL_W = 100

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{
      display: 'flex', gap: 0,
      marginBottom: 0,
      paddingTop: 20, paddingBottom: 20,
      borderBottom: `1px solid ${t.line}`,
    }}>
      {/* Label */}
      <div style={{ width: LABEL_W, flexShrink: 0, paddingTop: 1 }}>
        <p style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: t.secondary,
        }}>{label}</p>
      </div>
      {/* Content */}
      <div style={{
        flex: 1,
        paddingLeft: 20,
        borderLeft: `2px solid ${t.accent}`,
      }}>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{
      fontFamily: t.fontFamily, color: t.text,
      background: t.background,
      padding: '52px 52px 60px',
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        {has(pi.full_name) && (
          <h1 style={{
            fontSize: 34, fontWeight: 800, color: t.text,
            letterSpacing: '-0.04em', lineHeight: 1.0,
            marginBottom: 8,
          }}>{pi.full_name}</h1>
        )}
        {has(pi.job_title) && (
          <p style={{
            fontSize: 14, color: t.secondary, fontWeight: 400,
            letterSpacing: '-0.01em', marginBottom: 14,
          }}>{pi.job_title}</p>
        )}
        {contacts.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '2px 16px',
            fontSize: 9.5, color: t.secondary,
          }}>
            {contacts.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
        <div style={{
          borderBottom: `3px solid ${t.text}`,
          marginTop: 24,
        }} />
      </div>

      {/* ── Summary ── */}
      {has(cvData.summary) && (
        <Row label="Profile">
          <p style={{ fontSize: 10.5, lineHeight: 1.8, color: t.text }}>{cvData.summary}</p>
        </Row>
      )}

      {/* ── Experience ── */}
      {experience.length > 0 && (
        <Row label="Experience">
          {experience.map((exp, i) => (
            <div key={i} style={{
              marginBottom: i < experience.length - 1 ? 18 : 0,
              paddingBottom: i < experience.length - 1 ? 18 : 0,
              borderBottom: i < experience.length - 1 ? `1px solid ${t.line}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{exp.role}</p>
                {(has(exp.start_date) || has(exp.end_date)) && (
                  <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {exp.start_date}{exp.start_date ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                  </p>
                )}
              </div>
              {has(exp.company) && (
                <p style={{ fontSize: 10, color: t.secondary, fontWeight: 500, marginTop: 1, marginBottom: 6 }}>{exp.company}</p>
              )}
              {has(exp.description) && (
                <p style={{ fontSize: 10, lineHeight: 1.7, color: t.text }}>{exp.description}</p>
              )}
              {(exp.achievements || []).filter(has).map((a, ai) => (
                <p key={ai} style={{ fontSize: 10, lineHeight: 1.6, marginTop: 4, paddingLeft: 12, color: t.text, borderLeft: `1px solid ${t.line}` }}>
                  {a}
                </p>
              ))}
            </div>
          ))}
        </Row>
      )}

      {/* ── Education ── */}
      {education.length > 0 && (
        <Row label="Education">
          {education.map((edu, i) => (
            <div key={i} style={{
              marginBottom: i < education.length - 1 ? 14 : 0,
              paddingBottom: i < education.length - 1 ? 14 : 0,
              borderBottom: i < education.length - 1 ? `1px solid ${t.line}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700 }}>
                  {edu.degree}{has(edu.field) ? `, ${edu.field}` : ''}
                </p>
                {(has(edu.start_date) || has(edu.end_date)) && (
                  <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {edu.start_date}{edu.start_date ? ' – ' : ''}{edu.end_date}
                  </p>
                )}
              </div>
              <p style={{ fontSize: 10, color: t.secondary, marginTop: 2 }}>{edu.institution}</p>
              {has(edu.grade) && <p style={{ fontSize: 10, color: t.secondary, marginTop: 2 }}>{edu.grade}</p>}
            </div>
          ))}
        </Row>
      )}

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <Row label="Skills">
          <p style={{ fontSize: 10.5, lineHeight: 1.8, color: t.text }}>
            {skills.join('  ·  ')}
          </p>
        </Row>
      )}

      {/* ── Projects ── */}
      {projects.length > 0 && (
        <Row label="Projects">
          {projects.map((p, i) => (
            <div key={i} style={{
              marginBottom: i < projects.length - 1 ? 14 : 0,
              paddingBottom: i < projects.length - 1 ? 14 : 0,
              borderBottom: i < projects.length - 1 ? `1px solid ${t.line}` : 'none',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</p>
              {has(p.description) && <p style={{ fontSize: 10, lineHeight: 1.65, marginTop: 4, color: t.text }}>{p.description}</p>}
              {(p.technologies || []).filter(has).length > 0 && (
                <p style={{ fontSize: 9.5, color: t.secondary, marginTop: 4 }}>
                  {p.technologies.filter(has).join('  ·  ')}
                </p>
              )}
            </div>
          ))}
        </Row>
      )}

      {/* ── Certifications ── */}
      {certs.length > 0 && (
        <Row label="Certifications">
          {certs.map((c, i) => (
            <div key={i} style={{ marginBottom: i < certs.length - 1 ? 10 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600 }}>{c.name}</p>
              {has(c.issuer) && (
                <p style={{ fontSize: 10, color: t.secondary }}>
                  {c.issuer}{has(c.date) ? `  ·  ${c.date}` : ''}
                </p>
              )}
            </div>
          ))}
        </Row>
      )}

      {/* ── Languages ── */}
      {langs.length > 0 && (
        <Row label="Languages">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
            {langs.map((l, i) => (
              <span key={i} style={{ fontSize: 10.5, color: t.text }}>
                {l.language}{has(l.proficiency) ? <span style={{ color: t.secondary }}>  {l.proficiency}</span> : ''}
              </span>
            ))}
          </div>
        </Row>
      )}

      {/* ── Awards ── */}
      {awards.length > 0 && (
        <Row label="Awards">
          {awards.map((a, i) => (
            <div key={i} style={{ marginBottom: i < awards.length - 1 ? 10 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600 }}>{a.title}</p>
              {has(a.issuer) && <p style={{ fontSize: 10, color: t.secondary }}>{a.issuer}{has(a.date) ? `  ·  ${a.date}` : ''}</p>}
              {has(a.description) && <p style={{ fontSize: 10, lineHeight: 1.6, marginTop: 3, color: t.text }}>{a.description}</p>}
            </div>
          ))}
        </Row>
      )}

      {/* ── Volunteer ── */}
      {volunteer.length > 0 && (
        <Row label="Volunteer">
          {volunteer.map((v, i) => (
            <div key={i} style={{ marginBottom: i < volunteer.length - 1 ? 14 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600 }}>{v.role}</p>
              {has(v.organization) && <p style={{ fontSize: 10, color: t.secondary }}>{v.organization}</p>}
              {has(v.description) && <p style={{ fontSize: 10, lineHeight: 1.65, marginTop: 4 }}>{v.description}</p>}
            </div>
          ))}
        </Row>
      )}
    </div>
  )
}
