import { TemplateProps, has, contactItems } from './templateUtils'

function TimelineItem({
  title, subtitle, meta, description, bullets, accent, text, secondary, isLast,
}: {
  title: string; subtitle?: string; meta?: string
  description?: string; bullets?: string[]
  accent: string; text: string; secondary: string; isLast: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: isLast ? 0 : 4 }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, paddingTop: 2 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: accent, flexShrink: 0,
          boxShadow: `0 0 0 3px ${accent}22`,
        }} />
        {!isLast && (
          <div style={{
            width: 2, flex: 1, background: `${accent}28`,
            marginTop: 4, marginBottom: -4,
            minHeight: 16,
          }} />
        )}
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: text, lineHeight: 1.3 }}>{title}</p>
          {meta && <p style={{ fontSize: 9, color: secondary, whiteSpace: 'nowrap', flexShrink: 0 }}>{meta}</p>}
        </div>
        {subtitle && <p style={{ fontSize: 10, color: secondary, marginTop: 1, fontWeight: 500 }}>{subtitle}</p>}
        {description && <p style={{ fontSize: 9.5, color: text, lineHeight: 1.65, marginTop: 5 }}>{description}</p>}
        {bullets && bullets.filter(has).map((b, i) => (
          <p key={i} style={{ fontSize: 9.5, color: text, lineHeight: 1.55, marginTop: 3, paddingLeft: 8 }}>· {b}</p>
        ))}
      </div>
    </div>
  )
}

export default function PulseTemplate({ cvData, t }: TemplateProps) {
  const pi = cvData.personal_info
  const contacts = contactItems(pi)

  const sec = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: t.accent, flexShrink: 0,
      }} />
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: t.accent,
      }}>{label}</p>
      <div style={{ flex: 1, height: 1, background: t.line }} />
    </div>
  )

  const experience = cvData.experience.filter(e => has(e.role) || has(e.company))
  const education  = cvData.education.filter(e => has(e.institution) || has(e.degree))
  const skills     = cvData.skills
  const certs      = cvData.certifications.filter(c => has(c.name))
  const langs      = cvData.languages.filter(l => has(l.language))
  const projects   = cvData.projects.filter(p => has(p.name))
  const awards     = cvData.awards.filter(a => has(a.title))
  const volunteer  = cvData.volunteer.filter(v => has(v.role) || has(v.organization))

  return (
    <div style={{
      fontFamily: t.fontFamily, color: t.text,
      background: t.background,
      padding: '40px 44px 48px',
    }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `2px solid ${t.accent}`,
        paddingBottom: 20, marginBottom: 4,
      }}>
        {has(pi.full_name) && (
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: t.accent,
            letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4,
          }}>{pi.full_name}</h1>
        )}
        {has(pi.job_title) && (
          <p style={{ fontSize: 12, color: t.secondary, fontWeight: 400, marginBottom: 12 }}>{pi.job_title}</p>
        )}
        {contacts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 20px', fontSize: 9.5, color: t.secondary }}>
            {contacts.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
      </div>

      {/* ── Summary ── */}
      {has(cvData.summary) && (
        <div style={{
          margin: '20px 0 0',
          padding: '14px 16px',
          borderLeft: `3px solid ${t.accent}`,
          background: `${t.accent}08`,
          borderRadius: '0 6px 6px 0',
        }}>
          <p style={{ fontSize: 10.5, lineHeight: 1.7, color: t.text }}>{cvData.summary}</p>
        </div>
      )}

      {/* ── Experience timeline ── */}
      {experience.length > 0 && (
        <>
          {sec('Experience')}
          {experience.map((exp, i) => (
            <TimelineItem
              key={i}
              isLast={i === experience.length - 1}
              title={exp.role || exp.company}
              subtitle={exp.role && exp.company ? exp.company : undefined}
              meta={`${exp.start_date || ''}${exp.start_date ? '–' : ''}${exp.current ? 'Present' : (exp.end_date || '')}`}
              description={exp.description}
              bullets={exp.achievements}
              accent={t.accent} text={t.text} secondary={t.secondary}
            />
          ))}
        </>
      )}

      {/* ── Education timeline ── */}
      {education.length > 0 && (
        <>
          {sec('Education')}
          {education.map((edu, i) => (
            <TimelineItem
              key={i}
              isLast={i === education.length - 1}
              title={`${edu.degree || ''}${has(edu.field) ? `, ${edu.field}` : ''}`}
              subtitle={edu.institution}
              meta={`${edu.start_date || ''}${edu.start_date ? '–' : ''}${edu.end_date || ''}`}
              description={edu.grade ? `Grade: ${edu.grade}` : edu.description}
              accent={t.accent} text={t.text} secondary={t.secondary}
            />
          ))}
        </>
      )}

      {/* ── Projects timeline ── */}
      {projects.length > 0 && (
        <>
          {sec('Projects')}
          {projects.map((p, i) => (
            <TimelineItem
              key={i}
              isLast={i === projects.length - 1}
              title={p.name}
              subtitle={(p.technologies || []).filter(has).join(' · ') || undefined}
              description={p.description}
              accent={t.accent} text={t.text} secondary={t.secondary}
            />
          ))}
        </>
      )}

      {/* ── Bottom row: Skills | Langs | Certs | Awards ── */}
      {(skills.length > 0 || langs.length > 0 || certs.length > 0 || awards.length > 0) && (
        <div style={{
          display: 'flex', gap: 32, marginTop: 28,
          paddingTop: 20, borderTop: `1px solid ${t.line}`,
        }}>
          {skills.length > 0 && (
            <div style={{ flex: '2 1 200px' }}>
              <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.accent, marginBottom: 10 }}>Skills</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 9.5, padding: '3px 8px',
                    border: `1.5px solid ${t.accent}40`,
                    borderRadius: 4, color: t.text,
                    background: `${t.accent}08`,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {(langs.length > 0 || certs.length > 0 || awards.length > 0) && (
            <div style={{ flex: '1 1 120px' }}>
              {langs.length > 0 && (
                <>
                  <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>Languages</p>
                  {langs.map((l, i) => (
                    <p key={i} style={{ fontSize: 10, marginBottom: 4, color: t.text }}>
                      {l.language}{has(l.proficiency) ? <span style={{ color: t.secondary }}> · {l.proficiency}</span> : ''}
                    </p>
                  ))}
                </>
              )}
              {certs.length > 0 && (
                <div style={{ marginTop: langs.length > 0 ? 14 : 0 }}>
                  <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>Certifications</p>
                  {certs.map((c, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: t.text }}>{c.name}</p>
                      {has(c.issuer) && <p style={{ fontSize: 9, color: t.secondary }}>{c.issuer}</p>}
                    </div>
                  ))}
                </div>
              )}
              {awards.length > 0 && (
                <div style={{ marginTop: (langs.length > 0 || certs.length > 0) ? 14 : 0 }}>
                  <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>Awards</p>
                  {awards.map((a, i) => (
                    <p key={i} style={{ fontSize: 10, color: t.text, marginBottom: 4 }}>{a.title}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Volunteer */}
      {volunteer.length > 0 && (
        <>
          {sec('Volunteer')}
          {volunteer.map((v, i) => (
            <TimelineItem
              key={i}
              isLast={i === volunteer.length - 1}
              title={v.role || v.organization}
              subtitle={v.role && v.organization ? v.organization : undefined}
              meta={`${v.start_date || ''}${v.start_date ? '–' : ''}${v.end_date || ''}`}
              description={v.description}
              accent={t.accent} text={t.text} secondary={t.secondary}
            />
          ))}
        </>
      )}
    </div>
  )
}
