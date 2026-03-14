import { PersonalInfo } from '../../types'
import { Field, Input, SectionHeader, Card } from '../UI/FormElements'

interface Props {
  data: PersonalInfo
  onChange: (v: PersonalInfo) => void
}

export default function PersonalInfoSection({ data, onChange }: Props) {
  const set = (k: keyof PersonalInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [k]: e.target.value })

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader title="Personal Information" subtitle="Your contact details and professional identity" />
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <Input value={data.full_name} onChange={set('full_name')} placeholder="Ada Lovelace" />
          </Field>
          <Field label="Job Title">
            <Input value={data.job_title} onChange={set('job_title')} placeholder="Software Engineer" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <Input type="email" value={data.email} onChange={set('email')} placeholder="ada@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={data.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </Field>
        </div>
        <Field label="Location">
          <Input value={data.location} onChange={set('location')} placeholder="London, UK" />
        </Field>
      </Card>
      <Card className="space-y-4">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Online Presence</p>
        <Field label="LinkedIn">
          <Input value={data.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/ada-lovelace" />
        </Field>
        <Field label="GitHub">
          <Input value={data.github} onChange={set('github')} placeholder="github.com/ada" />
        </Field>
        <Field label="Portfolio">
          <Input value={data.portfolio} onChange={set('portfolio')} placeholder="ada.dev" />
        </Field>
        <Field label="Website">
          <Input value={data.website} onChange={set('website')} placeholder="adalove.io" />
        </Field>
      </Card>
    </div>
  )
}
