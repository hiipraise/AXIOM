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
    username: str = Field(..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_\-]+$")
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: Optional[str]
    role: UserRole
    must_change_password: bool
    created_at: datetime
    is_active: bool


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
    rating: Optional[float]


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


class CVRating(BaseModel):
    cv_id: str
    score: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


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


class JobSearchResponse(BaseModel):
    items: List[JobResult]
    total: int = 0
    page: int = 1
    per_page: int = 20
    cached: bool = False


class CoverLetterRequest(BaseModel):
    cv_data: CVData
    job_title: str
    company: str
    job_description: str


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
    created_at: datetime
    updated_at: datetime
    job: Optional[JobResult] = None


class ApplicationCreate(BaseModel):
    job_id: str
    status: ApplicationStatus = ApplicationStatus.saved
    cv_id: Optional[str] = None
    notes: str = ""
    applied_url: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    cv_id: Optional[str] = None
    notes: Optional[str] = None
    applied_url: Optional[str] = None