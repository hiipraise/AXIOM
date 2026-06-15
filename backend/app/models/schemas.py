# app/models/schemas.py
# Only the CVData model and new request schemas shown — merge with your existing file.
# All existing fields preserved. Three new fields added to CVData.
# Two new request bodies added for review and keyword gap analysis.

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Existing models (unchanged) ─────────────────────────────────────────────

class UserRole(str, Enum):
    user = "user"
    recruiter = "recruiter"
    staff = "staff"
    admin = "admin"
    superadmin = "superadmin"


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_\-]+$")
    password: str = Field(..., min_length=6, max_length=72)
    email: Optional[EmailStr] = None
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class RoadmapProgressItem(BaseModel):
    """Single completed roadmap item."""
    step_id: str
    completed_at: datetime


class RoadmapProgressUpdate(BaseModel):
    """Update user's roadmap progress."""
    step_id: str


class RoadmapStepComplete(BaseModel):
    """Mark a roadmap step as complete."""
    step_id: str


class UserOut(BaseModel):
    id: str
    username: str
    email: Optional[str]
    email_notifications: bool = False
    role: UserRole
    must_change_password: bool
    created_at: datetime
    is_active: bool
    roadmap_progress: List[RoadmapProgressItem] = Field(default_factory=list)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class ForgotUsername(BaseModel):
    email: Optional[str] = None
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None


class RecoverAccount(BaseModel):
    username: str
    secret_answer: str
    new_password: str = Field(..., min_length=6)


class PersonalInfo(BaseModel):
    full_name: str = ""
    job_title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""
    website: str = ""


class ExperienceItem(BaseModel):
    company: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    description: str = ""
    achievements: List[str] = []


class EducationItem(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    start_date: str = ""
    end_date: str = ""
    grade: str = ""
    description: str = ""


class CertificationItem(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""
    expiry: str = ""
    credential_id: str = ""
    url: str = ""


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = []
    url: str = ""
    start_date: str = ""
    end_date: str = ""


class AwardItem(BaseModel):
    title: str = ""
    issuer: str = ""
    date: str = ""
    description: str = ""


class LanguageItem(BaseModel):
    language: str = ""
    proficiency: str = ""


class VolunteerItem(BaseModel):
    organization: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


# ─── CVData — three new fields added ─────────────────────────────────────────

class CVData(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    certifications: List[CertificationItem] = []
    projects: List[ProjectItem] = []
    awards: List[AwardItem] = []
    languages: List[LanguageItem] = []
    volunteer: List[VolunteerItem] = []
    job_description: str = ""

    # ── NEW ──────────────────────────────────────────────────────────────────
    # Stored on the CV, not the user — one CV can be tailored differently
    career_level: str = ""
    # Valid values: student | graduate | mid | senior | career_switch | executive
    # Empty string = general (no level-specific prompt injection)

    industry: str = ""
    # Valid values: tech | business | marketing | health | creative |
    #               engineering | education | legal | general
    # Empty string = general

    target_role: str = ""
    # Free text — e.g. "Senior Product Manager at a fintech startup"
    # Used directly in prompt injection and review scoring


# ─── Existing CV schemas (unchanged) ─────────────────────────────────────────

class CVCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    data: CVData = Field(default_factory=CVData)
    is_public: bool = False
    theme: str = "minimal"
    page_count: int = Field(default=1, ge=1, le=3)
    template: str = "standard"


class CVUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[CVData] = None
    is_public: Optional[bool] = None
    theme: Optional[str] = None
    page_count: Optional[int] = None
    template: Optional[str] = None


class CVHistoryRequest(BaseModel):
    history_id: str


class CVHistoryResponse(BaseModel):
    id: str
    title: str
    saved_at: datetime
    snapshot: dict


class CVOut(BaseModel):
    id: str
    owner_id: str
    owner_username: str
    title: str
    data: CVData
    is_public: bool
    theme: str
    page_count: int
    template: str
    slug: Optional[str]
    created_at: datetime
    updated_at: datetime


class AIPromptRequest(BaseModel):
    message: str
    cv_data: Optional[CVData] = None
    context: Optional[str] = None


class AIInterviewRequest(BaseModel):
    message: str
    history: List[dict] = Field(default_factory=list)
    cv_data: Optional[CVData] = None


class AIEditRequest(BaseModel):
    instruction: str
    cv_data: CVData
    section: Optional[str] = None


class JobMatchRequest(BaseModel):
    cv_data: CVData
    job_description: str


# ─── NEW request schemas ──────────────────────────────────────────────────────

class CVReviewRequest(BaseModel):
    cv_data: CVData
    job_description: Optional[str] = None
    # job_description is optional — review works without it,
    # but ATS keyword gap section only populates when provided


class OptimizeBulletsRequest(BaseModel):
    cv_data: CVData
    experience_index: int = Field(..., ge=0)
    # Index into cv_data.experience — optimises that single entry


class KeywordGapRequest(BaseModel):
    cv_data: CVData
    job_description: str


class JobResult(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool = False
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = ""
    description: str = ""
    apply_url: str = ""
    posted_at: datetime
    source: str
    category: str = ""
    logo_url: Optional[str] = None


class AxiomJobStatus(str, Enum):
    full_time = "full-time"
    part_time = "part-time"
    contract = "contract"
    internship = "internship"


class AxiomJobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    description: str = Field(..., min_length=20)
    location: str = ""
    remote: bool = False
    job_type: str = "full-time"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "USD"
    skills_required: List[str] = Field(default_factory=list)
    experience_level: str = "mid"
    industry: str = ""
    apply_deadline: Optional[datetime] = None
    is_active: bool = True


class AxiomJobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    job_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    skills_required: Optional[List[str]] = None
    experience_level: Optional[str] = None
    industry: Optional[str] = None
    apply_deadline: Optional[datetime] = None
    is_active: Optional[bool] = None


class AxiomJobOut(AxiomJobCreate):
    id: str
    employer_id: str
    company_name: str
    company_slug: str = ""
    company_logo_url: str = ""
    is_approved: bool = True
    share_token: str
    views: int = 0
    created_at: datetime
    updated_at: datetime


class AxiomApplicationStatus(str, Enum):
    applied = "applied"
    reviewed = "reviewed"
    shortlisted = "shortlisted"
    interview_scheduled = "interview_scheduled"
    interviewed = "interviewed"
    offered = "offered"
    rejected = "rejected"
    accepted = "accepted"
    declined = "declined"


class AxiomApplicationCreate(BaseModel):
    job_id: str
    cv_id: str
    cover_letter: str = ""


class AxiomApplicationUpdate(BaseModel):
    status: Optional[AxiomApplicationStatus] = None
    employer_notes: Optional[str] = None


class AxiomApplicationOut(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    employer_id: str
    cv_id: str
    cv_snapshot: Optional[dict] = None
    cover_letter: str = ""
    status: AxiomApplicationStatus = AxiomApplicationStatus.applied
    employer_notes: str = ""
    created_at: datetime
    updated_at: datetime
    job: Optional[AxiomJobOut] = None


class RecruiterRegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=140)
    website: str = ""
    description: str = ""
    logo_url: str = ""
    industry: str = ""
    size: str = ""
    location: str = ""


class RecruiterProfileOut(RecruiterRegisterRequest):
    id: str
    user_id: str
    company_slug: str
    verified: bool = False
    is_approved: bool = True
    created_at: datetime
    updated_at: datetime


class TalentPoolCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str = ""


class TalentPoolOut(TalentPoolCreate):
    id: str
    recruiter_id: str
    candidate_count: int = 0
    created_at: datetime
    updated_at: datetime


class SavedCandidateCreate(BaseModel):
    application_id: str
    pool_id: Optional[str] = None
    notes: str = ""


class SavedCandidateUpdate(BaseModel):
    pool_id: Optional[str] = None
    notes: Optional[str] = None


class SavedCandidateOut(BaseModel):
    id: str
    recruiter_id: str
    pool_id: Optional[str] = None
    application_id: str
    candidate_id: str
    job_id: str
    cv_id: str
    candidate_name: str = ""
    candidate_title: str = ""
    candidate_location: str = ""
    skills: List[str] = Field(default_factory=list)
    cv_snapshot: Optional[dict] = None
    notes: str = ""
    source_job_title: str = ""
    status: str = ""
    created_at: datetime
    updated_at: datetime


class LiveInterviewStart(BaseModel):
    application_id: str
    session_type: str = "live_manual"
    scheduled_at: Optional[datetime] = None
    duration_minutes: int = Field(default=30, ge=15, le=120)


class LiveInterviewSession(BaseModel):
    id: str
    session_type: str
    axiom_application_id: Optional[str] = None
    jitsi_room: Optional[str] = None
    jitsi_password: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: int = 30
    employer_id: Optional[str] = None
    candidate_id: Optional[str] = None
    employer_joined_at: Optional[datetime] = None
    candidate_joined_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    recording_consent: bool = False
    transcript: List[dict] = Field(default_factory=list)
    question_queue: List[str] = Field(default_factory=list)
    current_question: str = ""
    employer_question: str = ""
    employer_question_updated_at: Optional[datetime] = None
    ai_summary: str = ""
    employer_notes: str = ""
    employer_decision: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    body: str = ""
    kind: str = "general"
    link: str = ""


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str = ""
    kind: str = "general"
    link: str = ""
    read: bool = False
    created_at: datetime


class JobSearchResponse(BaseModel):
    items: List[JobResult]
    total: int = 0
    page: int = 1
    per_page: int = 20
    cached: bool = False


class CoverLetterRequest(BaseModel):
    cv_data: CVData
    job_title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., max_length=5000)


class CoverLetterResponse(BaseModel):
    cover_letter: str


class JobMatchResponse(BaseModel):
    present_keywords: List[str] = []
    missing_keywords: List[dict] = []
    ats_score_estimate: int = 0
    notes: str = ""
    match_percentage: int = 0
    verdict: str = ""


class SavedJobToggleResponse(BaseModel):
    saved: bool


class JobSaveEntry(BaseModel):
    id: str
    user_id: str
    job_id: str
    saved_at: datetime
    job: Optional[JobResult] = None


class ApplicationStatus(str, Enum):
    saved = "saved"
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"


class ApplicationEntry(BaseModel):
    id: str
    user_id: str
    job_id: str
    status: ApplicationStatus = ApplicationStatus.saved
    cv_id: Optional[str] = None
    notes: str = ""
    applied_url: Optional[str] = None
    follow_up_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    job: Optional[JobResult] = None


class ApplicationCreate(BaseModel):
    job_id: str
    status: ApplicationStatus = ApplicationStatus.saved
    cv_id: Optional[str] = None
    notes: str = ""
    applied_url: Optional[str] = None
    follow_up_at: Optional[datetime] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    cv_id: Optional[str] = None
    notes: Optional[str] = None
    applied_url: Optional[str] = None
    follow_up_at: Optional[datetime] = None


class CVKeywordTrendItem(BaseModel):
    keyword: str
    priority: str = "medium"
    suggested_placement: str = ""


class CVAnalyticsCreate(BaseModel):
    ats_score: int = Field(..., ge=0, le=100)
    present_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[CVKeywordTrendItem] = Field(default_factory=list)
    job_description: str = ""
    source: str = "keyword_gap"


class CVAnalyticsEventOut(CVAnalyticsCreate):
    id: str
    cv_id: str
    owner_id: str
    created_at: datetime


class CVKeywordTrendOut(BaseModel):
    keyword: str
    count: int
    priority: str = "medium"
    suggested_placement: str = ""
    last_seen_at: datetime


class CVAnalyticsOut(BaseModel):
    cv_id: str
    events: List[CVAnalyticsEventOut] = Field(default_factory=list)
    missing_keyword_trends: List[CVKeywordTrendOut] = Field(default_factory=list)
    present_keyword_trends: List[CVKeywordTrendOut] = Field(default_factory=list)


class SkillGapRequest(BaseModel):
    cv_data: CVData
    target_role: str = Field(..., min_length=2, max_length=140)


class SkillGapItem(BaseModel):
    skill: str
    priority: str = "medium"
    reason: str = ""
    current_evidence: str = ""


class LearningRoadmapStep(BaseModel):
    phase: str
    focus: str
    skills: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    project: str = ""
    outcome: str = ""


class SkillGapResponse(BaseModel):
    target_role: str
    readiness_score: int = Field(..., ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[SkillGapItem] = Field(default_factory=list)
    roadmap: List[LearningRoadmapStep] = Field(default_factory=list)
    notes: str = ""

class InterviewMode(str, Enum):
    behavioural = "behavioural"
    technical = "technical"
    full = "full"


class InterviewStartRequest(BaseModel):
    cv_id: str
    job_id: Optional[str] = None
    job_description: Optional[str] = None
    mode: InterviewMode = InterviewMode.behavioural
    use_star: bool = True


class InterviewStartResponse(BaseModel):
    session_id: str
    first_question: str


class InterviewAnswerRequest(BaseModel):
    session_id: str
    answer: str = Field(..., min_length=1)


class InterviewScore(BaseModel):
    clarity: int = Field(default=0, ge=0, le=10)
    specificity: int = Field(default=0, ge=0, le=10)
    evidence: int = Field(default=0, ge=0, le=10)
    length: int = Field(default=0, ge=0, le=10)


class InterviewFeedback(BaseModel):
    score: InterviewScore = Field(default_factory=InterviewScore)
    overall_score: int = Field(default=0, ge=0, le=100)
    what_was_strong: str = ""
    what_was_vague: str = ""
    recruiter_takeaway: str = ""
    suggested_improvement: str = ""


class InterviewAnswerResponse(BaseModel):
    feedback: InterviewFeedback
    next_question: Optional[str] = None
    done: bool = False


class InterviewSessionListItem(BaseModel):
    id: str
    cv_id: str
    job_id: Optional[str] = None
    job_title: str = ""
    company: str = ""
    mode: InterviewMode
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    answered_count: int = 0
    overall_score: Optional[int] = None


class InterviewMessageOut(BaseModel):
    id: str
    session_id: str
    question: str
    answer: str = ""
    feedback: Optional[InterviewFeedback] = None
    created_at: datetime
    answered_at: Optional[datetime] = None


class InterviewSessionDetail(InterviewSessionListItem):
    job_description: str = ""
    summary: Optional[dict] = None
    messages: List[InterviewMessageOut] = Field(default_factory=list)


# ─── Input validation schemas ────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    type: str = Field(default="info", pattern=r"^(info|success|warning|error)$")


class FeedbackSubmit(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    page_url: Optional[str] = None


class AnalyticsEvent(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    event_data: Optional[dict] = None
    page_url: Optional[str] = None


class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    email_notifications: Optional[bool] = None


class ExportRequest(BaseModel):
    cv_id: Optional[str] = Field(default=None, min_length=24, max_length=24)
    format: str = Field(default="pdf", pattern=r"^(pdf|html|markdown)$")
    theme: Optional[str] = None
    html: Optional[str] = Field(None, max_length=5_000_000)
    data: Optional[dict] = None
    title: Optional[str] = Field(None, max_length=120)
    username: Optional[str] = Field(None, max_length=30)
    template: Optional[str] = None


class ForgotUsernameRequest(BaseModel):
    email: Optional[EmailStr] = None


class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(user|recruiter|staff|admin|superadmin)$")


class RecruiterApprovalUpdate(BaseModel):
    is_approved: bool


class LiveAnswer(BaseModel):
    answer: str = Field(..., min_length=1, max_length=5000)
    question_id: str = Field(..., min_length=1)


class LiveFollowUp(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


class LiveFeedbackUpdate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=1000)


# Search result models
class CVSearchResult(BaseModel):
    id: str
    title: str
    owner_username: str
    updated_at: Optional[str] = None


class JobSearchResult(BaseModel):
    id: str
    title: str
    company: str
    location: str
    source: str = "indeed"
    posted_at: Optional[str] = None


class AxiomJobSearchResult(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool = False
    job_type: str = ""
    created_at: Optional[str] = None


class SearchResults(BaseModel):
    cvs: List[CVSearchResult] = []
    jobs: List[JobSearchResult] = []
    axiom_jobs: List[AxiomJobSearchResult] = []
