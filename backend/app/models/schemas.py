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


class RegisterWithCV(BaseModel):
    """Register a new user and import their guest CV data."""
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_\-]+$")
    password: str = Field(..., min_length=6, max_length=72)
    email: Optional[EmailStr] = None
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None
    cv_title: str = "My CV"
    cv_data: dict


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
    show_name: bool = True
    show_email: bool = False
    show_phone: bool = False
    show_experience: bool = True


class CVUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[CVData] = None
    is_public: Optional[bool] = None
    show_name: Optional[bool] = None
    show_email: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_experience: Optional[bool] = None
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
    show_name: bool = True
    show_email: bool = False
    show_phone: bool = False
    show_experience: bool = True
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


class SourceHealth(BaseModel):
    configured: int = 0
    succeeded: int = 0
    failed: int = 0
    sources_with_results: List[str] = Field(default_factory=list)
    warning: str = ""


class JobSearchResponse(BaseModel):
    items: List[JobResult]
    total: int = 0
    page: int = 1
    per_page: int = 20
    cached: bool = False
    source_health: SourceHealth = Field(default_factory=SourceHealth)


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

    # ── NEW: Market data ────────────────────────────────────────────────────
    skill_demand: dict[str, float] = Field(default_factory=dict)
    """Skill demand scores (0-100) from real job postings. key=skill, value=demand."""
    total_jobs_analyzed: int = 0
    sample_titles: List[str] = Field(default_factory=list)


# ─── Skill Endorsement models ────────────────────────────────────────────────

class SkillEndorsementCreate(BaseModel):
    skill: str = Field(..., min_length=1, max_length=120)
    cv_id: Optional[str] = None
    comment: str = ""


class SkillEndorsementOut(BaseModel):
    id: str
    user_id: str
    skill: str
    cv_id: Optional[str] = None
    endorser_username: str = ""
    comment: str = ""
    created_at: datetime


class SkillEndorsementSummary(BaseModel):
    skill: str
    count: int = 0
    endorsements: List[SkillEndorsementOut] = Field(default_factory=list)


# ─── Course Link models ───────────────────────────────────────────────────────

class CourseLink(BaseModel):
    title: str
    url: str
    platform: str = ""
    cost: str = "free"  # free | paid


class SkillCourses(BaseModel):
    skill: str
    courses: List[CourseLink] = Field(default_factory=list)


class SkillGapWithCourses(SkillGapItem):
    courses: List[CourseLink] = Field(default_factory=list)

class ReviewCardDifficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class InterviewTopic(BaseModel):
    name: str
    count: int = 0
    avg_score: Optional[float] = None
    trend: str = "stable"  # improving | declining | stable


class ReviewCardCreate(BaseModel):
    session_id: str
    question: str
    answer: str = ""
    topic: str = "general"
    difficulty: ReviewCardDifficulty = ReviewCardDifficulty.medium


class ReviewCardRating(BaseModel):
    card_id: str
    rating: ReviewCardDifficulty


class ReviewCardOut(BaseModel):
    id: str
    user_id: str
    session_id: str
    question: str
    answer: str = ""
    topic: str = "general"
    difficulty: str = "medium"
    last_reviewed: Optional[datetime] = None
    review_count: int = 0
    next_review_at: Optional[datetime] = None
    created_at: datetime


class DifficultyAdjustRequest(BaseModel):
    mode: str = ""
    recent_scores: List[int] = Field(default_factory=list)


class DifficultyAdjustResponse(BaseModel):
    level: str  # beginner | intermediate | advanced
    max_questions: int
    description: str


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
    force: bool = False


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
    share_token: Optional[str] = None


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
    scheduled_at: Optional[datetime] = None
    target_segment: str = Field(default="all", pattern=r"^(all|new_users|active_users|role:user|role:staff|role:admin)$")


class AnnouncementUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
    type: Optional[str] = Field(None, pattern=r"^(info|success|warning|error)$")
    scheduled_at: Optional[datetime] = None
    target_segment: Optional[str] = Field(None, pattern=r"^(all|new_users|active_users|role:user|role:staff|role:admin)$")


TARGET_SEGMENT_LABELS = {
    "all": "All users",
    "new_users": "New users (first 7 days)",
    "active_users": "Active users (last 30 days)",
    "role:user": "Role: User",
    "role:staff": "Role: Staff",
    "role:admin": "Role: Admin",
}


class FeedbackSubmit(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    type: str = Field(default="other", pattern=r"^(rate|keep|add|remove|other)$")
    rating: Optional[int] = Field(None, ge=1, le=5)
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
    role: str = Field(..., pattern=r"^(user|staff|admin|superadmin)$")


# Email request/response models
class EmailSendRequest(BaseModel):
    to: str | List[str] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=200)
    html: Optional[str] = Field(None, max_length=500_000)
    template_key: Optional[str] = None
    variables: Optional[dict] = None


class EmailBatchRequest(BaseModel):
    to: List[str] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=200)
    html: Optional[str] = Field(None, max_length=500_000)
    template_key: Optional[str] = None
    variables: Optional[dict] = None
    batch_size: int = Field(default=50, ge=1, le=500)
    batch_interval_minutes: int = Field(default=15, ge=1, le=1440)


class EmailSendResponse(BaseModel):
    success: bool
    message: str = ""


# ─── Notification preferences ──────────────────────────────────────────────────

class QuietHours(BaseModel):
    enabled: bool = False
    start: str = "22:00"  # HH:MM in UTC
    end: str = "08:00"    # HH:MM in UTC


class NotificationPreferences(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = False
    quiet_hours: QuietHours = Field(default_factory=QuietHours)
    kinds: dict[str, bool] = Field(default_factory=lambda: {
        "general": True,
        "application": True,
        "interview": True,
        "review_card": True,
        "announcement": True,
    })


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # { p256dh: str, auth: str }


class PushSubscriptionResponse(BaseModel):
    success: bool
    message: str = ""


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


class SearchResults(BaseModel):
    cvs: List[CVSearchResult] = []
    jobs: List[JobSearchResult] = []


# ─── Comment & Suggestion models ─────────────────────────────────────────────

class CommentCreate(BaseModel):
    section: str = Field(..., min_length=1, max_length=50)
    field_path: str = ""
    text: str = Field(..., min_length=1, max_length=2000)
    is_suggestion: bool = False
    suggested_value: Optional[str] = Field(None, max_length=5000)
    parent_id: Optional[str] = None


class CommentUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
    resolved: Optional[bool] = None


class CommentOut(BaseModel):
    id: str
    cv_id: str
    section: str
    field_path: str = ""
    user_id: str
    username: str = ""
    text: str
    is_suggestion: bool = False
    suggested_value: Optional[str] = None
    resolved: bool = False
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─── CV Review (structured score) models ───────────────────────────────────────

class DimensionScore(BaseModel):
    """Single dimension score for a CV review."""
    name: str
    score: int = Field(..., ge=1, le=10)
    verdict: str = ""


class CVReviewResult(BaseModel):
    """Structured result of an AI CV review with validated scores."""
    overall_score: int = Field(..., ge=1, le=10)
    dimensions: list[DimensionScore] = Field(default_factory=list)
    critical_failures: list[str] = Field(default_factory=list)
    high_impact_improvements: list[str] = Field(default_factory=list)
    ats_keyword_gaps: list[str] = Field(default_factory=list)
    section_notes: str = ""
    what_is_working: list[str] = Field(default_factory=list)
    verdict: str = ""


# ─── Section Suggestion models ────────────────────────────────────────────────

class SectionSuggestion(BaseModel):
    section: str
    field: str = ""
    title: str
    description: str
    suggested_change: Optional[str] = None
    priority: str = "medium"  # high | medium | low


class SectionSuggestionsResponse(BaseModel):
    suggestions: List[SectionSuggestion] = Field(default_factory=list)


# ─── Tone Adjustment models ───────────────────────────────────────────────────

class ToneAdjustRequest(BaseModel):
    cv_data: CVData
    section: str
    tone: str = "professional"  # professional | concise | assertive | confident | moderate | enthusiastic
    custom_instruction: Optional[str] = Field(None, max_length=500)


TONE_OPTIONS = [
    "professional",
    "concise",
    "assertive",
    "confident",
    "moderate",
    "enthusiastic",
]


class ToneAdjustResponse(BaseModel):
    original: str
    adjusted: str
    section: str
    tone: str
