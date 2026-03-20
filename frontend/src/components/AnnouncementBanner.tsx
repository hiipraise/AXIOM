import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAnnouncement, BANNER_H } from "../context/announcement";

const TYPE_STYLES = {
  info: "bg-ink text-white",
  warning: "bg-amber-500 text-white",
  success: "bg-emerald-600 text-white",
};

const FADE_FROM: Record<string, string> = {
  info: "from-ink",
  warning: "from-amber-500",
  success: "from-emerald-600",
};

export default function AnnouncementBanner() {
  const { ann, visible, bannerH, dismiss } = useAnnouncement();

  if (!visible || !ann) return null;

  const bg = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info;
  const fade = FADE_FROM[ann.type] ?? FADE_FROM.info;
  const repeated = Array(8).fill(ann.text).join("   ·   ");

  return (
    // height transitions smoothly via CSS — no Framer needed here
    // bannerH goes 0 → 32 (in) or 32 → 0 (out), layouts follow instantly
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center overflow-hidden ${bg}`}
      style={{
        height: bannerH,
        transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Scrolling ticker — only render content when open to avoid layout thrash */}
      {bannerH > 0 && (
        <>
          <div
            className="flex-1 relative overflow-hidden"
            style={{ height: BANNER_H }}
          >
            {/* Edge fades */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r ${fade} to-transparent`}
            />
            <div
              className={`absolute right-8 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l ${fade} to-transparent`}
            />

            <motion.div
              className="flex items-center h-full whitespace-nowrap absolute left-0 top-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 38,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }}
            >
              <span className="text-[11px] font-medium tracking-wide opacity-90">
                {ann.text.split(/(https?:\/\/\S+|\/\S+)/g).map((part, i) =>
                  part.match(/^(https?:\/\/|\/)/) ? (
                    <a
                      key={i}
                      href={part}
                      className="underline underline-offset-2 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </span>
              <span className="text-[11px] font-medium tracking-wide opacity-90">
                {ann.text.split(/(https?:\/\/\S+|\/\S+)/g).map((part, i) =>
                  part.match(/^(https?:\/\/|\/)/) ? (
                    <a
                      key={i}
                      href={part}
                      className="underline underline-offset-2 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </span>
            </motion.div>
          </div>

          <button
            onClick={dismiss}
            className="flex-shrink-0 w-8 flex items-center justify-center h-full opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
}
