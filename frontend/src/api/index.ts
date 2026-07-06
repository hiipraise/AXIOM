import axios from "axios";
import { useAuthStore } from "../store/auth";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
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

// Guard against 401 infinite loops
let _isHandling401 = false;

// On 401 → clear auth with best-effort revocation
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !_isHandling401) {
      _isHandling401 = true;
      try {
        await api.post("/auth/logout");
      } finally {
        useAuthStore.getState().clearAuth();
        _isHandling401 = false;
      }
    }
    return Promise.reject(err);
  },
);

// Track page events (announcement clicks/dismisses)
export const trackEvent = (eventType: string, detail?: object) => {
  api.post("/analytics/page-event", { event_type: eventType, ...detail }).catch(() => {});
};

// Extract error detail from axios error - properly typed
export function getErrorDetail(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? null;
  }
  return null;
}

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
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      useAuthStore.getState().clearAuth();
    }
  },
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
  registerWithCV: (data: {
    username: string;
    password: string;
    email?: string;
    secret_question?: string;
    secret_answer?: string;
    cv_title: string;
    cv_data: object;
  }) =>
    api
      .post("/auth/register-with-cv", data, {
        headers: { "X-Return-Token": "true" },
      })
      .then((r) => r.data),
  setPassword: (data: { new_password: string }) =>
    api.post("/auth/set-password", data).then((r) => r.data as { message: string }),
  downloadMyData: () =>
    api.get("/auth/download-my-data", { responseType: "blob" }).then((r) => {
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-axiom-data.json";
      a.click();
      window.URL.revokeObjectURL(url);
    }),
  getRoadmapProgress: () => api.get("/auth/roadmap-progress").then((r) => r.data),
  completeRoadmapStep: (stepId: string) =>
    api.post("/auth/roadmap-progress", { step_id: stepId }).then((r) => r.data),

  // ── OAuth ──
  oauthLogin: (provider: string) =>
    api.get(`/auth/oauth/${provider}`).then((r) => r.data as { url: string }),

  oauthProviders: () =>
    api.get("/auth/oauth/providers").then((r) => r.data as { providers: string[] }),
};

export const cvApi = {
  list: (skip = 0, limit = 20) =>
    api.get(`/cv?skip=${skip}&limit=${limit}`).then((r) => r.data as { cvs: import("../types").CV[]; total: number; skip: number; limit: number }),
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
  atsPreview: (cvData: object, jobDescription?: string) =>
    api
      .post("/cv/ai/ats-preview", {
        cv_data: cvData,
        job_description: jobDescription || null,
      })
      .then((r) => r.data),
  skillGap: (cvData: object, targetRole: string) =>
    api
      .post("/cv/ai/skill-gap", {
        cv_data: cvData,
        target_role: targetRole,
      })
      .then((r) => r.data as import("../types").SkillGapResponse),

  // ── Skill endorsements ──────────────────────────────────────────────
  endorseSkill: (skill: string, cvId?: string, comment?: string) =>
    api
      .post("/cv/ai/skill-endorsements", { skill, cv_id: cvId, comment: comment || "" })
      .then((r) => r.data as import("../types").SkillEndorsement),

  skillEndorsements: (skill: string) =>
    api
      .get(`/cv/ai/skill-endorsements/${encodeURIComponent(skill)}`)
      .then((r) => r.data as import("../types").SkillEndorsementSummary),

  myEndorsements: () =>
    api
      .get("/cv/my-endorsements")
      .then((r) => r.data as import("../types").SkillEndorsement[]),

  removeEndorsement: (skill: string) =>
    api
      .delete(`/cv/ai/skill-endorsements/${encodeURIComponent(skill)}`)
      .then((r) => r.data as { deleted: boolean }),

  // ── Course suggestions ──────────────────────────────────────────────
  coursesForSkill: (skill: string) =>
    api
      .get(`/cv/ai/courses/${encodeURIComponent(skill)}`)
      .then((r) => r.data as import("../types").SkillCourses),
  uploadCV: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post("/cv/upload-cv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // ── Section suggestions & tone adjustment ──────────────────────────────
  sectionSuggestions: (cvData: object, jobDescription: string) =>
    api
      .post("/cv/ai/section-suggestions", {
        cv_data: cvData,
        job_description: jobDescription,
      })
      .then((r) => r.data as import("../types").SectionSuggestionsResponse),

  adjustTone: (cvData: object, section: string, tone: string, customInstruction?: string) =>
    api
      .post("/cv/ai/adjust-tone", {
        cv_data: cvData,
        section,
        tone,
        custom_instruction: customInstruction || "",
      })
      .then((r) => r.data as import("../types").ToneAdjustResponse),
};

export const exportApi = {
  previewPDF: (data: object) =>
    api
      .post("/export/preview", data, { responseType: "blob" })
      .then((r) => r.data as Blob),
  downloadPDF: (cvId: string): Promise<Blob> =>
    api
      .get(`/export/export/${cvId}`, { params: { format: "pdf" }, responseType: "blob" })
      .then((r) => r.data),
  downloadDOCX: (cvId: string): Promise<Blob> =>
    api
      .get(`/export/export/${cvId}`, { params: { format: "docx" }, responseType: "blob" })
      .then((r) => r.data),
  downloadTXT: (cvId: string): Promise<Blob> =>
    api
      .get(`/export/export/${cvId}`, { params: { format: "txt" }, responseType: "blob" })
      .then((r) => r.data),
  downloadPublicPDF: (username: string, slug: string): Promise<Blob> =>
    axios
      .get(`${BASE}/api/v1/export/export-public/${username}/${slug}`, {
        params: { format: "pdf" },
        responseType: "blob",
      })
      .then((r) => r.data),
  downloadPublicDOCX: (username: string, slug: string): Promise<Blob> =>
    axios
      .get(`${BASE}/api/v1/export/export-public/${username}/${slug}`, {
        params: { format: "docx" },
        responseType: "blob",
      })
      .then((r) => r.data),
  downloadPublicTXT: (username: string, slug: string): Promise<Blob> =>
    axios
      .get(`${BASE}/api/v1/export/export-public/${username}/${slug}`, {
        params: { format: "txt" },
        responseType: "blob",
      })
      .then((r) => r.data),

  // ── PDF/A ──
  downloadPDFA: (cvId: string): Promise<Blob> =>
    api
      .get(`/export/pdf/${cvId}`, { params: { pdfa: true }, responseType: "blob" })
      .then((r) => r.data),
  downloadPublicPDFA: (username: string, slug: string): Promise<Blob> =>
    axios
      .get(`${BASE}/api/v1/export/public-pdf/${username}/${slug}`, {
        params: { pdfa: true },
        responseType: "blob",
      })
      .then((r) => r.data),

  // ── Download analytics ──
  downloadAnalytics: (cvId: string): Promise<import("../types").DownloadAnalytics> =>
    api.get(`/export/analytics/${cvId}`).then((r) => r.data as import("../types").DownloadAnalytics),

  // ── Cache invalidation ──
  invalidateCache: (cvId: string) =>
    api.post(`/export/invalidate-cache/${cvId}`).then((r) => r.data as { deleted: number }),
};

export const publicApi = {
  getCV: (username: string, slug: string) =>
    axios.get(`${BASE}/api/v1/public/cv/${username}/${slug}`).then((r) => r.data),
  getProfile: (username: string) =>
    axios.get(`${BASE}/api/v1/public/profile/${username}`).then((r) => r.data),
  browseCVs: (params: { q?: string; skills?: string; page?: number; per_page?: number }) =>
    axios.get(`${BASE}/api/v1/public/cvs/browse`, { params }).then((r) => r.data as { items: import("../types").CVBrowseCard[]; total: number; page: number; per_page: number }),
};

export const adminApi = {
  stats: () => api.get("/admin/stats").then((r) => r.data),
  users: (skip = 0, limit = 50) =>
    api.get(`/admin/users?skip=${skip}&limit=${limit}`).then((r) => r.data),
  setRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  aiStats: () => api.get("/admin/ai-stats").then((r) => r.data),
  securityStats: () => api.get("/admin/security-stats").then((r) => r.data),
  exportStats: () => api.get("/admin/export-stats").then((r) => r.data),
  deactivate: (id: string) =>
    api.put(`/admin/users/${id}/deactivate`).then((r) => r.data),
  activate: (id: string) =>
    api.put(`/admin/users/${id}/activate`).then((r) => r.data),
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),
  cvs: (skip = 0, limit = 50) =>
    api.get(`/admin/cvs?skip=${skip}&limit=${limit}`).then((r) => r.data),
  auditLog: (skip = 0, limit = 100) =>
    api.get(`/admin/audit-log?skip=${skip}&limit=${limit}`).then((r) => r.data),
  engagementStats: () => api.get("/admin/engagement-stats").then((r) => r.data),
  pushStats: () =>
    api.get("/admin/push-stats").then((r) => r.data as { total_subscriptions: number; distinct_users: number; vapid_configured: boolean }),
  pushSubscriptions: (skip = 0, limit = 100) =>
    api.get(`/admin/push-subscriptions?skip=${skip}&limit=${limit}`).then((r) => r.data as { subscriptions: import("../types").PushSubscriptionEntry[]; total: number }),
  searchUsers: (params: { q?: string; role?: string; status?: string; date_from?: string; date_to?: string; skip?: number; limit?: number }) =>
    api.get("/admin/users/search", { params }).then((r) => r.data as { users: Record<string, unknown>[]; total: number }),
};

export const jobsApi = {
  search: (params: {
    q?: string;
    location?: string;
    remote?: boolean | null;
    region?: string;
    nigeria_state?: string;
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
};



export const notificationsApi = {
  list: (skip: number = 0, limit: number = 50) =>
    api.get(`/notifications?skip=${skip}&limit=${limit}`).then((r) => r.data as import("../types").NotificationItem[]),
  count: () => api.get("/notifications/count").then((r) => r.data.total as number),
  read: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data as import("../types").NotificationItem),
  readAll: () => api.put("/notifications/read-all").then((r) => r.data),

  // ── Preferences ──
  preferences: () =>
    api.get("/notifications/preferences").then((r) => r.data as import("../types").NotificationPreferences),
  updatePreferences: (body: import("../types").NotificationPreferences) =>
    api.put("/notifications/preferences", body).then((r) => r.data as import("../types").NotificationPreferences),

  // ── Quiet hours ──
  quietHours: () =>
    api.get("/notifications/quiet-hours").then((r) => r.data as import("../types").QuietHoursStatus),

  // ── Push subscription ──
  subscribePush: (body: import("../types").PushSubscription) =>
    api.post("/notifications/push/subscribe", body).then((r) => r.data as { success: boolean; message: string }),
  unsubscribePush: () =>
    api.delete("/notifications/push/subscribe").then((r) => r.data as { success: boolean; message: string }),

  // ── Review-due check ──
  checkReviewDue: () =>
    api.post("/notifications/review-due-check").then((r) => r.data as { notified: boolean; due_count: number; reason?: string }),
};

export const searchApi = {
  global: (q: string, limit: number = 10) =>
    api.get("/search", { params: { q, limit } }).then((r) => r.data as import("../types").SearchResults),
};

export const emailApi = {
  send: (body: import("../types").EmailSendRequest) =>
    api.post("/email/send", body).then((r) => r.data as import("../types").EmailSendResponse),
  sendBatch: (body: import("../types").EmailBatchRequest) =>
    api.post("/email/batch", body).then((r) => r.data as import("../types").EmailSendResponse),
};


export const commentsApi = {
  list: (cvId: string, section?: string, resolved?: boolean) =>
    api
      .get(`/cv/${cvId}/comments`, {
        params: { section, resolved },
      })
      .then((r) => r.data as import("../types").CommentItem[]),

  create: (cvId: string, body: import("../types").CommentCreate) =>
    api
      .post(`/cv/${cvId}/comments`, body)
      .then((r) => r.data as import("../types").CommentItem),

  update: (cvId: string, commentId: string, body: { text?: string; resolved?: boolean }) =>
    api
      .put(`/cv/${cvId}/comments/${commentId}`, body)
      .then((r) => r.data as import("../types").CommentItem),

  delete: (cvId: string, commentId: string) =>
    api.delete(`/cv/${cvId}/comments/${commentId}`).then((r) => r.data),

  counts: (cvId: string) =>
    api
      .get(`/cv/${cvId}/comments/count`)
      .then((r) => r.data as import("../types").CommentCounts),
};

export const interviewApi = {
  start: (body: {
    cv_id: string;
    job_id?: string;
    job_description?: string;
    mode: import("../types").InterviewMode;
    use_star?: boolean;
    force?: boolean;
  }) => api.post("/interview/start", body).then((r) => r.data as { session_id: string; first_question: string }),

  answer: (sessionId: string, answer: string) =>
    api
      .post("/interview/answer", { session_id: sessionId, answer })
      .then((r) => r.data as { feedback: import("../types").InterviewFeedback; next_question?: string | null; done: boolean }),

  sessions: () =>
    api.get("/interview/sessions").then((r) => r.data as import("../types").InterviewSessionListItem[]),

  pauseSession: (sessionId: string) =>
    api.post(`/interview/sessions/${sessionId}/pause`).then((r) => r.data as { message: string }),

  session: (id: string) =>
    api.get(`/interview/sessions/${id}`).then((r) => r.data as import("../types").InterviewSessionDetail),

  uploadRecording: async (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/interview/upload-recording/${sessionId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as { recording_id: string; url: string };
  },

  getRecording: (fileName: string) =>
    `${BASE}/api/v1/interview/recordings/${fileName}`,

  // ── Spaced-repetition review cards ──
  generateReviewCards: (sessionId: string) =>
    api.post(`/interview/review/generate?session_id=${sessionId}`).then(r => r.data as { cards: import("../types").ReviewCard[]; count: number }),

  reviewCards: () =>
    api.get("/interview/review/cards").then(r => r.data as import("../types").ReviewCard[]),

  rateReviewCard: (cardId: string, rating: import("../types").ReviewCardDifficulty) =>
    api.post("/interview/review/rate", { card_id: cardId, rating }).then(r => r.data),

  reviewCardStats: () =>
    api.get("/interview/review/stats").then(r => r.data as import("../types").ReviewCardStats),

  // ── All review cards (with search/filter) ──
  reviewCardsAll: (params?: { topic?: string; status?: string }) =>
    api.get('/interview/review/cards/all', { params }).then(r => r.data as import("../types").ReviewCard[]),

  // ── All sessions (history) ──
  allSessions: (params?: { status?: string; limit?: number; skip?: number }) =>
    api.get("/interview/sessions", { params }).then(r => r.data as import("../types").InterviewSessionListItem[]),

  // ── Share results ──
  createShareToken: (sessionId: string) =>
    api.post(`/interview/sessions/${sessionId}/share`).then(r => r.data as { share_token: string; share_url: string }),

  getSharedSession: (shareToken: string) =>
    axios.get(`${BASE}/api/v1/interview/shared/${shareToken}`).then(r => r.data as {
      username: string;
      job_title: string;
      company: string;
      mode: string;
      overall_score: number | null;
      summary: import("../types").InterviewSessionDetail['summary'];
      question_count: number;
      answered_count: number;
      messages: import("../types").InterviewMessage[];
    }),

  revokeShareToken: (shareToken: string) =>
    api.delete(`/interview/shared/${shareToken}`).then(r => r.data as { message: string }),

  // ── Topics & difficulty ──
  topics: () =>
    api.get("/interview/topics").then(r => r.data as { topics: import("../types").InterviewTopic[]; total_sessions: number }),

  difficulty: (mode: string = "behavioural") =>
    api.get(`/interview/difficulty?mode=${mode}`).then(r => r.data as import("../types").DifficultyInfo),
};
