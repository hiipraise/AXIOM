import { CVData } from "../../types";
import { Field, Input, SectionHeader, Card } from "../UI/FormElements";

interface Props {
  data: Pick<CVData, "career_level" | "industry" | "target_role">;
  onChange: (
    v: Pick<CVData, "career_level" | "industry" | "target_role">,
  ) => void;
}

const CAREER_LEVEL_OPTIONS = [
  { value: "", label: "General / not specified" },
  { value: "student", label: "Student / Undergraduate" },
  { value: "graduate", label: "Graduate / 0–2 Years" },
  { value: "mid", label: "Mid-Level / 2–7 Years" },
  { value: "senior", label: "Senior / 7+ Years" },
  { value: "career_switch", label: "Career Switcher" },
  { value: "executive", label: "Executive / C-Suite" },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "General / not specified" },
  { value: "tech", label: "Tech & Software" },
  { value: "business", label: "Business, Finance & Strategy" },
  { value: "marketing", label: "Marketing & Growth" },
  { value: "health", label: "Health Sciences & Medicine" },
  { value: "creative", label: "Creative, Design & Media" },
  { value: "engineering", label: "Engineering & Manufacturing" },
  { value: "education", label: "Education & Training" },
  { value: "legal", label: "Legal & Compliance" },
];

export default function TargetingSection({ data, onChange }: Props) {
  const set =
    (key: keyof typeof data) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...data, [key]: e.target.value });

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader
        title="Targeting"
        subtitle="Tell the AI who this CV is for so it can optimise structure, keywords, and review severity."
      />
      <Card className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Career Level"
            hint="Used to tune summary length, section order, and review expectations."
          >
            <select
              value={data.career_level}
              onChange={set("career_level")}
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white"
            >
              {CAREER_LEVEL_OPTIONS.map((option) => (
                <option key={option.value || "general"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Industry"
            hint="Used to inject industry-specific keywords and examples."
          >
            <select
              value={data.industry}
              onChange={set("industry")}
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink bg-white"
            >
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option.value || "general"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Target Role"
          hint="Free text is best here. Example: Senior Product Manager at a fintech startup."
        >
          <Input
            value={data.target_role}
            onChange={set("target_role")}
            placeholder="e.g. Senior Product Manager at a fintech startup"
          />
        </Field>
      </Card>
    </div>
  );
}
