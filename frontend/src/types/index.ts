export interface User {
  id: string;
  username: string;
  email?: string;
  email_notifications?: boolean;
  role: "user" | "recruiter" | "staff" | "admin" | "superadmin";
  must_change_password: boolean;
  created_at: string;
  is_active: boolean;
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
  industry: string;
  target_role: string;
}

export interface CV {
  id: string;
  owner_id: string;
  owner_username: string;
  title: string;
  data: CVData;
  is_public: boolean;
  theme: string;
  template: string; // ← new: layout template
  page_count: number;
  slug?: string;
  created_at: string;
  updated_at: string;
  rating?: number;
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
  industry: "",
  target_role: "",
};

export const normalizeCVData = (data?: Partial<CVData> | null): CVData => ({
  ...EMPTY_CV_DATA,
  ...data,
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
});

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

export interface AxiomJob {
  id: string;
  employer_id: string;
  company_name: string;
  company_slug: string;
  company_logo_url: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  job_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency: string;
  skills_required: string[];
  experience_level: string;
  industry: string;
  apply_deadline?: string | null;
  is_active: boolean;
  is_approved: boolean;
  share_token: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface RecruiterProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_slug: string;
  logo_url: string;
  website: string;
  description: string;
  industry: string;
  size: string;
  location: string;
  verified: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export type AxiomApplicationStatus =
  | "applied"
  | "reviewed"
  | "shortlisted"
  | "interview_scheduled"
  | "interviewed"
  | "offered"
  | "rejected"
  | "accepted"
  | "declined";

export interface AxiomApplication {
  id: string;
  job_id: string;
  candidate_id: string;
  employer_id: string;
  cv_id: string;
  cv_snapshot?: Record<string, unknown> | null;
  cover_letter: string;
  status: AxiomApplicationStatus;
  employer_notes: string;
  created_at: string;
  updated_at: string;
  job?: AxiomJob | null;
}

export interface LiveInterviewSession {
  id: string;
  session_type: string;
  axiom_application_id?: string | null;
  jitsi_room?: string | null;
  jitsi_password?: string | null;
  scheduled_at?: string | null;
  duration_minutes: number;
  employer_id?: string | null;
  candidate_id?: string | null;
  employer_joined_at?: string | null;
  candidate_joined_at?: string | null;
  ended_at?: string | null;
  recording_consent: boolean;
  transcript: Array<Record<string, unknown>>;
  question_queue: string[];
  current_question: string;
  employer_question: string;
  employer_question_updated_at?: string | null;
  ai_summary: string;
  employer_notes: string;
  employer_decision?: string | null;
  created_at: string;
  updated_at: string;
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

export interface JobSearchResponse {
  items: JobResult[];
  total: number;
  page: number;
  per_page: number;
  cached: boolean;
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

export interface CoverLetterResponse {
  cover_letter: string;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface ApplicationEntry {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  cv_id?: string | null;
  notes: string;
  applied_url?: string | null;
  created_at: string;
  updated_at: string;
  job?: JobResult | null;
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
  recruiter_takeaway: string;
  suggested_improvement: string;
}

export interface InterviewSessionListItem {
  id: string;
  cv_id: string;
  job_id?: string | null;
  job_title: string;
  company: string;
  mode: InterviewMode;
  status: "active" | "completed" | string;
  created_at: string;
  updated_at: string;
  question_count: number;
  answered_count: number;
  overall_score?: number | null;
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
