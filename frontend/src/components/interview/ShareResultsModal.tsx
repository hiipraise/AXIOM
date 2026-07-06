import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { interviewApi } from "../../api";
import { InterviewSessionDetail } from "../../types";
import {
  Share2,
  Check,
  Copy,
  X,
  ExternalLink,
  Link2,
  Globe,
  Trash2,
  Trophy,
  Brain,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface ShareResultsModalProps {
  session: InterviewSessionDetail;
  onClose: () => void;
}

export default function ShareResultsModal({ session, onClose }: ShareResultsModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(session.share_token ? `${window.location.origin}/interview/shared/${session.share_token}` : null);
  const [copied, setCopied] = useState(false);

  const createShare = useMutation({
    mutationFn: () => interviewApi.createShareToken(session.id),
    onSuccess: (data) => {
      setShareUrl(data.share_url);
      toast.success("Share link created!");
    },
    onError: () => toast.error("Failed to create share link"),
  });

  const revokeShare = useMutation({
    mutationFn: () => interviewApi.revokeShareToken(shareUrl!.split("/").pop()!),
    onSuccess: () => {
      setShareUrl(null);
      toast.success("Share link revoked");
    },
    onError: () => toast.error("Failed to revoke share link"),
  });

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const overallScore = session.summary?.overall_score ?? session.overall_score ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-ash-border bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-ink p-2.5">
              <Share2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Share results</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {session.job_title || "Mock interview"} · {session.mode}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-ash transition-colors">
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {/* Score preview */}
        <div className="rounded-2xl bg-gradient-to-br from-ink to-gray-800 p-5 mb-5 text-white">
          <div className="flex items-center gap-2 text-xs text-white/60 uppercase tracking-[0.12em] mb-3">
            <Trophy size={14} /> Session snapshot
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{overallScore ?? "—"}/100</p>
              <p className="text-xs text-white/60 mt-1">
                {session.answered_count}/{session.question_count} questions answered
              </p>
            </div>
            <div className="text-xs text-white/60 space-y-1">
              <p>{session.mode} mode</p>
              {session.company && <p>{session.company}</p>}
            </div>
          </div>
        </div>

        {/* Share link section */}
        {shareUrl ? (
          <div className="space-y-3">
            <label className="text-xs font-medium text-ink" htmlFor="share-url-input">Share link</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  id="share-url-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => e.currentTarget.select()}
                  className="input w-full pl-9 pr-3 text-xs text-ink-muted bg-ash"
                  aria-label="Share URL"
                />
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-ash-border p-2 hover:bg-ash transition-colors"
                title="Copy link"
                aria-label="Copy share link to clipboard"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-ink-muted" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
              >
                <ExternalLink size={12} /> Open shared page
              </a>
              <button
                onClick={() => revokeShare.mutate()}
                disabled={revokeShare.isPending}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} /> Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-ash p-4 text-center">
              <Globe size={24} className="mx-auto text-ink-muted mb-2" />
              <p className="text-sm text-ink-muted">
                Create a shareable link to let others see your session results, scores, and feedback.
              </p>
            </div>
            <button
              onClick={() => createShare.mutate()}
              disabled={createShare.isPending}
              className="btn-primary w-full justify-center"
            >
              {createShare.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Creating link...
                </>
              ) : (
                <>
                  <Share2 size={15} /> Create share link
                </>
              )}
            </button>
          </div>
        )}

        <p className="mt-4 text-[10px] text-ink-muted text-center">
          Only completed sessions can be shared. Your name is not included.
        </p>
      </div>
    </div>
  );
}
