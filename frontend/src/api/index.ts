import axios from "axios";
import { useAuthStore } from "../store/auth";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
});

// Attach Bearer token from memory/sessionStorage on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.headers["Authorization"]) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// On 401 → clear auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(err);
  },
);

// Track page events (announcement clicks/dismisses)
export const trackEvent = (eventType: string, detail?: object) => {
  api.post("/analytics/page-event", { event_type: eventType, ...detail }).catch(() => {});
};

export const authApi = {
  register: (data: object) =>
    api
      .post("/auth/register", data, {
        headers: { "X-Return-Token": "true" },
      })
      .then((r) => r.data),

  login: (data: object) =>
    api
      .post("/auth/login", data, {
        headers: { "X-Return-Token": "true" },
      })
      .then((r) => r.data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me").then((r) => r.data),
  changePassword: (data: object) =>
    api.put("/auth/change-password", data).then((r) => r.data),
  updateProfile: (data: object) =>
    api.put("/auth/update-profile", data).then((r) => r.data),
  forgotUsername: (email: string) =>
    api.post("/auth/forgot-username", { email }).then((r) => r.data),
  recoverAccount: (data: object) =>
    api.post("/auth/recover-account", data).then((r) => r.data),
  deleteAccount: () => api.delete("/auth/delete-account").then((r) => r.data),
};

export const cvApi = {
  list: () => api.get("/cv").then((r) => r.data),
  get: (id: string) => api.get(`/cv/${id}`).then((r) => r.data),
  create: (data: object) => api.post("/cv", data).then((r) => r.data),
  update: (id: string, data: object) =>
    api.put(`/cv/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/cv/${id}`).then((r) => r.data),
  duplicate: (id: string) =>
    api.post(`/cv/${id}/duplicate`).then((r) => r.data),
  history: (id: string) => api.get(`/cv/${id}/history`).then((r) => r.data),
  analytics: (id: string) => api.get(`/cv/${id}/analytics`).then((r) => r.data as import("../types").CVAnalytics),
  createAnalyticsEvent: (id: string, body: object) =>
    api.post(`/cv/${id}/analytics`, body).then((r) => r.data as import("../types").CVAnalyticsEvent),
  rate: (id: string, score: number, comment?: string) =>
    api
      .post(`/cv/${id}/rate`, { cv_id: id, score, comment })
      .then((r) => r.data),
  aiChat: (message: string, cvData?: object, context?: string) =>
    api
      .post("/cv/ai/chat", { message, cv_data: cvData, context })
      .then((r) => r.data),
  aiGenerateSummary: (cvData: object) =>
    api
      .post("/cv/ai/generate-summary", { message: "", cv_data: cvData })
      .then((r) => r.data),
  aiEdit: (instruction: string, cvData: object, section?: string) =>
    api
      .post("/cv/ai/edit", { instruction, cv_data: cvData, section })
      .then((r) => r.data),
  aiMatchJob: (cvData: object, jobDescription: string) =>
    api
      .post("/cv/ai/match-job", {
        cv_data: cvData,
        job_description: jobDescription,
      })
      .then((r) => r.data),
  aiInterview: (
    message: string,
    history: Array<{ role: string; content: string }>,
    cvData?: object,
  ) =>
    api
      .post("/cv/ai/interview", { message, history, cv_data: cvData })
      .then((r) => r.data),
  aiReview: (cvData: object, jobDescription?: string) =>
    api
      .post("/cv/ai/review", {
        cv_data: cvData,
        job_description: jobDescription,
      })
      .then((r) => r.data),
  aiOptimizeBullets: (cvData: object, experienceIndex: number) =>
    api
      .post("/cv/ai/optimize-bullets", {
        cv_data: cvData,
        experience_index: experienceIndex,
      })
      .then((r) => r.data),
  aiKeywordGap: (cvData: object, jobDescription: string) =>
    api
      .post("/cv/ai/keyword-gap", {
        cv_data: cvData,
        job_description: jobDescription,
      })
      .then((r) => r.data),
  skillGap: (cvData: object, targetRole: string) =>
    api
      .post("/cv/ai/skill-gap", {
        cv_data: cvData,
        target_role: targetRole,
      })
      .then((r) => r.data),
  uploadCV: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post("/cv/upload-cv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

export const exportApi = {
  previewPDF: (data: object) =>
    api
      .post("/export/preview", data, { responseType: "blob" })
      .then((r) => r.data as Blob),
  downloadPDF: (cvId: string): Promise<Blob> =>
    api
      .get(`/export/pdf/${cvId}`, { responseType: "blob" })
      .then((r) => r.data),
  downloadPublicPDF: (username: string, slug: string): Promise<Blob> =>
    axios
      .get(`${BASE}/api/export/public-pdf/${username}/${slug}`, {
        responseType: "blob",
      })
      .then((r) => r.data),
};

export const publicApi = {
  getFeed: (skip = 0, limit = 12) =>
    api.get(`/public/feed?skip=${skip}&limit=${limit}`).then((r) => r.data),
  getCV: (username: string, slug: string) =>
    axios.get(`${BASE}/api/public/cv/${username}/${slug}`).then((r) => r.data),
  getProfile: (username: string) =>
    axios.get(`${BASE}/api/public/profile/${username}`).then((r) => r.data),
  getCompany: (slug: string) =>
    api.get(`/recruiter/company/${slug}`).then((r) => r.data),
};

export const adminApi = {
  stats: () => api.get("/admin/stats").then((r) => r.data),
  users: (skip = 0, limit = 50) =>
    api.get(`/admin/users?skip=${skip}&limit=${limit}`).then((r) => r.data),
  setRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  recruiters: () => api.get("/admin/recruiters").then((r) => r.data),
  recruiterActivity: () => api.get("/admin/recruiter-activity").then((r) => r.data),
  aiStats: () => api.get("/admin/ai-stats").then((r) => r.data),
  securityStats: () => api.get("/admin/security-stats").then((r) => r.data),
  exportStats: () => api.get("/admin/export-stats").then((r) => r.data),
  setRecruiterApproval: (id: string, body: { is_approved: boolean; verified?: boolean }) =>
    api.put(`/admin/recruiters/${id}/approval`, body).then((r) => r.data),
  deactivate: (id: string) =>
    api.put(`/admin/users/${id}/deactivate`).then((r) => r.data),
  activate: (id: string) =>
    api.put(`/admin/users/${id}/activate`).then((r) => r.data),
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),
  cvs: (skip = 0, limit = 50) =>
    api.get(`/admin/cvs?skip=${skip}&limit=${limit}`).then((r) => r.data),
  ratings: (skip = 0, limit = 50) =>
    api.get(`/admin/ratings?skip=${skip}&limit=${limit}`).then((r) => r.data),
  auditLog: (skip = 0, limit = 100) =>
    api.get(`/admin/audit-log?skip=${skip}&limit=${limit}`).then((r) => r.data),
  engagementStats: () => api.get("/admin/engagement-stats").then((r) => r.data),
};

export const jobsApi = {
  search: (params: {
    q?: string;
    location?: string;
    remote?: boolean | null;
    region?: string;
    page?: number;
    per_page?: number;
  }) =>
    api
      .get("/jobs/search", { params })
      .then((r) => r.data as import("../types").JobSearchResponse),

  get: (jobId: string) =>
    api.get(`/jobs/${encodeURIComponent(jobId)}`).then((r) => r.data),

  matchCv: (cvData: object, jobDescription: string) =>
    api
      .post("/jobs/match-cv", {
        cv_data: cvData,
        job_description: jobDescription,
      })
      .then((r) => r.data),

  coverLetter: (
    cvData: object,
    jobTitle: string,
    company: string,
    jobDescription: string,
  ) =>
    api
      .post("/jobs/cover-letter", {
        cv_data: cvData,
        job_title: jobTitle,
        company,
        job_description: jobDescription,
      })
      .then((r) => r.data),

  save: (jobId: string) =>
    api.post(`/jobs/saved/${encodeURIComponent(jobId)}`).then((r) => r.data),

  unsave: (jobId: string) =>
    api.delete(`/jobs/saved/${encodeURIComponent(jobId)}`).then((r) => r.data),

  savedList: () => api.get("/jobs/saved").then((r) => r.data),

  applications: () => api.get("/jobs/applications").then((r) => r.data),

  createApplication: (body: object) =>
    api.post("/jobs/applications", body).then((r) => r.data),

  updateApplication: (id: string, body: object) =>
    api.put(`/jobs/applications/${id}`, body).then((r) => r.data),

  deleteApplication: (id: string) =>
    api.delete(`/jobs/applications/${id}`).then((r) => r.data),
};

export const recruiterApi = {
  register: (body: object) => api.post("/recruiter/register", body).then((r) => r.data as import("../types").RecruiterProfile),
  profile: () => api.get("/recruiter/profile").then((r) => r.data as import("../types").RecruiterProfile),
  updateProfile: (body: object) => api.put("/recruiter/profile", body).then((r) => r.data as import("../types").RecruiterProfile),
  deleteProfile: () => api.delete("/recruiter/profile").then((r) => r.data),
  talentPools: () => api.get("/recruiter/talent-pools").then((r) => r.data as import("../types").TalentPool[]),
  createTalentPool: (body: object) => api.post("/recruiter/talent-pools", body).then((r) => r.data as import("../types").TalentPool),
  savedCandidates: (poolId?: string) =>
    api.get("/recruiter/saved-candidates", { params: poolId ? { pool_id: poolId } : undefined }).then((r) => r.data as import("../types").SavedCandidate[]),
  saveCandidate: (body: object) => api.post("/recruiter/saved-candidates", body).then((r) => r.data as import("../types").SavedCandidate),
  updateSavedCandidate: (id: string, body: object) => api.put(`/recruiter/saved-candidates/${id}`, body).then((r) => r.data as import("../types").SavedCandidate),
  deleteSavedCandidate: (id: string) => api.delete(`/recruiter/saved-candidates/${id}`).then((r) => r.data),
};

export const axiomJobsApi = {
  list: (params?: { q?: string; region?: string; mine?: boolean }) =>
    api.get("/axiom-jobs", { params }).then((r) => r.data as import("../types").AxiomJob[]),
  mine: () => api.get("/axiom-jobs/mine").then((r) => r.data as import("../types").AxiomJob[]),
  get: (id: string) => api.get(`/axiom-jobs/${id}`).then((r) => r.data as import("../types").AxiomJob),
  create: (body: object) => api.post("/axiom-jobs", body).then((r) => r.data as import("../types").AxiomJob),
  update: (id: string, body: object) => api.put(`/axiom-jobs/${id}`, body).then((r) => r.data as import("../types").AxiomJob),
  close: (id: string) => api.delete(`/axiom-jobs/${id}`).then((r) => r.data),
  share: (id: string) => api.post(`/axiom-jobs/${id}/share`).then((r) => r.data),
  meta: (id: string) => api.get(`/axiom-jobs/${id}/meta`).then((r) => r.data),
};

export const axiomApplicationsApi = {
  list: () => api.get("/axiom-applications").then((r) => r.data as import("../types").AxiomApplication[]),
  apply: (body: object) => api.post("/axiom-applications", body).then((r) => r.data as import("../types").AxiomApplication),
  employer: () => api.get("/axiom-applications/employer").then((r) => r.data as import("../types").AxiomApplication[]),
  updateStatus: (id: string, body: object) => api.put(`/axiom-applications/${id}/status`, body).then((r) => r.data as import("../types").AxiomApplication),
};

export const liveInterviewApi = {
  list: () => api.get("/interview-live").then((r) => r.data as import("../types").LiveInterviewSession[]),
  schedule: (body: object) => api.post("/interview-live/schedule", body).then((r) => r.data as import("../types").LiveInterviewSession),
  get: (id: string) => api.get(`/interview-live/${id}`).then((r) => r.data as import("../types").LiveInterviewSession),
  nextQuestion: (id: string) => api.post(`/interview-live/${id}/next-question`).then((r) => r.data as import("../types").LiveInterviewSession),
  answer: (id: string, body: object) => api.post(`/interview-live/${id}/answer`, body).then((r) => r.data as import("../types").LiveInterviewSession),
  followUp: (id: string, body: object) => api.post(`/interview-live/${id}/follow-up`, body).then((r) => r.data as import("../types").LiveInterviewSession),
  summarize: (id: string) => api.post(`/interview-live/${id}/summarize`).then((r) => r.data as import("../types").LiveInterviewSession),
  feedback: (id: string, body: object) => api.put(`/interview-live/${id}/feedback`, body).then((r) => r.data as import("../types").LiveInterviewSession),
};

export const notificationsApi = {
  list: () => api.get("/notifications").then((r) => r.data as import("../types").NotificationItem[]),
  read: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data as import("../types").NotificationItem),
  readAll: () => api.put("/notifications/read-all").then((r) => r.data),
};


export const interviewApi = {
  start: (body: {
    cv_id: string;
    job_id?: string;
    job_description?: string;
    mode: import("../types").InterviewMode;
    use_star?: boolean;
  }) => api.post("/interview/start", body).then((r) => r.data as { session_id: string; first_question: string }),

  answer: (sessionId: string, answer: string) =>
    api
      .post("/interview/answer", { session_id: sessionId, answer })
      .then((r) => r.data as { feedback: import("../types").InterviewFeedback; next_question?: string | null; done: boolean }),

  sessions: () =>
    api.get("/interview/sessions").then((r) => r.data as import("../types").InterviewSessionListItem[]),

  session: (id: string) =>
    api.get(`/interview/sessions/${id}`).then((r) => r.data as import("../types").InterviewSessionDetail),
};
