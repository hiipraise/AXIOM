import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuthStore } from "../store/auth";
import { Briefcase, User, Target, ArrowRight, X, Check } from "lucide-react";

interface OnboardingData {
  jobTitle: string;
  industry: string;
  fullName: string;
}

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Marketing",
  "Engineering",
  "Sales",
  "Legal",
  "Creative",
  "Other",
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [isSkipped, setIsSkipped] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<OnboardingData>({
    defaultValues: { jobTitle: "", industry: "", fullName: "" },
  });

  const jobTitle = watch("jobTitle");
  const industry = watch("industry");

  const onSubmit = async (data: OnboardingData) => {
    try {
      await api.post("/auth/onboarding-complete", {
        job_title: data.jobTitle,
        industry: data.industry,
        full_name: data.fullName,
      });

      // Update local user state
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, is_first_login: false });
      }

      // Navigate to CV creation with pre-filled data
      navigate("/cv/new", { state: { onboardingData: data } });
    } catch (err) {
      // Still navigate even if API fails
      navigate("/cv/new", { state: { onboardingData: data } });
    }
  };

  const handleSkip = async () => {
    setIsSkipped(true);
    try {
      await api.post("/auth/onboarding-complete", {});
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, is_first_login: false });
      }
    } catch {
      // Ignore API errors
    }
  };

  const canProceed = () => {
    if (step === 1) return jobTitle.length >= 2;
    if (step === 2) return industry.length > 0;
    return true;
  };

  if (isSkipped) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ash-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center">
                {step === 1 && <Briefcase size={16} />}
                {step === 2 && <Target size={16} />}
                {step === 3 && <Check size={16} />}
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">Create Your CV</p>
                <p className="text-xs text-ink-muted">Step {step} of 3</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 text-ink-muted hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-ash">
            <motion.div
              className="h-full bg-ink"
              initial={{ width: "33%" }}
              animate={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <User className="w-12 h-12 mx-auto text-ink mb-3" />
                    <h3 className="font-display font-bold text-xl text-ink">
                      What role are you targeting?
                    </h3>
                    <p className="text-sm text-ink-muted mt-1">
                      This helps us tailor your CVtemplate
                    </p>
                  </div>

                  <div>
                    <label className="label">Job Title</label>
                    <input
                      className="input"
                      {...register("jobTitle", { required: "Job title is required" })}
                      placeholder="e.g. Software Engineer"
                      autoFocus
                    />
                    {errors.jobTitle && (
                      <p className="text-xs text-red mt-1">{errors.jobTitle.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <Target className="w-12 h-12 mx-auto text-ink mb-3" />
                    <h3 className="font-display font-bold text-xl text-ink">
                      Which industry?
                    </h3>
                    <p className="text-sm text-ink-muted mt-1">
                      We'll format your CV accordingly
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <label
                        key={ind}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          industry === ind
                            ? "border-ink bg-ink text-white"
                            : "border-ash-border hover:border-ink-border"
                        }`}
                      >
                        <input
                          type="radio"
                          value={ind}
                          {...register("industry", { required: "Industry is required" })}
                          className="sr-only"
                        />
                        <span className="text-sm">{ind}</span>
                      </label>
                    ))}
                  </div>
                  {errors.industry && (
                    <p className="text-xs text-red mt-1">{errors.industry.message}</p>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <h3 className="font-display font-bold text-xl text-ink">
                      Ready to start!
                    </h3>
                    <p className="text-sm text-ink-muted mt-1">
                      Add your name to pre-fill your CV
                    </p>
                  </div>

                  <div>
                    <label className="label">Your Name (optional)</label>
                    <input
                      className="input"
                      {...register("fullName")}
                      placeholder="Full Name"
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full justify-center">
                    Create My CV
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            {step < 3 && (
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 btn-secondary justify-center"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex-1 btn-primary justify-center disabled:opacity-50"
                >
                  Continue
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}