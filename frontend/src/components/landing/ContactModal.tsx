import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const FORMSPREE_ENDPOINT =
  import.meta.env.VITE_FORMSPREE_ENDPOINT ||
  (import.meta.env.DEV
    ? "https://formspree.io/f/YOUR_FORM_ID"
    : null);

interface ContactModalProps {
  onClose: () => void;
}

type Status = "idle" | "sending" | "success" | "error";

export default function ContactModal({ onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /* ── Guard: no endpoint configured ── */
  if (!FORMSPREE_ENDPOINT) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-sm rounded-3xl border border-ash-border bg-white p-6 shadow-xl text-center">
          <p className="text-sm text-ink-muted">
            Contact form is not configured yet.
          </p>
          <p className="text-xs text-ink-muted/60 mt-2 mb-4">
            Set <code className="bg-ash px-1 py-0.5 rounded text-xs">VITE_FORMSPREE_ENDPOINT</code> in your <code className="bg-ash px-1 py-0.5 rounded text-xs">.env</code> file.
          </p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => null);
        setStatus("error");
        setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-3xl border border-ash-border bg-white p-6 shadow-xl"
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-muted hover:bg-ash hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {/* ── Success state ── */}
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center text-center py-8"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1">Message sent!</h3>
              <p className="text-sm text-ink-muted mb-6 max-w-xs">
                Thanks for reaching out. We'll get back to you as soon as possible.
              </p>
              <button onClick={onClose} className="btn-primary">
                Done
              </button>
            </motion.div>

          ) : (
            /* ── Form state ── */
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-ink p-2.5">
                  <Mail size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Get in touch</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Send us a message and we'll reply promptly.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="block text-xs font-medium text-ink mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="input"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-xs font-medium text-ink mb-1">
                  Email address <span className="text-red-400">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="contact-subject" className="block text-xs font-medium text-ink mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="input"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium text-ink mb-1">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message..."
                  className="textarea"
                />
              </div>

              {/* Error banner */}
              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="btn-primary flex-1 justify-center"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send message
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
