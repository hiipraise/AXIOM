from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


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


# CV Schemas

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
    proficiency: str = ""  # Native, Fluent, Conversational, Basic


class VolunteerItem(BaseModel):
    organization: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


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


class CVCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    data: CVData = Field(default_factory=CVData)
    is_public: bool = False
    theme: str = "minimal"
    page_count: int = Field(default=1, ge=1, le=3)


class CVUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[CVData] = None
    is_public: Optional[bool] = None
    theme: Optional[str] = None
    page_count: Optional[int] = None


class CVOut(BaseModel):
    id: str
    owner_id: str
    owner_username: str
    title: str
    data: CVData
    is_public: bool
    theme: str
    page_count: int
    slug: Optional[str]
    created_at: datetime
    updated_at: datetime
    rating: Optional[float]


class AIPromptRequest(BaseModel):
    message: str
    cv_data: Optional[CVData] = None
    context: Optional[str] = None


class AIEditRequest(BaseModel):
    instruction: str
    cv_data: CVData
    section: Optional[str] = None


class JobMatchRequest(BaseModel):
    cv_data: CVData
    job_description: str


class CVRating(BaseModel):
    cv_id: str
    score: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
