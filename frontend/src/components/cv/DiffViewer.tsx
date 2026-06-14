import { CVData } from "../../types";
import type { ExperienceItem, EducationItem } from "../../types";

interface DiffViewerProps {
  before: CVData;
  after: CVData;
}

/** Compute a simple diff representation between two CVData objects */
function computeDiff(before: CVData, after: CVData): {
  personal_info: { field: string; old: string; new: string }[];
  summary: { old: string; new: string };
  skills: { removed: string[]; added: string[] };
  experience: { old: ExperienceItem[]; new: ExperienceItem[] };
  education: { old: EducationItem[]; new: EducationItem[] };
  other: { field: string; old: string; new: string }[];
} {
  const result = {
    personal_info: [] as { field: string; old: string; new: string }[],
    summary: { old: before.summary, new: after.summary },
    skills: { removed: [] as string[], added: [] as string[] },
    experience: { old: before.experience, new: after.experience },
    education: { old: before.education, new: after.education },
    other: [] as { field: string; old: string; new: string }[],
  };

  // Compare personal_info fields
  const piFields = ["full_name", "job_title", "email", "phone", "location", "linkedin", "github", "portfolio", "website"] as const;
  for (const f of piFields) {
    const oldVal = before.personal_info[f] ?? "";
    const newVal = after.personal_info[f] ?? "";
    if (oldVal !== newVal) {
      result.personal_info.push({ field: f, old: oldVal, new: newVal });
    }
  }

  // Compare summary
  if (before.summary !== after.summary) {
    // Already handled above
  }

  // Compare skills (simple array diff)
  const oldSkills = new Set(before.skills);
  const newSkills = new Set(after.skills);
  for (const s of before.skills) {
    if (!newSkills.has(s)) {
      result.skills.removed.push(s);
    }
  }
  for (const s of after.skills) {
    if (!oldSkills.has(s)) {
      result.skills.added.push(s);
    }
  }

  // Compare other simple fields
  const otherFields = [
    { key: "career_level" as const, label: "Career Level" },
    { key: "industry" as const, label: "Industry" },
    { key: "target_role" as const, label: "Target Role" },
  ] as const;
  for (const { key, label } of otherFields) {
    const oldVal = before[key] ?? "";
    const newVal = after[key] ?? "";
    if (oldVal !== newVal) {
      result.other.push({ field: label, old: String(oldVal), new: String(newVal) });
    }
  }

  return result;
}

export default function DiffViewer({ before, after }: DiffViewerProps) {
  const diff = computeDiff(before, after);

  const hasChanges =
    diff.personal_info.length > 0 ||
    diff.summary.old !== diff.summary.new ||
    diff.skills.removed.length > 0 ||
    diff.skills.added.length > 0 ||
    diff.experience.old.length !== diff.experience.new.length ||
    diff.education.old.length !== diff.education.new.length ||
    diff.other.length > 0;

  if (!hasChanges) {
    return (
      <div className="text-center py-8 text-ink-muted">
        <p>No changes detected — the AI did not modify the CV.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {diff.summary.old !== diff.summary.new && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Summary</h4>
          <div className="bg-ash rounded-lg p-3 text-sm">
            {diff.summary.old && (
              <p className="line-through text-ink-muted mb-2">{diff.summary.old}</p>
            )}
            {diff.summary.new && <p className="text-green-700">{diff.summary.new}</p>}
          </div>
        </div>
      )}

      {/* Personal Info */}
      {diff.personal_info.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Personal Info</h4>
          <div className="bg-ash rounded-lg p-3 text-sm space-y-1">
            {diff.personal_info.map((change) => (
              <div key={change.field} className="flex items-start gap-2">
                <span className="text-ink-muted min-w-[80px] capitalize">{change.field.replace(/_/g, " ")}:</span>
                {change.old && <span className="line-through text-ink-muted flex-1">{change.old}</span>}
                {change.new && <span className="text-green-700 flex-1">{change.new}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(diff.skills.removed.length > 0 || diff.skills.added.length > 0) && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Skills</h4>
          <div className="bg-ash rounded-lg p-3 text-sm">
            {diff.skills.removed.length > 0 && (
              <div className="mb-2">
                <span className="text-ink-muted text-xs">Removed: </span>
                {diff.skills.removed.map((s) => (
                  <span key={s} className="line-through text-red-600 mx-1">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {diff.skills.added.length > 0 && (
              <div>
                <span className="text-ink-muted text-xs">Added: </span>
                {diff.skills.added.map((s) => (
                  <span key={s} className="text-green-700 mx-1">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {diff.experience.old.length !== diff.experience.new.length && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Experience</h4>
          <div className="bg-ash rounded-lg p-3 text-sm">
            <span className="text-ink-muted">Old: </span>
            <span className="line-through text-ink-muted">{diff.experience.old.length} entries</span>
            <span className="mx-2">→</span>
            <span className="text-green-700">{diff.experience.new.length} entries</span>
          </div>
        </div>
      )}

      {/* Education */}
      {diff.education.old.length !== diff.education.new.length && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Education</h4>
          <div className="bg-ash rounded-lg p-3 text-sm">
            <span className="text-ink-muted">Old: </span>
            <span className="line-through text-ink-muted">{diff.education.old.length} entries</span>
            <span className="mx-2">→</span>
            <span className="text-green-700">{diff.education.new.length} entries</span>
          </div>
        </div>
      )}

      {/* Other fields */}
      {diff.other.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">Other</h4>
          <div className="bg-ash rounded-lg p-3 text-sm space-y-1">
            {diff.other.map((change) => (
              <div key={change.field} className="flex items-start gap-2">
                <span className="text-ink-muted min-w-[80px]">{change.field}:</span>
                {change.old && <span className="line-through text-ink-muted flex-1">{change.old}</span>}
                {change.new && <span className="text-green-700 flex-1">{change.new}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}