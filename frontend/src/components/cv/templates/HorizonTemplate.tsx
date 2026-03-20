import { TemplateProps, has, contactItems } from './templateUtils'

export default function HorizonTemplate({ cvData, t }: TemplateProps) {
  const pi = cvData.personal_info
  const contacts = contactItems(pi)

  const rightSec = (label: string) => (
    <p style={{
      fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
      color: t.accent, marginBottom: 7, marginTop: 18,
    }}>{label}</p>
  )

  const leftSec = (label: string) => (
    <div style={{ marginTop: 22, marginBottom: 10 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: t.accent, marginBottom: 6,
      }}>{label}</p>
      <div style={{ borderTop: `1.5px solid ${t.line}` }} />
    </div>
  )

  const hasExperience = cvData.experience.filter(e => has(e.role) || has(e.company)).length > 0
  const hasEducation  = cvData.education.filter(e => has(e.institution) || has(e.degree)).length > 0
  const hasVolunteer  = cvData.volunteer.filter(v => has(v.role)).length > 0
  const hasSkills     = cvData.skills.length > 0
  const hasCerts      = cvData.certifications.filter(c => has(c.name)).length > 0
  const hasLangs      = cvData.languages.filter(l => has(l.language)).length > 0
  const hasProjects   = cvData.projects.filter(p => has(p.name)).length > 0
  const hasAwards     = cvData.awards.filter(a => has(a.title)).length > 0

  return (
    <div style={{ fontFamily: t.fontFamily, color: t.text, background: t.background }}>

      {/* ── Big header ── */}
      <div style={{
        background: t.accent,
        padding: '36px 40px 30px',
        color: 'white',
      }}>
        {has(pi.full_name) && (
          <h1 style={{
            fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.1,
            marginBottom: 5,
          }}>{pi.full_name}</h1>
        )}
        {has(pi.job_title) && (
          <p style={{ fontSize: 13, opacity: 0.8, fontWeight: 400, marginBottom: 16 }}>
            {pi.job_title}
          </p>
        )}
        {contacts.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
            fontSize: 9.5, opacity: 0.75,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            {contacts.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
      </div>

      {/* ── Summary strip ── */}
      {has(cvData.summary) && (
        <div style={{
          padding: '18px 40px',
          background: 'rgba(0,0,0,0.025)',
          borderBottom: `1px solid ${t.line}`,
        }}>
          <p style={{ fontSize: 10.5, lineHeight: 1.7, color: t.text }}>{cvData.summary}</p>
        </div>
      )}

      {/* ── Two-column body ── */}
      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left: Experience + Education + Volunteer */}
        <div style={{ flex: '1 1 62%', padding: '24px 24px 32px 40px', borderRight: `1px solid ${t.line}` }}>

          {hasExperience && (
            <>
              {leftSec('Experience')}
              {cvData.experience.filter(e => has(e.role) || has(e.company)).map((exp, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <p style={{ fontSize: 11.5, fontWeight: 700 }}>{exp.role}</p>
                    {(has(exp.start_date) || has(exp.end_date)) && (
                      <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {exp.start_date}{exp.start_date ? '–' : ''}{exp.current ? 'Present' : exp.end_date}
                      </p>
                    )}
                  </div>
                  {has(exp.company) && (
                    <p style={{ fontSize: 10, color: t.secondary, marginBottom: 4, fontWeight: 500 }}>{exp.company}</p>
                  )}
                  {has(exp.description) && (
                    <p style={{ fontSize: 9.5, lineHeight: 1.65, color: t.text }}>{exp.description}</p>
                  )}
                  {(exp.achievements || []).filter(has).map((a, ai) => (
                    <p key={ai} style={{ fontSize: 9.5, lineHeight: 1.55, marginTop: 2, paddingLeft: 10, color: t.text }}>• {a}</p>
                  ))}
                </div>
              ))}
            </>
          )}

          {hasEducation && (
            <>
              {leftSec('Education')}
              {cvData.education.filter(e => has(e.institution) || has(e.degree)).map((edu, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <p style={{ fontSize: 11, fontWeight: 700 }}>
                      {edu.degree}{has(edu.field) ? `, ${edu.field}` : ''}
                    </p>
                    {(has(edu.start_date) || has(edu.end_date)) && (
                      <p style={{ fontSize: 9, color: t.secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {edu.start_date}{edu.start_date ? '–' : ''}{edu.end_date}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: t.secondary }}>{edu.institution}</p>
                  {has(edu.grade) && <p style={{ fontSize: 9.5, color: t.secondary, marginTop: 2 }}>{edu.grade}</p>}
                </div>
              ))}
            </>
          )}

          {hasVolunteer && (
            <>
              {leftSec('Volunteer')}
              {cvData.volunteer.filter(v => has(v.role) || has(v.organization)).map((v, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700 }}>{v.role}</p>
                  {has(v.organization) && <p style={{ fontSize: 10, color: t.secondary }}>{v.organization}</p>}
                  {has(v.description) && <p style={{ fontSize: 9.5, lineHeight: 1.6, marginTop: 3 }}>{v.description}</p>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: Skills + Certs + Projects + Awards + Languages */}
        <div style={{ flex: '0 0 38%', padding: '24px 32px 32px 24px' }}>

          {hasSkills && (
            <>
              {rightSec('Skills')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {cvData.skills.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 9.5, padding: '3px 8px',
                    background: t.background === '#FFFFFF' || t.background === '#ffffff' ? '#F8FAFC' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${t.line}`,
                    borderRadius: 4, color: t.text, lineHeight: 1.4,
                  }}>{s}</span>
                ))}
              </div>
            </>
          )}

          {hasCerts && (
            <>
              {rightSec('Certifications')}
              {cvData.certifications.filter(c => has(c.name)).map((c, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 600 }}>{c.name}</p>
                  {has(c.issuer) && <p style={{ fontSize: 9.5, color: t.secondary }}>{c.issuer}{has(c.date) ? ` · ${c.date}` : ''}</p>}
                </div>
              ))}
            </>
          )}

          {hasProjects && (
            <>
              {rightSec('Projects')}
              {cvData.projects.filter(p => has(p.name)).map((p, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 600 }}>{p.name}</p>
                  {has(p.description) && <p style={{ fontSize: 9.5, color: t.secondary, lineHeight: 1.5, marginTop: 2 }}>{p.description}</p>}
                  {(p.technologies || []).filter(has).length > 0 && (
                    <p style={{ fontSize: 9, color: t.secondary, marginTop: 2 }}>{p.technologies.filter(has).join(' · ')}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {hasAwards && (
            <>
              {rightSec('Awards')}
              {cvData.awards.filter(a => has(a.title)).map((a, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 600 }}>{a.title}</p>
                  {has(a.issuer) && <p style={{ fontSize: 9.5, color: t.secondary }}>{a.issuer}{has(a.date) ? ` · ${a.date}` : ''}</p>}
                </div>
              ))}
            </>
          )}

          {hasLangs && (
            <>
              {rightSec('Languages')}
              {cvData.languages.filter(l => has(l.language)).map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 500 }}>{l.language}</p>
                  {has(l.proficiency) && <p style={{ fontSize: 9.5, color: t.secondary }}>{l.proficiency}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
