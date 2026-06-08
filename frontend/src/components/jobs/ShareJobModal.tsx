import { Copy, Linkedin, MessageCircle, Send, X } from "lucide-react";
import toast from "react-hot-toast";

interface ShareJobModalProps {
  open: boolean;
  title: string;
  company: string;
  url: string;
  onClose: () => void;
}

export default function ShareJobModal({ open, title, company, url, onClose }: ShareJobModalProps) {
  if (!open) return null;
  const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const text = `${title} at ${company} - ${absoluteUrl}`;
  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(absoluteUrl)}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(absoluteUrl)}&text=${encodeURIComponent(`${title} at ${company}`)}` },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl);
    toast.success("Link copied");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-ash-border bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Share job</p>
            <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
            <p className="text-sm text-ink-muted">{company}</p>
          </div>
          <button className="btn-ghost p-2" onClick={onClose} aria-label="Close share dialog">
            <X size={16} />
          </button>
        </div>
        <button className="btn-primary w-full justify-center" onClick={copyLink}>
          <Copy size={15} /> Copy link
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {links.map(({ label, icon: Icon, href }) => (
            <a key={label} className="btn-secondary justify-center !text-xs" href={href} target="_blank" rel="noreferrer">
              <Icon size={14} /> {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
