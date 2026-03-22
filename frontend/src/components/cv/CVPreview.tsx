import { CVData } from "../../types";
import { X } from "lucide-react";
import { useAnnouncement } from "../../context/announcement";
import CVRenderer from "./CVRenderer";
import CVScaleWrapper from "./CVScaleWrapper";

interface Props {
  cvData: CVData;
  theme: string;
  template?: string;
  onClose: () => void;
}

export default function CVPreview({
  cvData,
  theme,
  template = "standard",
  onClose,
}: Props) {
  const { bannerH } = useAnnouncement();
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{
        top: bannerH,
        transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ash-border flex-shrink-0">
          <span className="text-sm font-medium text-ink">CV Preview</span>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <CVScaleWrapper>
            <CVRenderer cvData={cvData} theme={theme} template={template} />
          </CVScaleWrapper>
        </div>
      </div>
    </div>
  );
}
