import { TemplateProps, has, contactItems, initials } from './templateUtils'

export default function AtlasTemplate({ cvData, t }: TemplateProps) {
  const pi = cvData.personal_info
  const contacts = contactItems(pi)
  const ini = initials(pi.full_name)

  const sideLabel = (text: string) => (
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.55)', marginBottom: 8, marginTop: 20,
    }}>{text}</p>
  )

  const mainSec = (label: string) => (
    <div style={{ marginTop: 22, marginBottom: 10 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
        color: t.accent, marginBottom: 6,
      }}>{label}</p>
      <div style={{ borderTop: `1.5px solid ${t.line}` }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', fontFamily: t.fontFamily, color: t.text, minHeight: "auto" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: '36%', flexShrink: 0,
        background: t.accent,
        padding: '40px 20px',
        color: 'white',
        boxSizing: 'border-box',
      }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800,
          margin: '0 auto 14px',
          letterSpacing: '-0.02em',
        }}>{ini}</div>

        {/* Name / title */}
        {has(pi.full_name) && (
          <p style={{
            fontWeight: 700, fontSize: 15, textAlign: 'center',
            marginBottom: 4, lineHeight: 1.25, letterSpacing: '-0.01em',
          }}>{pi.full_name}</p>
        )}
        {has(pi.job_title) && (
          <p style={{
            fontSize: 10.5, textAlign: 'center', opacity: 0.72,
            marginBottom: 18, lineHeight: 1.4,
          }}>{pi.job_title}</p>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginBottom: 4 }} />

        {/* Contact */}
        {contacts.length > 0 && (
          <>
            {sideLabel('Contact')}
            {contacts.map((c, i) => (
              <p key={i} style={{
                fontSize: 9.5, opacity: 0.82, marginBottom: 5, lineHeight: 1.5,
                wordBreak: 'break-all',
              }}>{c}</p>
            ))}
          </>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <>
            {sideLabel('Skills')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cvData.skills.map((s, i) => (
                <span key={i} style={{
                  fontSize: 9, padding: '2px 7px',
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 4, lineHeight: 1.5,
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {/* Languages */}
        {cvData.languages.length > 0 && (
          <>
            {sideLabel('Languages')}
            {cvData.languages.filter(l => has(l.language)).map((l, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <p style={{ fontSize: 10, fontWeight: 600 }}>{l.language}</p>
                {has(l.proficiency) && (
                  <p style={{ fontSize: 9, opacity: 0.65 }}>{l.proficiency}</p>
                )}
              </div>
            ))}
          </>
        )}

        {/* Summary in sidebar */}
        {has(cvData.summary) && (
          <>
            {sideLabel('Profile')}
            <p style={{ fontSize: 9.5, opacity: 0.8, lineHeight: 1.6 }}>{cvData.summary}</p>
          </>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{
        flex: 1, padding: '40px 28px',
        background: t.background,
        boxSizing: 'border-box',
      }}>

        {/* Experience */}
        {cvData.experience.filter(e => has(e.role) || has(e.company)).length > 0 && (
          <>
            {mainSec('Experience')}
            {cvData.experience.filter(e => has(e.role) || has(e.company)).map((exp, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}>
                    {[exp.role, exp.company].filter(has).join(' — ')}
                  </p>
                  {(has(exp.start_date) || has(exp.end_date)) && (
                    <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {exp.start_date}{exp.start_date ? '–' : ''}{exp.current ? 'Present' : exp.end_date}
                    </p>
                  )}
                </div>
                {has(exp.description) && (
                  <p style={{ fontSize: 9.5, color: t.text, lineHeight: 1.65, marginTop: 4 }}>{exp.description}</p>
                )}
                {(exp.achievements || []).filter(has).map((a, ai) => (
                  <p key={ai} style={{ fontSize: 9.5, color: t.text, lineHeight: 1.55, marginTop: 2, paddingLeft: 10 }}>
                    • {a}
                  </p>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Education */}
        {cvData.education.filter(e => has(e.institution) || has(e.degree)).length > 0 && (
          <>
            {mainSec('Education')}
            {cvData.education.filter(e => has(e.institution) || has(e.degree)).map((edu, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {[has(edu.degree) && `${edu.degree}${has(edu.field) ? `, ${edu.field}` : ''}`, edu.institution].filter(Boolean).join(' — ')}
                  </p>
                  {(has(edu.start_date) || has(edu.end_date)) && (
                    <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {edu.start_date}{edu.start_date ? '–' : ''}{edu.end_date}
                    </p>
                  )}
                </div>
                {has(edu.grade) && <p style={{ fontSize: 9.5, color: t.secondary, marginTop: 2 }}>{edu.grade}</p>}
              </div>
            ))}
          </>
        )}

        {/* Projects */}
        {cvData.projects.filter(p => has(p.name)).length > 0 && (
          <>
            {mainSec('Projects')}
            {cvData.projects.filter(p => has(p.name)).map((p, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700 }}>{p.name}</p>
                {has(p.description) && <p style={{ fontSize: 9.5, lineHeight: 1.6, marginTop: 3 }}>{p.description}</p>}
                {(p.technologies || []).filter(has).length > 0 && (
                  <p style={{ fontSize: 9, color: t.secondary, marginTop: 3 }}>
                    {p.technologies.filter(has).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {cvData.certifications.filter(c => has(c.name)).length > 0 && (
          <>
            {mainSec('Certifications')}
            {cvData.certifications.filter(c => has(c.name)).map((c, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700 }}>
                  {c.name}<span style={{ fontWeight: 400, color: t.secondary }}>{has(c.issuer) ? ` — ${c.issuer}` : ''}{has(c.date) ? ` (${c.date})` : ''}</span>
                </p>
              </div>
            ))}
          </>
        )}

        {/* Awards */}
        {cvData.awards.filter(a => has(a.title)).length > 0 && (
          <>
            {mainSec('Awards')}
            {cvData.awards.filter(a => has(a.title)).map((a, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700 }}>
                  {a.title}<span style={{ fontWeight: 400, color: t.secondary }}>{has(a.issuer) ? ` — ${a.issuer}` : ''}</span>
                </p>
              </div>
            ))}
          </>
        )}

        {/* Volunteer */}
        {cvData.volunteer.filter(v => has(v.role) || has(v.organization)).length > 0 && (
          <>
            {mainSec('Volunteer')}
            {cvData.volunteer.filter(v => has(v.role) || has(v.organization)).map((v, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700 }}>
                  {[v.role, v.organization].filter(has).join(' — ')}
                </p>
                {has(v.description) && <p style={{ fontSize: 9.5, lineHeight: 1.6, marginTop: 3 }}>{v.description}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}