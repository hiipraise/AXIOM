import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAnnouncement } from "../../context/announcement";
import { publicApi } from "../../api";
import { CVData } from "../../types";
import { Download, ArrowLeft, Globe } from "lucide-react";
import { usePrintCV } from "../../hooks/usePrintCV";
import CVRenderer from "../../components/cv/CVRenderer";
import CVScaleWrapper from "../../components/cv/CVScaleWrapper";

interface PublicCV {
  id: string;
  owner_username: string;
  title: string;
  data: CVData;
  theme: string;
  template: string;
}

export default function PublicCVPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const navigate = useNavigate();
  const { bannerH } = useAnnouncement();
  const { printPublicCV, printJob, clearJob, isPrinting } = usePrintCV();

  const {
    data: cv,
    isLoading,
    error,
  } = useQuery<PublicCV>({
    queryKey: ["public-cv", username, slug],
    queryFn: () => publicApi.getCV(username!, slug!),
  });

  if (isLoading)
    return (
      <div className="min-h-screen bg-ash flex items-center justify-center">
        <p className="text-sm text-ink-muted animate-pulse">Loading CV…</p>
      </div>
    );
  if (error || !cv)
    return (
      <div className="min-h-screen bg-ash flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink">CV not found or not public</p>
        <Link to="/" className="text-xs text-ink-muted underline">
          Go home
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-ash">
      <div
        className="bg-white border-b border-ash-border px-4 sm:px-6 py-3 flex items-center justify-between sticky z-30"
        style={{
          top: bannerH,
          transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-ash-border text-xs hidden sm:block">|</span>
          <span className="font-display font-bold text-ink text-sm hidden sm:block">
            AXIOM
          </span>
          <span className="text-ash-border text-xs hidden sm:block">|</span>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe size={12} />
            <Link
              to={`/profile/${username}`}
              className="hover:text-ink transition-colors"
            >
              @{username}
            </Link>
          </div>
        </div>
        <button
          onClick={() => printPublicCV(username!, slug!)}
          disabled={isPrinting}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-ink text-white text-xs rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
        >
          <Download size={13} />
          <span className="hidden sm:inline">
            {isPrinting ? "Preparing…" : "Download PDF"}
          </span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {/* CV content — fills the screen width then scales on mobile */}
      <div className="max-w-[700px] mx-auto my-6 sm:my-8 bg-white shadow-sm rounded-xl overflow-hidden">
        <CVScaleWrapper>
          <CVRenderer
            cvData={cv.data}
            theme={cv.theme || "minimal"}
            template={cv.template || "standard"}
          />
        </CVScaleWrapper>
      </div>
    </div>
  );
}
