import { useState, useEffect } from "react";
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, TrendingUp, FileText, Search, BarChart3, Building2 } from "lucide-react";
import { cvApi } from "../../api";
import { CVData } from "../../types";
import { useAnnouncement } from "../../context/announcement";

interface ATSFlag {
  severity: string;
  category: string;
  message: string;
  details: string | null;
}

interface ATSVendorScore {
  vendor: string;
  score: number;
  flags: ATSFlag[];
  quirks_detected: string[];
}

interface ATSResult {
  score: number;
  flags: ATSFlag[];
  extracted_text: string;
  section_headers_found: string[];
  keyword_matches: Array<{ keyword: string; tfidf: number; count: number }>;
  keyword_density: Record<string, number>;
  missing_keywords: string[];
  tfidf_scores: Record<string, number>;
  vendor_scores: ATSVendorScore[];
  vendor_overall: number;
}

interface Props {
  cvData: CVData;
  onClose: () => void;
}

export default function ATSPreviewModal({ cvData, onClose }: Props) {
  const { bannerH } = useAnnouncement();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const runATSAnalysis = async (jobDesc?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await cvApi.atsPreview(cvData, jobDesc || undefined);
      setResult(data);
    } catch (err) {
      console.error("ATS analysis error:", err);
      setError("Failed to run ATS analysis");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    runATSAnalysis();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-amber-50";
    return "bg-red-50";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle size={14} className="text-red-500" />;
      case "warning":
        return <AlertTriangle size={14} className="text-amber-500" />;
      default:
        return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      style={{
        top: bannerH,
        transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ash-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-axiom" />
            <span className="text-sm font-medium text-ink">ATS Preview</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-axiom"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => runATSAnalysis(jobDescription)}
                className="mt-4 px-4 py-2 bg-axiom text-white rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Score */}
              <div className={`p-4 rounded-lg ${getScoreBg(result.score)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-muted uppercase tracking-wide">ATS Compatibility Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                      {result.score}/100
                    </p>
                  </div>
                  <div className="text-right">
                    {result.score >= 80 ? (
                      <CheckCircle size={24} className="text-green-500" />
                    ) : result.score >= 60 ? (
                      <TrendingUp size={24} className="text-amber-500" />
                    ) : (
                      <AlertCircle size={24} className="text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description Input */}
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Job Description (optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste a job description to check keyword matching..."
                  className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:ring-1 focus:ring-axiom resize-none"
                  rows={3}
                />
                <button
                  onClick={() => runATSAnalysis(jobDescription)}
                  className="mt-2 px-3 py-1.5 bg-axiom text-white text-xs rounded-lg"
                >
                  Re-analyze with Job Description
                </button>
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-ink mb-3">Issues Found</h4>
                  <div className="space-y-2">
                    {result.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                          flag.severity === "error"
                            ? "bg-red-50"
                            : flag.severity === "warning"
                            ? "bg-amber-50"
                            : "bg-blue-50"
                        }`}
                      >
                        {getSeverityIcon(flag.severity)}
                        <div>
                          <p className="text-ink">{flag.message}</p>
                          {flag.details && (
                            <p className="text-xs text-ink-muted mt-1">{flag.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Headers */}
              <div>
                <h4 className="text-sm font-medium text-ink mb-3">Section Headers Found</h4>
                <div className="flex flex-wrap gap-2">
                  {result.section_headers_found.length > 0 ? (
                    result.section_headers_found.map((header, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded"
                      >
                        {header}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-ink-muted">No standard headers detected</p>
                  )}
                </div>
              </div>

              {/* TF-IDF Keyword Match (if job description provided) */}
              {(result.keyword_matches.length > 0 || result.missing_keywords.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium text-ink mb-3 flex items-center gap-1.5">
                    <BarChart3 size={14} /> TF-IDF Keyword Match
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-ink-muted mb-2">Matching keywords (by TF-IDF score)</p>
                      <div className="space-y-1">
                        {result.keyword_matches.slice(0, 8).map((kw, idx) => (
                          <div key={idx} className="flex items-center justify-between px-2 py-1 bg-green-50 rounded text-xs">
                            <span className="text-green-700 font-medium">{kw.keyword}</span>
                            <span className="text-green-600 text-[10px]">{kw.tfidf.toFixed(3)}</span>
                          </div>
                        ))}
                        {result.keyword_matches.length === 0 && (
                          <p className="text-xs text-ink-muted">No keyword matches</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted mb-2">Missing keywords (highest priority)</p>
                      <div className="flex flex-wrap gap-1">
                        {result.missing_keywords.slice(0, 10).map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            {kw}
                          </span>
                        ))}
                        {result.missing_keywords.length === 0 && (
                          <p className="text-xs text-ink-muted">No missing keywords!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ATS Vendor Compatibility */}
              {result.vendor_scores.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-ink mb-3 flex items-center gap-1.5">
                    <Building2 size={14} /> ATS Vendor Compatibility
                  </h4>
                  <p className="text-[10px] text-ink-muted mb-2">
                    Overall vendor score: {result.vendor_overall}/100
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.vendor_scores.map((vs) => (
                      <div
                        key={vs.vendor}
                        className={`p-3 rounded-lg border ${
                          vs.score >= 80
                            ? 'border-green-200 bg-green-50/30'
                            : vs.score >= 60
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-red-200 bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-ink capitalize">{vs.vendor}</span>
                          <span className={`text-xs font-bold ${getScoreColor(vs.score)}`}>
                            {vs.score}/100
                          </span>
                        </div>
                        {vs.quirks_detected.length > 0 && (
                          <div className="space-y-0.5 mt-1">
                            {vs.quirks_detected.slice(0, 2).map((q, qi) => (
                              <p key={qi} className="text-[10px] text-ink-muted leading-tight">
                                • {q}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Text Preview */}
              <div>
                <h4 className="text-sm font-medium text-ink mb-3">
                  <FileText size={14} className="inline mr-1" />
                  Extracted Text Preview
                </h4>
                <div className="p-3 bg-ash/30 rounded-lg text-xs text-ink-muted font-mono max-h-32 overflow-y-auto">
                  {result.extracted_text}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}