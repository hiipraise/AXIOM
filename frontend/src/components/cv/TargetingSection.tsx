import { CVData } from "../../types";
import { CAREER_LEVELS, INDUSTRIES } from "../../lib/cvContext";
import { Field, Input, SectionHeader, Card } from "../UI/FormElements";

interface Props {
  data: Pick<
    CVData,
    | "career_level"
    | "career_level_custom"
    | "industry"
    | "industry_custom"
    | "target_role"
  >;
  onChange: (
    v: Pick<
      CVData,
      | "career_level"
      | "career_level_custom"
      | "industry"
      | "industry_custom"
      | "target_role"
    >,
  ) => void;
}

export default function TargetingSection({ data, onChange }: Props) {
  const set =
    (key: keyof typeof data) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      // When switching away from "Other", clear the custom field
      if (key === "career_level" && e.target.value !== "general") {
        onChange({ ...data, career_level: e.target.value, career_level_custom: "" });
      } else if (key === "industry" && e.target.value !== "general") {
        onChange({ ...data, industry: e.target.value, industry_custom: "" });
      } else {
        onChange({ ...data, [key]: e.target.value });
      }
    };

  const showCareerCustom = data.career_level === "general";
  const showIndustryCustom = data.industry === "general";

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
              {CAREER_LEVELS.map((option) => (
                <option key={option.value || "general"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showCareerCustom && (
              <Input
                value={data.career_level_custom || ""}
                onChange={set("career_level_custom")}
                placeholder="Specify your career level (e.g., Executive, C-Suite)"
                className="mt-2"
              />
            )}
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
              {INDUSTRIES.map((option) => (
                <option key={option.value || "general"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showIndustryCustom && (
              <Input
                value={data.industry_custom || ""}
                onChange={set("industry_custom")}
                placeholder="Specify your industry (e.g., Fintech, Healthcare)"
                className="mt-2"
              />
            )}
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
