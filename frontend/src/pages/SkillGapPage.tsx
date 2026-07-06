import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cvApi } from "../api";
import { CV } from "../types";
import SkillGapEngine from "../components/cv/SkillGapEngine";
import Seo from "../components/Seo";
import { ArrowLeft, Map, FileText } from "lucide-react";

export default function SkillGapPage() {
  const navigate = useNavigate();
  const [selectedCvId, setSelectedCvId] = useState<string>("");

  const { data: cvData, isLoading } = useQuery({
    queryKey: ["cvs", 0],
    queryFn: () => cvApi.list(0, 50),
  });

  const cvs = cvData?.cvs ?? [];
  const selectedCv = cvs.find((cv) => cv.id === selectedCvId) || cvs[0];

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Skill Gap Analysis" noindex />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        {/* Back + heading */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <button
              className="btn-ghost mb-3"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={14} /> Back to dashboard
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight flex items-center gap-2.5">
              <Map size={22} className="text-violet-600" />
              Skill Gap Engine
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Analyse your CV against a target role and get market demand data,
              skill endorsements, and a learning roadmap.
            </p>
          </div>
        </div>

        {/* CV picker */}
        {isLoading ? (
          <div className="card mb-6">
            <div className="h-4 w-40 rounded bg-ash-dark animate-pulse" />
          </div>
        ) : cvs.length === 0 ? (
          <div className="card text-center py-12 border-dashed mb-6">
            <FileText size={28} className="mx-auto text-ink-muted/40 mb-3" />
            <p className="text-sm text-ink-muted mb-3">
              You need a CV before you can analyse skill gaps.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/cv/new")}
            >
              Create CV
            </button>
          </div>
        ) : (
          <div className="card mb-6">
            <label className="label">Select a CV to analyse</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedCvId || selectedCv?.id || ""}
                onChange={(e) => setSelectedCvId(e.target.value)}
                className="w-full sm:max-w-xs text-sm border border-ash-border rounded-lg px-3 py-2 bg-white"
              >
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title || `CV ${cv.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              {selectedCv && (
                <p className="text-xs text-ink-muted">
                  Target role:{" "}
                  {selectedCv.data.target_role ||
                    selectedCv.data.personal_info.job_title ||
                    "Not set"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Skill gap engine — override sidebar width/border for the standalone view */}
        {selectedCv && (
          <div className="[&>div]:!w-full [&>div]:!border-l-0 [&>div]:!rounded-2xl [&>div]:border [&>div]:!shadow-sm">
            <SkillGapEngine
              cvData={selectedCv.data}
              cvId={selectedCv.id}
              onClose={() => navigate("/dashboard")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
