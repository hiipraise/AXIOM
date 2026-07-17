import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 px-5 overflow-hidden">
      <div className="max-w-5xl mx-auto grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          className="relative order-2 lg:order-1"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-ash via-white to-ash opacity-80 blur-2xl" />
          <div className="relative rounded-[1.75rem] border border-ash-border bg-white p-2 shadow-2xl shadow-ink/10">
            <img
              src="/assets/screenshots/guest_cv_editor.png"
              alt="Guest CV editor preview in AXIOM"
              className="aspect-[16/11] w-full rounded-[1.25rem] object-cover object-left-top"
              loading="lazy"
            />
            <div className="absolute -right-3 -top-3 rounded-2xl border border-ash-border bg-white px-4 py-3 text-left shadow-lg shadow-ink/10 sm:-right-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Guest editor
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                Start instantly
              </p>
            </div>
          </div>
        </motion.div>

        <div className="order-1 text-center lg:order-2 lg:text-left">
          <h2 className="font-display font-bold text-4xl text-ink mb-4 leading-tight">
            Stop writing CVs.
            <br />
            Start getting hired.
          </h2>
          <p className="text-ink-muted text-sm mb-10 leading-relaxed">
            No email required. No subscription. Start building your CV in 30
            seconds.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-4 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-ink-light transition-all shadow-lg shadow-ink/10 active:scale-95"
            >
              Create your CV — it's free
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowRight size={15} />
              </motion.span>
            </Link>

            <Link
              to="/guest"
              className="px-8 py-4 text-sm text-ink-muted hover:text-ink rounded-xl border border-ink-border hover:bg-ash-50 transition-all"
            >
              Try without signing up
            </Link>
          </div>

          {/* Mobile: stars stacked above text / Desktop: stars inline with text */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                >
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                </motion.div>
              ))}
            </div>
            <span className="text-xs text-ink-muted">
              Free · No credit card · No email required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
