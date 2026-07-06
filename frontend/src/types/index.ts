export interface RoadmapProgressItem {
  step_id: string;
  completed_at: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  email_notifications?: boolean;
  role: "user" | "staff" | "admin" | "superadmin";
  must_change_password: boolean;
  created_at: string;
  is_active: boolean;
  roadmap_progress?: RoadmapProgressItem[];
  oauth_provider?: string | null;
}

export interface PersonalInfo {
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  website: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  grade: string;
  description: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  expiry: string;
  credential_id: string;
  url: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  url: string;
  start_date: string;
  end_date: string;
}

export interface AwardItem {
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface LanguageItem {
  language: string;
  proficiency: string;
}

export interface VolunteerItem {
  organization: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface CVData {
  personal_info: PersonalInfo;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  awards: AwardItem[];
  languages: LanguageItem[];
  volunteer: VolunteerItem[];
  job_description: string;
  career_level: string;
  career_level_custom?: string;
  industry: string;
  industry_custom?: string;
  target_role: string;
}

export interface CV {
  id: string;
  owner_id: string;
  owner_username: string;
  title: string;
  data: CVData;
  is_public: boolean;
  show_name?: boolean;
  show_email?: boolean;
  show_phone?: boolean;
  show_experience?: boolean;
  theme: string;
  template: string;
  page_count: number;
  slug?: string;
  created_at: string;
  updated_at: string;
}

export const EMPTY_CV_DATA: CVData = {
  personal_info: {
    full_name: "",
    job_title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    website: "",
  },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  awards: [],
  languages: [],
  volunteer: [],
  job_description: "",
  career_level: "",
  career_level_custom: "",
  industry: "",
  industry_custom: "",
  target_role: "",
};

export const normalizeCVData = (data?: Partial<CVData> | null): CVData => {
  if (!data) return { ...EMPTY_CV_DATA };
  return {
    ...EMPTY_CV_DATA,
    ...data,
    career_level: data?.career_level ?? "",
    industry: data?.industry ?? "",
    target_role: data?.target_role ?? "",
    job_description: data?.job_description ?? "",
    personal_info: {
      ...EMPTY_CV_DATA.personal_info,
      ...(data?.personal_info || {}),
    },
    skills: data?.skills || [],
    experience: data?.experience || [],
    education: data?.education || [],
    certifications: data?.certifications || [],
    projects: data?.projects || [],
    awards: data?.awards || [],
    languages: data?.languages || [],
    volunteer: data?.volunteer || [],
  };
};

export const EMPTY_EXPERIENCE: ExperienceItem = {
  company: "",
  role: "",
  start_date: "",
  end_date: "",
  current: false,
  description: "",
  achievements: [],
};

export const EMPTY_EDUCATION: EducationItem = {
  institution: "",
  degree: "",
  field: "",
  start_date: "",
  end_date: "",
  grade: "",
  description: "",
};

export const EMPTY_CERT: CertificationItem = {
  name: "",
  issuer: "",
  date: "",
  expiry: "",
  credential_id: "",
  url: "",
};

export const EMPTY_PROJECT: ProjectItem = {
  name: "",
  description: "",
  technologies: [],
  url: "",
  start_date: "",
  end_date: "",
};

export const EMPTY_AWARD: AwardItem = {
  title: "",
  issuer: "",
  date: "",
  description: "",
};

export const EMPTY_LANGUAGE: LanguageItem = {
  language: "",
  proficiency: "",
};

export const EMPTY_VOLUNTEER: VolunteerItem = {
  organization: "",
  role: "",
  start_date: "",
  end_date: "",
  description: "",
};

export type CVTheme =
  | "minimal"
  | "classic"
  | "sharp"
  | "executive"
  | "nordic"
  | "terracotta"
  | "forest"
  | "royal";

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  currency: string;
  description: string;
  apply_url: string;
  posted_at: string;
  source: string;
  category: string;
  logo_url?: string | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  link: string;
  read: boolean;
  created_at: string;
}

export interface SourceHealth {
  configured: number;
  succeeded: number;
  failed: number;
  sources_with_results: string[];
  warning: string;
}

export interface JobSearchResponse {
  items: JobResult[];
  total: number;
  page: number;
  per_page: number;
  cached: boolean;
  source_health?: SourceHealth;
}

export interface JobMatchResult {
  present_keywords: string[];
  missing_keywords: Array<{
    keyword: string;
    priority?: string;
    suggested_placement?: string;
  }>;
  ats_score_estimate: number;
  notes: string;
  match_percentage: number;
  verdict: string;
}

export interface CVAnalyticsKeyword {
  keyword: string;
  priority: string;
  suggested_placement: string;
}

export interface CVAnalyticsEvent {
  id: string;
  cv_id: string;
  owner_id: string;
  ats_score: number;
  present_keywords: string[];
  missing_keywords: CVAnalyticsKeyword[];
  job_description: string;
  source: string;
  created_at: string;
}

export interface CVKeywordTrend {
  keyword: string;
  count: number;
  priority: string;
  suggested_placement: string;
  last_seen_at: string;
}

export interface CVAnalytics {
  cv_id: string;
  events: CVAnalyticsEvent[];
  missing_keyword_trends: CVKeywordTrend[];
  present_keyword_trends: CVKeywordTrend[];
}

export interface SkillGapItem {
  skill: string;
  priority: string;
  reason: string;
  current_evidence: string;
}

export interface LearningRoadmapStep {
  phase: string;
  focus: string;
  skills: string[];
  actions: string[];
  project: string;
  outcome: string;
}

export interface SkillGapResponse {
  target_role: string;
  readiness_score: number;
  matched_skills: string[];
  missing_skills: SkillGapItem[];
  roadmap: LearningRoadmapStep[];
  notes: string;

  // ── Market data ──
  skill_demand: Record<string, number>;
  total_jobs_analyzed: number;
  sample_titles: string[];
}

// ─── Skill endorsement types ─────────────────────────────────────────────────

export interface SkillEndorsement {
  id: string;
  user_id: string;
  skill: string;
  cv_id: string | null;
  endorser_username: string;
  comment: string;
  created_at: string;
}

export interface SkillEndorsementSummary {
  skill: string;
  count: number;
  endorsements: SkillEndorsement[];
}

// ─── Course link types ───────────────────────────────────────────────────────

export interface CourseLink {
  title: string;
  url: string;
  platform: string;
  cost: "free" | "paid";
}

export interface SkillCourses {
  skill: string;
  courses: CourseLink[];
}

// ─── Skill Gaps with courses ─────────────────────────────────────────────────

export interface SkillGapItemWithCourses extends SkillGapItem {
  courses: CourseLink[];
}

// ─── Comment & Suggestion types ───────────────────────────────────────────────

export interface CommentItem {
  id: string;
  cv_id: string;
  section: string;
  field_path: string;
  user_id: string;
  username: string;
  text: string;
  is_suggestion: boolean;
  suggested_value: string | null;
  resolved: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  section: string;
  field_path?: string;
  text: string;
  is_suggestion?: boolean;
  suggested_value?: string;
  parent_id?: string;
}

export interface CommentCounts {
  total: number;
  open: number;
  sections: Record<string, { total: number; open: number; suggestions: number }>;
}

// ─── Section Suggestion types ─────────────────────────────────────────────────

export interface SectionSuggestion {
  section: string;
  field: string;
  title: string;
  description: string;
  suggested_change: string | null;
  priority: "high" | "medium" | "low";
}

export interface SectionSuggestionsResponse {
  suggestions: SectionSuggestion[];
}

// ─── Tone Adjustment types ────────────────────────────────────────────────────

export const TONE_OPTIONS = [
  "professional",
  "concise",
  "assertive",
  "confident",
  "moderate",
  "enthusiastic",
] as const;

export type ToneStyle = typeof TONE_OPTIONS[number];

export interface ToneAdjustResponse {
  original: string;
  adjusted: string;
  section: string;
  tone: string;
}

export interface CoverLetterResponse {
  cover_letter: string;
}

export type ReviewCardDifficulty = "easy" | "medium" | "hard";

export interface ReviewCard {
  id: string;
  user_id: string;
  session_id: string;
  question: string;
  answer: string;
  topic: string;
  difficulty: ReviewCardDifficulty;
  last_reviewed: string | null;
  review_count: number;
  next_review_at: string | null;
  created_at: string;
}

export interface ReviewCardStats {
  total: number;
  due: number;
  completed: number;
}

export interface InterviewTopic {
  name: string;
  count: number;
  avg_score: number | null;
  trend: "improving" | "declining" | "stable";
}

export interface DifficultyInfo {
  level: "beginner" | "intermediate" | "advanced";
  max_questions: number;
  description: string;
}

export type InterviewMode = "behavioural" | "technical" | "full";

export interface InterviewScore {
  clarity: number;
  specificity: number;
  evidence: number;
  length: number;
}

export interface InterviewFeedback {
  score: InterviewScore;
  overall_score: number;
  what_was_strong: string;
  what_was_vague: string;
  suggested_improvement: string;
}

export interface InterviewSessionListItem {
  id: string;
  cv_id: string;
  job_id?: string | null;
  job_title: string;
  company: string;
  mode: InterviewMode;
  status: "active" | "paused" | "completed" | string;
  created_at: string;
  updated_at: string;
  question_count: number;
  answered_count: number;
  overall_score?: number | null;
  share_token?: string | null;
  /** Whether the session was started with STAR coaching enabled */
  use_star?: boolean;
}

export interface InterviewMessage {
  id: string;
  session_id: string;
  question: string;
  answer: string;
  feedback?: InterviewFeedback | null;
  created_at: string;
  answered_at?: string | null;
}

export interface InterviewSessionDetail extends InterviewSessionListItem {
  job_description: string;
  summary?: {
    overall_score?: number;
    weakest_area?: string;
    top_3_improvements?: string[];
    summary?: string;
  } | null;
  messages: InterviewMessage[];
}

// Search result types
export interface CVSearchResult {
  id: string;
  title: string;
  owner_username: string;
  updated_at?: string;
}

export interface JobSearchResult {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  posted_at?: string;
}

export interface SearchResults {
  cvs: CVSearchResult[];
  jobs: JobSearchResult[];
}

export interface EmailSendRequest {
  to: string | string[];
  subject: string;
  html?: string;
  template_key?: string;
  variables?: Record<string, string>;
}

export interface EmailBatchRequest {
  to: string[];
  subject: string;
  html?: string;
  template_key?: string;
  variables?: Record<string, string>;
  batch_size: number;
  batch_interval_minutes: number;
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
}

// ─── Notification Preferences ─────────────────────────────────────────────────

export interface QuietHours {
  enabled: boolean;
  start: string;  // HH:MM
  end: string;    // HH:MM
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours: QuietHours;
  kinds: Record<string, boolean>;
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSubscriptionEntry {
  user_id: string;
  username: string;
  email?: string;
  endpoint: string;
  subscribed_at?: string;
}

export interface QuietHoursStatus extends QuietHours {
  active_now: boolean;
}

export interface DownloadFormatStats {
  count: number;
  last_ts: string | null;
  total_bytes: number;
}

export interface DownloadAnalytics {
  cv_id: string;
  total_downloads: number;
  cache_hit_rate: number;
  formats: Record<string, DownloadFormatStats>;
}

export interface CVBrowseCard {
  id: string;
  owner_username: string;
  title: string;
  name: string;
  email: string;
  job_title: string;
  location: string;
  skills: string[];
  summary: string;
  updated_at: string;
}
