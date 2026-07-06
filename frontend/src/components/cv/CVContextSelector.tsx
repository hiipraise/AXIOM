import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
} from "lucide-react";
import { CAREER_LEVELS, INDUSTRIES } from "../../lib/cvContext";

interface Props {
  careerLevel: string;
  industry: string;
  targetRole: string;
  onChange: (patch: {
    career_level?: string;
    industry?: string;
    target_role?: string;
  }) => void;
  mode?: "create" | "edit";
}

function GridSelector({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string; hint: string }[];
  value: string;
  onChange: (v: string, e: React.MouseEvent) => void;
}) {
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  const handleClick = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(optionValue, e);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-ink-muted" />
        <span className="text-xs font-medium text-ink">{label}</span>
        {value && (
          <span className="ml-auto text-[10px] text-ink-muted truncate max-w-[120px]">
            {selected.label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(e) => handleClick(option.value, e)}
            title={option.hint}
            className={`
              px-2.5 py-2 text-left rounded-lg border text-[11px] leading-tight
              transition-all duration-150
              ${
                value === option.value
                  ? "border-ink bg-ink text-white"
                  : "border-ash-border text-ink-muted hover:border-ink/30 hover:text-ink hover:bg-ash"
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              {value === option.value && (
                <Check size={9} className="flex-shrink-0" />
              )}
              <span className="truncate">{option.label || "General"}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CVContextSelector({
  careerLevel,
  industry,
  targetRole,
  onChange,
  mode = "create",
}: Props) {
  const [expanded, setExpanded] = useState(mode === "create");
  const [customIndustry, setCustomIndustry] = useState("");

  const isConfigured = careerLevel || industry || targetRole;

  // Handle any type coercion issues - ensure we always have strings
  const safeCareerLevel = careerLevel ?? "";
  const safeIndustry = industry ?? "";
  const safeTargetRole = targetRole ?? "";

  const handleCareerLevelChange = (v: string, _e: React.MouseEvent) => {
    onChange({ career_level: v });
  };
  const handleIndustryChange = (v: string, _e: React.MouseEvent) => {
    if (v !== "general") setCustomIndustry("");
    onChange({ industry: v });
  };
  const handleTargetRoleChange = (v: string, _e?: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ target_role: v });
  };

  if (mode === "edit") {
    return (
      <div className="border border-ash-border rounded-xl overflow-hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-ash transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target size={13} className="text-ink-muted" />
            <span className="text-xs font-medium text-ink">CV Context</span>
            {isConfigured && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            )}
          </div>
          {expanded ? (
            <ChevronUp size={13} className="text-ink-muted" />
          ) : (
            <ChevronDown size={13} className="text-ink-muted" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-2 bg-white border-t border-ash-border space-y-4">
            <GridSelector
              label="Career Level"
              icon={TrendingUp}
              options={CAREER_LEVELS}
              value={safeCareerLevel}
              onChange={handleCareerLevelChange}
            />
            <div className="space-y-2">
            <GridSelector
              label="Industry"
              icon={Briefcase}
              options={INDUSTRIES}
              value={safeIndustry}
              onChange={handleIndustryChange}
            />
            {safeIndustry === "general" && (
              <input
                value={customIndustry}
                onChange={(e) => {
                  e.stopPropagation();
                  setCustomIndustry(e.target.value);
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    onChange({ industry: e.target.value.trim() });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Specify your industry (e.g., Fintech, Healthcare, Nonprofit)"
                className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink placeholder:text-ink-muted/50"
              />
            )}
          </div>
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={12} className="text-ink-muted" />
                <span className="text-xs font-medium text-ink">
                  Target Role
                </span>
              </div>
              <input
                value={safeTargetRole}
                onChange={(e) => {
                  e.stopPropagation();
                  handleTargetRoleChange(e.target.value, e);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="e.g. Senior Product Manager at a fintech startup"
                className="w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink placeholder:text-ink-muted/50"
              />
              <p className="text-[10px] text-ink-muted mt-1">
                Used in every AI prompt - the more specific, the better the
                output.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-ink mb-0.5">
          CV Context{" "}
          <span className="text-ink-muted font-normal">
            (optional - improves AI output)
          </span>
        </p>
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Tell AXIOM who this CV is for. These settings are saved on the CV and
          used in every AI call.
        </p>
      </div>

      <GridSelector
        label="Career Level"
        icon={TrendingUp}
        options={CAREER_LEVELS}
        value={safeCareerLevel}
        onChange={handleCareerLevelChange}
      />

      <div className="space-y-2">
        <GridSelector
          label="Industry"
          icon={Briefcase}
          options={INDUSTRIES}
          value={safeIndustry}
          onChange={handleIndustryChange}
        />
        {safeIndustry === "general" && (
          <input
            value={customIndustry}
            onChange={(e) => {
              e.stopPropagation();
              setCustomIndustry(e.target.value);
            }}
            onBlur={(e) => {
              if (e.target.value.trim()) {
                onChange({ industry: e.target.value.trim() });
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Specify your industry (e.g., Fintech, Healthcare, Nonprofit)"
            className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink placeholder:text-ink-muted/50"
          />
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={12} className="text-ink-muted" />
          <span className="text-xs font-medium text-ink">Target Role</span>
        </div>
        <input
          value={safeTargetRole}
          onChange={(e) => {
            e.stopPropagation();
            handleTargetRoleChange(e.target.value, e);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="e.g. Senior Product Manager at a fintech startup"
          className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink placeholder:text-ink-muted/50"
        />
        <p className="text-[10px] text-ink-muted mt-1.5">
          Be specific. "Senior Product Manager at a Series B fintech" is far
          more useful to the AI than "product manager".
        </p>
      </div>
    </div>
  );
}
