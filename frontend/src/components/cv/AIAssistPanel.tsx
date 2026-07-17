import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cvApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import { CVData } from "../../types";
import { stripMarkdownCVData } from "../../lib/stripMarkdown";
import {
  X,
  Sparkles,
  Wand2,
  FileSearch,
  Send,
  RotateCcw,
  StopCircle,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import CVReviewPanel from "./CVReviewPanel";

type Tab = "chat" | "edit" | "review" | "job";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface Props {
  cvData: CVData;
  onApply: (data: CVData) => void;
  onClose: () => void;
  cvId: string;
}

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AIAssistPanel({
  cvData,
  onApply,
  onClose,
  cvId,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chat");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help improve your CV. Ask me to make a section shorter, stronger, or more specific — or paste a job description to align your CV to a role.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [jobDesc, setJobDesc] = useState(cvData.job_description || "");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [lastUsage, setLastUsage] = useState<ChatMessage["usage"] | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setJobDesc(cvData.job_description || "");
  }, [cvData.job_description]);

  // Auto-scroll chat
  const scrollChat = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });
  };

  // ── Streaming chat via SSE ─────────────────────────────────────────────

  const sendChatStream = async (message: string) => {
    if (!message.trim() || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: message };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setStreaming(true);
    setStreamedText("");
    setLastUsage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${BASE}/api/v1/cv/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ message, cv_data: cvData }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              fullText += data.token;
              setStreamedText(fullText);
              scrollChat();
            }
            if (data.done) {
              setStreamedText("");
              setLastUsage(data.usage || null);
              setChatHistory((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: fullText,
                  usage: data.usage || undefined,
                },
              ]);
            }
          } catch {
            // ignore parse errors for partial lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — keep what we got
        if (streamedText) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: streamedText },
          ]);
          setStreamedText("");
        }
      } else {
        toast.error("AI stream interrupted. Try again.");
        setStreamedText("");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      scrollChat();
    }
  };

  const cancelStream = () => {
    abortRef.current?.abort();
  };

  const regenerate = () => {
    const lastUserMsg = [...chatHistory]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove the last assistant response if any
      const trimmed = [...chatHistory];
      if (trimmed[trimmed.length - 1]?.role === "assistant") {
        trimmed.pop();
      }
      setChatHistory(trimmed);
      sendChatStream(lastUserMsg.content);
    }
  };

  // ── Non-streaming actions ──────────────────────────────────────────────

  const sendChat = () => {
    if (!chatInput.trim() || streaming) return;
    sendChatStream(chatInput);
  };

  const applyEdit = async () => {
    if (!editInstruction.trim() || loading) return;
    setLoading(true);
    try {
      const res = await cvApi.aiEdit(editInstruction, cvData);
      onApply(stripMarkdownCVData(res.data));
      setEditInstruction("");
      toast.success("Edits applied");
    } catch {
      toast.error("AI edit failed");
    } finally {
      setLoading(false);
    }
  };

  const matchJob = async () => {
    const trimmedJobDesc = jobDesc.trim();
    if (!trimmedJobDesc || loading) return;

    setLoading(true);
    try {
      const res = await cvApi.aiMatchJob(
        { ...cvData, job_description: trimmedJobDesc },
        trimmedJobDesc,
      );

      onApply({
        ...stripMarkdownCVData(res.data),
        job_description: trimmedJobDesc,
      });
      setJobDesc(trimmedJobDesc);
      toast.success("CV aligned to job description");
    } catch {
      toast.error("Job match failed");
    } finally {
      setLoading(false);
    }
  };


  const hasAssistantResponse = chatHistory.length > 1 && chatHistory[chatHistory.length - 1]?.role === "assistant";

  return (
    <div className="w-full md:w-80 bg-white border-l border-ash-border flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ink" />
          <span className="text-sm font-medium text-ink">AI Assist</span>
          {lastUsage && !streaming && (
            <span className="text-[10px] text-ink-muted flex items-center gap-1">
              <BarChart3 size={10} />
              {lastUsage.total_tokens}
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

      {/* Tabs */}
      <div className="flex border-b border-ash-border">
        {[
          { id: "chat" as Tab, label: "Chat", icon: Sparkles },
          { id: "edit" as Tab, label: "Edit", icon: Wand2 },
          { id: "review" as Tab, label: "Review", icon: FileSearch },
          { id: "job" as Tab, label: "Job Match", icon: FileSearch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${tab === id ? "border-b-2 border-ink text-ink font-medium" : "text-ink-muted hover:text-ink"}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* ── Chat tab ── */}
        <div
          className={`${tab === "chat" ? "flex" : "hidden"} flex-1 min-h-0 overflow-hidden flex-col`}
        >
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-ink text-white" : "bg-ash text-ink"}`}
                >
                  {msg.content}
                  {/* Token usage for assistant messages */}
                  {msg.usage && msg.usage.total_tokens > 0 && (
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] text-ink-muted border-t border-ash-border pt-1">
                      <BarChart3 size={9} />
                      {msg.usage.prompt_tokens} in · {msg.usage.completion_tokens} out · {msg.usage.total_tokens} total
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming text */}
            {streaming && streamedText && (
              <div className="flex justify-start">
                <div className="bg-ash px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap text-ink">
                  {streamedText}
                  <span className="inline-block w-1.5 h-4 bg-ink ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Thinking animation when streaming just started */}
            {streaming && !streamedText && (
              <div className="flex justify-start">
                <div className="bg-ash px-3 py-2 rounded-xl text-xs text-ink-muted animate-pulse">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Chat controls */}
          <div className="p-3 border-t border-ash-border space-y-2">
            {/* Regenerate + Cancel buttons */}
            <div className="flex gap-2">
              {hasAssistantResponse && !streaming && (
                <button
                  onClick={regenerate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-ash-border text-[10px] text-ink-muted hover:text-ink hover:border-ink transition-colors"
                >
                  <RotateCcw size={11} /> Regenerate
                </button>
              )}
              {streaming && (
                <button
                  onClick={cancelStream}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-[10px] hover:bg-red-50 transition-colors"
                >
                  <StopCircle size={11} /> Stop
                </button>
              )}
            </div>

            {/* Input row */}
            <div className="flex gap-2 items-end">
              <textarea
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value)
                  // Auto-resize
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
                placeholder="Ask anything about your CV…"
                rows={1}
                className="flex-1 px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink disabled:opacity-50 resize-none overflow-y-auto max-h-[120px]"
                disabled={streaming}
              />
              <button
                onClick={sendChat}
                disabled={streaming || !chatInput.trim()}
                className="p-2 bg-ink text-white rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Edit tab ── */}
        <div
          className={`${tab === "edit" ? "flex" : "hidden"} p-4 space-y-4 flex-1 min-h-0 overflow-y-auto flex-col`}
        >
          <p className="text-xs text-ink-muted">
            Write a plain-language optimisation instruction and the AI will
            tighten your CV without inventing experience.
          </p>
          <div className="space-y-2">
            {[
              "Make the summary more concise",
              "Strengthen the experience bullet points",
              "Remove all vague language",
              "Emphasise leadership roles",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setEditInstruction(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border border-ash-border hover:bg-ash transition-colors text-ink-muted"
              >
                "{s}"
              </button>
            ))}
          </div>
          <textarea
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            rows={4}
            placeholder="Or write your own instruction…"
            className="min-h-28 w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-y"
          />
          <button
            onClick={applyEdit}
            disabled={loading || !editInstruction.trim()}
            className="w-full py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Wand2 size={13} /> {loading ? "Applying…" : "Apply Edit"}
          </button>
        </div>

        {/* ── Review tab ── */}
        <div
          className={`${tab === "review" ? "flex" : "hidden"} flex-1 min-h-0 overflow-hidden flex-col`}
        >
          <CVReviewPanel
            cvId={cvId}
            cvData={{ ...cvData, job_description: jobDesc }}
            onClose={onClose}
            navigate={navigate}
          />
        </div>

        {/* ── Job Match tab ── */}
        <div
          className={`${tab === "job" ? "flex" : "hidden"} p-4 space-y-4 flex-1 min-h-0 overflow-hidden flex-col`}
        >
          <p className="text-xs text-ink-muted">
            Paste a job description below. The AI will align your CV's language
            and emphasis to the role — without fabricating anything.
          </p>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            rows={10}
            placeholder="Paste job description here…"
            className="min-h-0 flex-1 w-full px-3 py-2 text-xs border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none overflow-y-auto"
          />
          <button
            onClick={matchJob}
            disabled={loading || !jobDesc.trim()}
            className="w-full py-2.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <FileSearch size={13} /> {loading ? "Matching…" : "Align to Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
