import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { searchApi } from "../../api";
import type { SearchResults, CVSearchResult, JobSearchResult } from "../../types";
import { Search, FileText, Briefcase, X, Command } from "lucide-react";
import { useAnnouncement } from "../../context/announcement";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bannerH } = useAnnouncement();

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ["search", query],
    queryFn: () => searchApi.global(query, 10),
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  // Flatten results for keyboard navigation
  const flatResults = [
    ...(results?.cvs ?? []).map((r) => ({ type: "cv" as const, item: r })),
    ...(results?.jobs ?? []).map((r) => ({ type: "job" as const, item: r })),
  ];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatResults[selectedIndex]) {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected.type === "cv") {
          navigate(`/cv/${selected.item.id}`);
        } else if (selected.type === "job") {
          navigate(`/jobs`);
        }
        onOpenChange(false);
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [flatResults, selectedIndex, navigate, onOpenChange]
  );

  // Close on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-24"
        style={{ paddingTop: bannerH + 24 }}
        onClick={() => onOpenChange(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ top: bannerH + 24 }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-ash-border">
            <Search size={18} className="text-ink-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search CVs, jobs, AXIOM listings..."
              className="flex-1 text-base outline-none placeholder:text-ink-muted"
            />
            <div className="flex items-center gap-1 text-xs text-ink-muted bg-ash px-1.5 py-0.5 rounded">
              <Command size={10} />K
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">
                Type at least 2 characters to search
              </div>
            )}

            {query.length >= 2 && isLoading && (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">
                Searching...
              </div>
            )}

            {query.length >= 2 && !isLoading && flatResults.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">
                No results found for "{query}"
              </div>
            )}

            {flatResults.length > 0 && (
              <div className="py-2">
                {/* CVs */}
                {results?.cvs && results.cvs.length > 0 && (
                  <div className="px-2">
                    <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wider">
                      My CVs
                    </div>
                    {results.cvs.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/cv/${item.id}`);
                          onOpenChange(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                          selectedIndex === idx
                            ? "bg-axiom text-white"
                            : "hover:bg-ash"
                        }`}
                      >
                        <FileText
                          size={16}
                          className={
                            selectedIndex === idx ? "text-white" : "text-ink-muted"
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.title}
                          </div>
                          <div
                            className={`text-xs truncate ${
                              selectedIndex === idx
                                ? "text-white/70"
                                : "text-ink-muted"
                            }`}
                          >
                            {item.owner_username}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* External Jobs */}
                {results?.jobs && results.jobs.length > 0 && (
                  <div className="px-2">
                    <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wider">
                      Job Listings
                    </div>
                    {results.jobs.map((item, idx) => {
                      const flatIdx =
                        (results?.cvs?.length ?? 0) +
                        idx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigate(`/jobs`);
                            onOpenChange(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                            selectedIndex === flatIdx
                              ? "bg-axiom text-white"
                              : "hover:bg-ash"
                          }`}
                        >
                          <Briefcase
                            size={16}
                            className={
                              selectedIndex === flatIdx
                                ? "text-white"
                                : "text-ink-muted"
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.title}
                            </div>
                            <div
                              className={`text-xs truncate ${
                                selectedIndex === flatIdx
                                  ? "text-white/70"
                                  : "text-ink-muted"
                              }`}
                            >
                              {item.company} · {item.source}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-ash-border text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-ash rounded">↑</kbd>
              <kbd className="px-1 bg-ash rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-ash rounded">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-ash rounded">esc</kbd>
              to close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}