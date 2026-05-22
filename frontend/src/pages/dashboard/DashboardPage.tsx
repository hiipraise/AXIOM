import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cvApi } from "../../api";
import { CV } from "../../types";
import {
  Plus,
  FileText,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit,
  Clock,
  Star,
  Check,
  X,
  PencilLine,
  MoreVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth";
import RatingModal from "../../components/cv/RatingModal";
import ConfirmDialog from "../../components/UI/ConfirmDialog";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ratingCV, setRatingCV] = useState<CV | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CV | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { data: cvs = [], isLoading } = useQuery<CV[]>({
    queryKey: ["cvs"],
    queryFn: cvApi.list,
    enabled: !!user,
  });

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpenId]);

  const handleDuplicate = async (id: string) => {
    try {
      await cvApi.duplicate(id);
      qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV duplicated");
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await cvApi.delete(id);
      qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startTitleEdit = (cv: CV) => {
    setEditingTitleId(cv.id);
    setTitleDraft(cv.title);
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setTitleDraft("");
  };

  const saveTitleEdit = async (cvId: string) => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      toast.error("Title cannot be empty");
      return;
    }
    setSavingTitleId(cvId);
    try {
      await cvApi.update(cvId, { title: nextTitle });
      await qc.invalidateQueries({ queryKey: ["cvs"] });
      toast.success("CV title updated");
      setEditingTitleId(null);
      setTitleDraft("");
    } catch {
      toast.error("Failed to update title");
    } finally {
      setSavingTitleId(null);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Your CVs
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {cvs.length} {cvs.length === 1 ? "resume" : "resumes"} saved
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/cv/new")}>
          <Plus size={14} /> New CV
        </button>
      </div>

      {/* Empty state */}
      {!isLoading && cvs.length === 0 && (
        <div className="card text-center py-16 border-dashed">
          <FileText size={32} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted mb-4">
            No CVs yet. Create your first one.
          </p>
          <button className="btn-primary" onClick={() => navigate("/cv/new")}>
            <Plus size={14} /> Create CV
          </button>
        </div>
      )}

      {/* CV list */}
      <div className="space-y-2">
        {cvs.map((cv) => (
          <div key={cv.id} className="card !p-4">

            {/* ── MOBILE LAYOUT (hidden on sm+) ── */}
            <div className="sm:hidden">
              {/* ✅ No overflow-hidden here — it would clip the dropdown */}
              <div className="flex items-center gap-2 w-full">
                {editingTitleId === cv.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitleEdit(cv.id);
                        if (e.key === "Escape") cancelTitleEdit();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-ash-border bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
                      placeholder="CV title"
                    />
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Save title"
                      onClick={() => saveTitleEdit(cv.id)}
                      disabled={savingTitleId === cv.id}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Cancel"
                      onClick={cancelTitleEdit}
                      disabled={savingTitleId === cv.id}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  /* w-0 flex-1 forces truncation without overflow-hidden */
                  <h3 className="font-medium text-ink text-sm truncate w-0 flex-1">
                    {cv.title}
                  </h3>
                )}

                {/* Kebab trigger */}
                <div
                  className="relative flex-shrink-0"
                  ref={menuOpenId === cv.id ? menuRef : null}
                >
                  <button
                    className="btn-ghost p-1.5"
                    title="More options"
                    onClick={() =>
                      setMenuOpenId(menuOpenId === cv.id ? null : cv.id)
                    }
                  >
                    <MoreVertical size={15} />
                  </button>

                  {menuOpenId === cv.id && (
                    <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-ash-border bg-white shadow-lg py-1">
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
                        onClick={() => {
                          startTitleEdit(cv);
                          setMenuOpenId(null);
                        }}
                      >
                        <PencilLine size={14} /> Rename
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
                        onClick={() => {
                          setRatingCV(cv);
                          setMenuOpenId(null);
                        }}
                      >
                        <Star
                          size={14}
                          className={cv.rating ? "text-amber-400 fill-amber-400" : ""}
                        />
                        Rate
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
                        onClick={() => {
                          navigate(`/cv/${cv.id}`);
                          setMenuOpenId(null);
                        }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-ash-dark"
                        onClick={() => {
                          handleDuplicate(cv.id);
                          setMenuOpenId(null);
                        }}
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      <div className="my-1 border-t border-ash-border" />
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDeleteTarget(cv);
                          setMenuOpenId(null);
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile row 2: badge + stars */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`badge text-[10px] ${cv.is_public ? "bg-green-50 text-green-700" : "bg-ash-dark text-ink-muted"}`}
                >
                  {cv.is_public ? (
                    <><Globe size={9} className="inline mr-0.5" />Public</>
                  ) : (
                    <><Lock size={9} className="inline mr-0.5" />Private</>
                  )}
                </span>
                {cv.rating != null && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: cv.rating }).map((_, i) => (
                      <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile row 3: meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {fmt(cv.updated_at)}
                </span>
                <span className="capitalize">{cv.theme}</span>
                <span>{cv.page_count === 1 ? "1 page" : `${cv.page_count} pages`}</span>
                {cv.data.personal_info.job_title && (
                  <span className="truncate max-w-[180px]">
                    {cv.data.personal_info.job_title}
                  </span>
                )}
              </div>

              {/* Mobile row 4: public URL */}
              {cv.is_public && cv.slug && (
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate">
                  /cv/{cv.owner_username}/{cv.slug}
                </p>
              )}
            </div>

            {/* ── DESKTOP LAYOUT (hidden on mobile) ── */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 min-w-0">
                {editingTitleId === cv.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitleEdit(cv.id);
                        if (e.key === "Escape") cancelTitleEdit();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-ash-border bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
                      placeholder="CV title"
                    />
                    <button
                      className="btn-ghost p-1.5"
                      title="Save title"
                      onClick={() => saveTitleEdit(cv.id)}
                      disabled={savingTitleId === cv.id}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="btn-ghost p-1.5"
                      title="Cancel"
                      onClick={cancelTitleEdit}
                      disabled={savingTitleId === cv.id}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <h3 className="font-medium text-ink text-sm truncate w-0 flex-1">
                      {cv.title}
                    </h3>
                    <button
                      className="btn-ghost p-1.5 flex-shrink-0"
                      title="Rename"
                      onClick={() => startTitleEdit(cv)}
                    >
                      <PencilLine size={13} />
                    </button>
                  </div>
                )}

                <span
                  className={`badge text-[10px] flex-shrink-0 ${cv.is_public ? "bg-green-50 text-green-700" : "bg-ash-dark text-ink-muted"}`}
                >
                  {cv.is_public ? (
                    <><Globe size={9} className="inline mr-0.5" />Public</>
                  ) : (
                    <><Lock size={9} className="inline mr-0.5" />Private</>
                  )}
                </span>

                {cv.rating != null && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: cv.rating }).map((_, i) => (
                      <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                )}

                <span className="w-px h-3.5 bg-ash-border flex-shrink-0" />

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    className="btn-ghost p-1.5"
                    title="Rate"
                    onClick={() => setRatingCV(cv)}
                  >
                    <Star
                      size={13}
                      className={cv.rating ? "text-amber-400 fill-amber-400" : ""}
                    />
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ink text-white hover:bg-ink-light text-sm"
                    title="Edit"
                    onClick={() => navigate(`/cv/${cv.id}`)}
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    className="btn-ghost p-1.5"
                    title="Duplicate"
                    onClick={() => handleDuplicate(cv.id)}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn-ghost p-1.5 hover:text-red-600"
                    title="Delete"
                    onClick={() => setDeleteTarget(cv)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Desktop row 2: meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted mt-1.5">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {fmt(cv.updated_at)}
                </span>
                <span className="capitalize">{cv.theme}</span>
                <span>{cv.page_count === 1 ? "1 page" : `${cv.page_count} pages`}</span>
                {cv.data.personal_info.job_title && (
                  <span className="truncate max-w-[160px]">
                    {cv.data.personal_info.job_title}
                  </span>
                )}
              </div>

              {/* Desktop row 3: public URL */}
              {cv.is_public && cv.slug && (
                <p className="text-[11px] text-ink-muted/60 font-mono mt-1 truncate">
                  /cv/{cv.owner_username}/{cv.slug}
                </p>
              )}
            </div>

          </div>
        ))}
      </div>

      {ratingCV && (
        <RatingModal
          cvId={ratingCV.id}
          cvTitle={ratingCV.title}
          currentRating={ratingCV.rating}
          onClose={() => setRatingCV(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["cvs"] })}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete CV?"
        description={
          <>
            Delete{" "}
            <span className="font-medium text-ink">"{deleteTarget?.title}"</span>
            ? This cannot be undone.
          </>
        }
        confirmLabel="Delete CV"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}