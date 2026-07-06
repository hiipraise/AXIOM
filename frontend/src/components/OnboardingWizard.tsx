import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useAuthStore } from "../store/auth";
import { notificationsApi } from "../api";
import {
  Briefcase,
  User,
  Target,
  ArrowRight,
  X,
  Check,
  Bell,
  Mail,
  Layers,
  Moon,
} from "lucide-react";

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

const NOTIFICATION_KINDS: { id: string; label: string; desc: string }[] = [
  { id: "general", label: "General", desc: "Account updates and system messages" },
  { id: "application", label: "Applications", desc: "Job application status changes" },
  { id: "interview", label: "Interview", desc: "Interview session reminders" },
  { id: "review_card", label: "Review cards", desc: "Flashcard review reminders" },
  { id: "announcement", label: "Announcements", desc: "Platform announcements" },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [isSkipped, setIsSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<OnboardingData>({
    defaultValues: { jobTitle: "", industry: "", fullName: "" },
  });

  const jobTitle = watch("jobTitle");
  const industry = watch("industry");

  // Notification preferences
  const [emailOn, setEmailOn] = useState(true);
  const [notifKinds, setNotifKinds] = useState<Record<string, boolean>>(() => {
    const kinds: Record<string, boolean> = {};
    NOTIFICATION_KINDS.forEach((k) => (kinds[k.id] = true));
    return kinds;
  });
  const [quietHours, setQuietHours] = useState(false);

  const onSubmit = async (data: OnboardingData) => {
    setSaving(true);
    try {
      await api.post("/auth/onboarding-complete", {
        job_title: data.jobTitle,
        industry: data.industry,
        full_name: data.fullName,
      });

      // Save notification preferences
      await notificationsApi.updatePreferences({
        email_notifications: emailOn,
        push_notifications: false,
        quiet_hours: { enabled: quietHours, start: "22:00", end: "08:00" },
        kinds: notifKinds,
      });

      // Update local user state
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, is_first_login: false });
      }

      navigate("/cv/new?tour=true", { state: { onboardingData: data } });
    } catch (err) {
      // Navigate even if API fails
      navigate("/cv/new?tour=true", { state: { onboardingData: data } });
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
        {/* Explicit skip link in the backdrop */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-xs text-white/60 hover:text-white underline underline-offset-2 transition-colors"
        >
          Skip onboarding
        </button>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ash-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center">
                {step === 1 && <Briefcase size={16} />}
                {step === 2 && <Target size={16} />}
                {step === 3 && <Bell size={16} />}
                {step === 4 && <Check size={16} />}
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">Create Your CV</p>
                <p className="text-xs text-ink-muted">Step {step} of 4</p>
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
          <div className="h-1 bg-ash flex-shrink-0">
            <motion.div
              className="h-full bg-ink"
              initial={{ width: "25%" }}
              animate={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto flex-1">
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
                    <Bell className="w-12 h-12 mx-auto text-ink mb-3" />
                    <h3 className="font-display font-bold text-xl text-ink">
                      Notification preferences
                    </h3>
                    <p className="text-sm text-ink-muted mt-1">
                      Choose how you'd like to stay updated
                    </p>
                  </div>

                  {/* Email toggle */}
                  <label
                    onClick={() => setEmailOn(!emailOn)}
                    className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 pointer-events-none">
                      <Mail size={16} className="text-ink-muted" />
                      <div>
                        <p className="text-sm font-medium text-ink">Email notifications</p>
                        <p className="text-[11px] text-ink-muted">Receive updates via email</p>
                      </div>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full pointer-events-none transition-colors ${emailOn ? 'bg-ink' : 'bg-ash-border'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${emailOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>

                  {/* Quiet hours toggle */}
                  <label
                    onClick={() => setQuietHours(!quietHours)}
                    className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 pointer-events-none">
                      <Moon size={16} className="text-ink-muted" />
                      <div>
                        <p className="text-sm font-medium text-ink">Quiet hours</p>
                        <p className="text-[11px] text-ink-muted">Pause notifications overnight (22:00 – 08:00)</p>
                      </div>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full pointer-events-none transition-colors ${quietHours ? 'bg-ink' : 'bg-ash-border'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${quietHours ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>

                  {/* Notification type toggles */}
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2 flex items-center gap-2">
                      <Layers size={13} /> Notify me about
                    </p>
                    <div className="space-y-1">
                      {NOTIFICATION_KINDS.map((k) => (
                        <label
                          key={k.id}
                          onClick={() => setNotifKinds((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}
                          className="flex items-center justify-between rounded-xl border border-ash-border p-3 cursor-pointer hover:bg-ash/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink">{k.label}</p>
                              <p className="text-[11px] text-ink-muted truncate">{k.desc}</p>
                            </div>
                          </div>
                          <div className={`relative w-10 h-5 rounded-full flex-shrink-0 pointer-events-none transition-colors ${notifKinds[k.id] ? 'bg-ink' : 'bg-ash-border'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifKinds[k.id] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
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

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Create My CV"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            {step < 4 && (
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