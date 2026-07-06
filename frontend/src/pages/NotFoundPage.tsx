import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Compass } from "lucide-react";
import Seo from "../components/Seo";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <Seo title="Page Not Found" noindex />
      <div className="min-h-screen bg-ash flex flex-col items-center justify-center px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-sm"
        >
          {/* Big 404 */}
          <p
            className="font-display font-bold text-ink/10 leading-none select-none"
            style={{ fontSize: "clamp(6rem, 20vw, 10rem)" }}
          >
            404
          </p>

          <div className="mt-2">
            <h1 className="font-display font-bold text-2xl text-ink">
              Page not found
            </h1>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              This page doesn't exist or may have moved. Check the URL or head
              back to where you came from.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 border border-ash-border text-ink text-sm font-medium rounded-xl hover:bg-white transition-colors"
            >
              <ArrowLeft size={14} /> Go back
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light transition-colors"
            >
              <Compass size={14} /> Home
            </Link>
          </div>

          <p className="mt-8 text-xs text-ink-muted">
            Looking for jobs?{" "}
            <Link to="/jobs/explore" className="text-ink underline">
              Browse the job board
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}