import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../../api";
import type { CommentItem, CommentCreate } from "../../types";
import {
  X,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  Send,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  cvId: string;
  cvOwnerId: string;
  currentUserId: string;
  currentUsername: string;
  currentUserRole?: string;
  onClose: () => void;
  activeSection?: string;
  onSectionClick?: (section: string) => void;
  onApplySuggestion?: (section: string, fieldPath: string, value: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal Info",
  targeting: "Targeting",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  projects: "Projects",
  awards: "Awards",
  languages: "Languages",
  volunteer: "Volunteer",
};

export default function CommentsPanel({
  cvId,
  cvOwnerId,
  currentUserId,
  currentUsername,
  currentUserRole,
  onClose,
  activeSection,
  onSectionClick,
  onApplySuggestion,
}: Props) {
  const qc = useQueryClient();
  const [filterSection, setFilterSection] = useState<string | undefined>(
    activeSection,
  );
  const [showResolved, setShowResolved] = useState(false);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [suggestionMode, setSuggestionMode] = useState(false);
  const [suggestedValue, setSuggestedValue] = useState("");

  const { data: comments = [], isLoading } = useQuery<CommentItem[]>({
    queryKey: ["cv-comments", cvId, filterSection, showResolved],
    queryFn: () =>
      commentsApi.list(cvId, filterSection, showResolved ? undefined : false),
  });

  const { data: counts } = useQuery({
    queryKey: ["cv-comment-counts", cvId],
    queryFn: () => commentsApi.counts(cvId),
  });

  useEffect(() => {
    if (activeSection && activeSection !== filterSection) {
      setFilterSection(activeSection);
    }
  }, [activeSection]);

  const createMutation = useMutation({
    mutationFn: (body: CommentCreate) => commentsApi.create(cvId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cv-comments", cvId] });
      qc.invalidateQueries({ queryKey: ["cv-comment-counts", cvId] });
      setInputText("");
      setSuggestedValue("");
      setSuggestionMode(false);
      setReplyTo(null);
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      commentId,
      data,
    }: {
      commentId: string;
      data: { resolved?: boolean };
    }) => commentsApi.update(cvId, commentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cv-comments", cvId] });
      qc.invalidateQueries({ queryKey: ["cv-comment-counts", cvId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.delete(cvId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cv-comments", cvId] });
      qc.invalidateQueries({ queryKey: ["cv-comment-counts", cvId] });
      toast.success("Comment deleted");
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return;
    createMutation.mutate({
      section: filterSection || "general",
      text: inputText.trim(),
      is_suggestion: suggestionMode,
      suggested_value: suggestionMode ? suggestedValue.trim() || undefined : undefined,
      parent_id: replyTo || undefined,
    });
  }, [inputText, filterSection, suggestionMode, suggestedValue, replyTo, createMutation]);

  const topLevelComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="w-full md:w-80 bg-white border-l border-ash-border flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-ink" />
          <span className="text-sm font-medium text-ink">
            Comments & Suggestions
          </span>
          {counts && counts.open > 0 && (
            <span className="text-[10px] bg-ink text-white px-1.5 py-0.5 rounded-full font-medium">
              {counts.open}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-3 py-2 border-b border-ash-border flex items-center gap-2 flex-shrink-0 flex-wrap">
        <select
          value={filterSection || ""}
          onChange={(e) => setFilterSection(e.target.value || undefined)}
          className="flex-1 min-w-0 text-xs border border-ash-border rounded-lg px-2 py-1.5 bg-ash text-ink-muted focus:outline-none"
        >
          <option value="">All sections</option>
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label} {counts?.sections[key] ? `(${counts.sections[key].open})` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`text-[10px] px-2 py-1 rounded-lg border transition-colors whitespace-nowrap ${
            showResolved
              ? "bg-ink text-white border-ink"
              : "text-ink-muted border-ash-border hover:bg-ash"
          }`}
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && (
          <div className="text-xs text-ink-muted text-center py-6 animate-pulse">
            Loading comments…
          </div>
        )}

        {!isLoading && topLevelComments.length === 0 && (
          <div className="text-xs text-ink-muted text-center py-8 space-y-2">
            <MessageSquare size={20} className="mx-auto opacity-40" />
            <p>No comments yet</p>
            <p className="text-[10px]">
              Add comments or suggestions to help improve this CV
            </p>
          </div>
        )}

        {topLevelComments.map((comment) => {
          const replies = getReplies(comment.id);
          const isOwner = comment.user_id === currentUserId;
          const isModerator = currentUserRole === "staff" || currentUserRole === "admin" || currentUserRole === "superadmin";

          return (
            <div
              key={comment.id}
              className={`rounded-xl border transition-colors ${
                comment.resolved
                  ? "border-emerald-100 bg-emerald-50/30"
                  : comment.is_suggestion
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-ash-border bg-white"
              }`}
            >
              {/* Main comment */}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                    <User size={10} />
                    <span className="font-medium text-ink">
                      {comment.username}
                    </span>
                    {comment.user_id === cvOwnerId && (
                      <span className="text-[9px] bg-ink/10 text-ink px-1 rounded">
                        Owner
                      </span>
                    )}
                    <span>·</span>
                    {onSectionClick ? (
                      <button
                        onClick={() => onSectionClick(comment.section)}
                        className="hover:text-axiom underline decoration-dotted underline-offset-2 transition-colors"
                      >
                        {SECTION_LABELS[comment.section] || comment.section}
                      </button>
                    ) : (
                      <span>
                        {SECTION_LABELS[comment.section] || comment.section}
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!comment.resolved && (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            commentId: comment.id,
                            data: { resolved: true },
                          })
                        }
                        className="p-1 text-ink-muted hover:text-emerald-600 transition-colors"
                        title="Mark as resolved"
                      >
                        <CheckCircle size={12} />
                      </button>
                    )}
                    {comment.resolved && (
                      <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle size={10} /> Resolved
                      </span>
                    )}
                    {(isOwner || isModerator) && (
                      <button
                        onClick={() =>
                          deleteMutation.mutate(comment.id)
                        }
                        className="p-1 text-ink-muted hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  {comment.is_suggestion && (
                    <Lightbulb size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>

                {comment.is_suggestion && comment.suggested_value && (
                  <div className="mt-2 pl-4 border-l-2 border-amber-300 bg-amber-50/50 rounded-r p-2">
                    <p className="text-[10px] text-amber-700 font-medium mb-0.5">
                      Suggested value:
                    </p>
                    <p className="text-xs text-ink italic">
                      {comment.suggested_value}
                    </p>
                    {onApplySuggestion && (
                      <button
                        onClick={() =>
                          onApplySuggestion(
                            comment.section,
                            comment.field_path,
                            comment.suggested_value!,
                          )
                        }
                        className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <CheckCircle size={10} />
                        Apply to CV
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setReplyTo(comment.id);
                    setSuggestionMode(false);
                  }}
                  className="mt-1.5 text-[10px] text-ink-muted hover:text-ink transition-colors"
                >
                  Reply
                </button>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="border-t border-ash-border bg-ash/30 px-3 py-2 space-y-2">
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-1.5">
                      <User size={10} className="text-ink-muted mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                          <span className="font-medium text-ink">
                            {reply.username}
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                          {reply.text}
                        </p>
                      </div>
                      {(reply.user_id === currentUserId || isOwner || isModerator) && (
                        <button
                          onClick={() => deleteMutation.mutate(reply.id)}
                          className="p-0.5 text-ink-muted hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-ash-border p-3 space-y-2 flex-shrink-0">
        {replyTo && (
          <div className="flex items-center justify-between text-[10px] text-ink-muted bg-ash px-2 py-1 rounded-lg">
            <span>
              Replying to a comment
            </span>
            <button
              onClick={() => {
                setReplyTo(null);
                setSuggestionMode(false);
              }}
              className="text-ink hover:text-ink"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSuggestionMode(!suggestionMode);
              if (suggestionMode) setSuggestedValue("");
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              suggestionMode
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "border-ash-border text-ink-muted hover:text-ink hover:bg-ash"
            }`}
            title="Toggle suggestion mode"
          >
            <Lightbulb size={13} />
          </button>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              suggestionMode
                ? "Suggest a change…"
                : "Add a comment…"
            }
            className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || createMutation.isPending}
            className="p-2 bg-ink text-white rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
          >
            <Send size={13} />
          </button>
        </div>

        {suggestionMode && (
          <textarea
            value={suggestedValue}
            onChange={(e) => setSuggestedValue(e.target.value)}
            rows={3}
            placeholder="What should the new value be? (optional)"
            className="w-full px-3 py-2 text-xs border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 resize-none bg-amber-50/30"
          />
        )}

        {counts && counts.total > 0 && (
          <div className="flex items-center justify-between text-[9px] text-ink-muted">
            <span>
              {counts.open} open · {counts.total - counts.open} resolved
            </span>
            <span>
              {Object.values(counts.sections).reduce(
                (sum, s) => sum + s.suggestions,
                0,
              )}{" "}
              suggestions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
