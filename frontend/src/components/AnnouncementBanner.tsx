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

  const renderText = (suffix = "") =>
    ann.text.split(/(https?:\/\/\S+|\/\S+)/g).map((part, i) =>
      part.match(/^(https?:\/\/|\/)/) ? (
        <a
          key={`${suffix}-${i}`}
          href={part}
          className="underline underline-offset-2 hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      ) : (
        part
      ),
    );

  return (
    <>
      <style>
        {`
          @keyframes announcement-marquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          .announcement-track {
            display: flex;
            width: max-content;
            height: 100%;
            align-items: center;
            animation: announcement-marquee 35s linear infinite;
            will-change: transform;
          }

          .announcement-track:hover {
  animation-play-state: paused;
}

          .announcement-item {
            white-space: nowrap;
            padding-right: 4rem;
            flex-shrink: 0;
          }
        `}
      </style>

      <div
        className={`fixed top-0 left-0 right-0 z-[60] flex items-center overflow-hidden ${bg}`}
        style={{
          height: bannerH,
          transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {bannerH > 0 && (
          <>
            <div
              className="flex-1 relative overflow-hidden"
              style={{ height: BANNER_H }}
            >
              {/* Left fade */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r ${fade} to-transparent`}
              />

              {/* Right fade */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l ${fade} to-transparent`}
              />

              <div className="h-full overflow-hidden">
                <div className="announcement-track">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span
                      key={index}
                      className="announcement-item text-[11px] font-medium tracking-wide opacity-90"
                    >
                      {renderText(String(index))}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="relative z-20 flex-shrink-0 w-8 flex items-center justify-center h-full opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
