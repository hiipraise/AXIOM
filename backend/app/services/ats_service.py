"""
ATS Simulation Service

Simulates how an ATS (Applicant Tracking System) would parse a CV.
Checks for:
- Parseable section headers
- Tables in critical sections (problematic for many ATS)
- Keyword density for a given job description
- Overall ATS compatibility score
"""
from __future__ import annotations

import re
from typing import Optional
from dataclasses import dataclass, field

from app.models.schemas import CVData


# Standard section header patterns that ATS typically recognize
STANDARD_HEADERS = {
    "profile": r"^(profile|summary|professional summary|objective|career objective)$",
    "experience": r"^(experience|work experience|employment|professional experience|work history|employment history)$",
    "education": r"^(education|academic|qualifications|academic background)$",
    "skills": r"^(skills|technical skills|competencies|core skills|key skills)$",
    "certifications": r"^(certifications|certificates|certification|credentials)$",
    "projects": r"^(projects|personal projects|key projects)$",
    "awards": r"^(awards|honors|recognition|achievements)$",
    "languages": r"^(languages|language proficiency)$",
    "volunteer": r"^(volunteer|volunteering|community|volunteer work|community service)$",
}


@dataclass
class ATSFlag:
    """Represents an issue flagged by the ATS simulator."""
    severity: str  # "error", "warning", "info"
    category: str  # e.g., "structure", "keyword", "format"
    message: str   # Human-readable message
    details: Optional[str] = None


@dataclass
class ATSResult:
    """Result of ATS simulation analysis."""
    score: int  # 0-100
    flags: list[ATSFlag] = field(default_factory=list)
    extracted_text: str = ""
    section_headers_found: list[str] = field(default_factory=list)
    keyword_matches: list[str] = field(default_factory=list)
    keyword_density: dict[str, float] = field(default_factory=dict)
    missing_keywords: list[str] = field(default_factory=list)


def _normalizeHeader(header: str) -> str:
    """Normalize a header for matching."""
    return re.sub(r"[^\w\s]", "", header.lower()).strip()


def _extractPlainText(cv_data: CVData) -> str:
    """Extract plain text from CV data."""
    parts = []

    # Personal info
    pi = cv_data.personal_info
    if pi.full_name:
        parts.append(pi.full_name)
    if pi.job_title:
        parts.append(pi.job_title)
    if pi.email:
        parts.append(pi.email)
    if pi.phone:
        parts.append(pi.phone)
    if pi.location:
        parts.append(pi.location)
    if pi.linkedin:
        parts.append(pi.linkedin)
    if pi.github:
        parts.append(pi.github)
    if pi.website:
        parts.append(pi.website)

    # Summary
    if cv_data.summary:
        parts.append(cv_data.summary)

    # Experience
    for exp in cv_data.experience or []:
        if exp.role:
            parts.append(exp.role)
        if exp.company:
            parts.append(exp.company)
        if exp.description:
            parts.append(exp.description)
        for ach in (exp.achievements or []):
            if ach:
                parts.append(ach)

    # Education
    for edu in cv_data.education or []:
        if edu.degree:
            parts.append(edu.degree)
        if edu.field:
            parts.append(edu.field)
        if edu.institution:
            parts.append(edu.institution)
        if edu.description:
            parts.append(edu.description)
        if edu.grade:
            parts.append(edu.grade)

    # Skills
    for skill in (cv_data.skills or []):
        if skill:
            parts.append(skill)

    # Certifications
    for cert in cv_data.certifications or []:
        if cert.name:
            parts.append(cert.name)
        if cert.issuer:
            parts.append(cert.issuer)
        if cert.credential_id:
            parts.append(cert.credential_id)

    # Projects
    for proj in cv_data.projects or []:
        if proj.name:
            parts.append(proj.name)
        if proj.description:
            parts.append(proj.description)
        for tech in (proj.technologies or []):
            if tech:
                parts.append(tech)

    # Awards
    for award in cv_data.awards or []:
        if award.title:
            parts.append(award.title)
        if award.issuer:
            parts.append(award.issuer)
        if award.description:
            parts.append(award.description)

    # Languages
    for lang in cv_data.languages or []:
        if lang.language:
            parts.append(lang.language)
        if lang.proficiency:
            parts.append(lang.proficiency)

    # Volunteer
    for vol in cv_data.volunteer or []:
        if vol.role:
            parts.append(vol.role)
        if vol.organization:
            parts.append(vol.organization)
        if vol.description:
            parts.append(vol.description)

    return " ".join(parts)


def _checkSectionHeaders(text: str) -> tuple[list[str], list[ATSFlag]]:
    """Check for parseable section headers."""
    found_headers = []
    flags = []

    # Split text into lines and look for header-like patterns
    lines = text.split("\n")
    for line in lines:
        line_clean = _normalizeHeader(line.strip())

        # Check if line looks like a header (all caps or title case, short)
        is_header = False
        matched_header = ""

        if len(line_clean) < 50 and len(line_clean) > 2:
            # Check against standard headers
            for header_name, pattern in STANDARD_HEADERS.items():
                if re.match(pattern, line_clean, re.IGNORECASE):
                    is_header = True
                    matched_header = header_name
                    break

            # Also detect ALL CAPS headers
            if not is_header and line.isupper() and len(line_clean) > 2:
                is_header = True
                matched_header = "custom"

        if is_header and matched_header:
            if matched_header not in found_headers:
                found_headers.append(matched_header)

    # Check for missing critical sections
    critical_sections = ["experience", "education", "skills"]
    for section in critical_sections:
        if section not in found_headers:
            flags.append(ATSFlag(
                severity="warning",
                category="structure",
                message=f"Missing '{section.title()}' section header",
                details="Consider adding a clear section header like 'EXPERIENCE' or 'WORK EXPERIENCE'"
            ))

    return found_headers, flags


def _checkKeywordDensity(
    text: str,
    job_description: Optional[str]
) -> tuple[dict[str, float], list[str], list[ATSFlag]]:
    """Check keyword density against a job description."""
    keyword_density: dict[str, float] = {}
    matched_keywords: list[str] = []
    flags = []

    if not job_description:
        # No job description provided - just do basic keyword analysis
        return keyword_density, matched_keywords, flags

    # Extract keywords from job description
    # Remove common words, keep meaningful terms
    common_words = {
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must", "shall",
        "can", "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "as", "into", "through", "during", "before", "after", "above", "below",
        "between", "under", "again", "further", "then", "once", "here",
        "there", "when", "where", "why", "how", "all", "each", "few", "more",
        "most", "other", "some", "such", "no", "nor", "not", "only", "own",
        "same", "so", "than", "too", "very", "just", "also", "now", "about",
        "this", "that", "these", "those", "it", "its", "we", "our", "they",
        "their", "you", "your", "he", "she", "him", "her", "his", "i", "me",
        "my", "experience", "work", "job", "role", "team", "company",
    }

    # Extract words (2+ characters, alphanumeric)
    job_words = re.findall(r"\b[a-zA-Z]{2,}\b", job_description.lower())
    job_keywords = [w for w in job_words if w not in common_words]

    # Count unique keywords
    job_keyword_set = set(job_keywords)

    # Calculate density
    cv_text_lower = text.lower()
    cv_words = re.findall(r"\b[a-zA-Z]{2,}\b", cv_text_lower)

    if not cv_words:
        return keyword_density, matched_keywords, flags

    for keyword in job_keyword_set:
        count = cv_text_lower.count(keyword)
        density = (count / len(cv_words)) * 100 if cv_words else 0
        keyword_density[keyword] = round(density, 2)

        if count > 0:
            matched_keywords.append(keyword)

    # Check for missing important keywords
    missing = []
    for keyword in job_keyword_set:
        if keyword not in cv_text_lower:
            missing.append(keyword)

    # Flag if too many keywords missing (more than 30%)
    if len(missing) > len(job_keyword_set) * 0.3:
        flags.append(ATSFlag(
            severity="warning",
            category="keyword",
            message=f"Missing {len(missing)} important keywords from job description",
            details=f"Missing keywords: {', '.join(missing[:10])}{'...' if len(missing) > 10 else ''}"
        ))

    return keyword_density, matched_keywords, flags


def _checkFormatting(text: str) -> list[ATSFlag]:
    """Check for formatting issues that might cause ATS problems."""
    flags = []

    # Check for special characters that might not parse well
    problematic_chars = [
        (r"[▢▢]", "box-drawing characters"),
        (r"[\u200b-\u200f]", "zero-width characters"),
    ]

    for pattern, desc in problematic_chars:
        if re.search(pattern, text):
            flags.append(ATSFlag(
                severity="error",
                category="format",
                message=f"Found {desc} in CV",
                details="These characters may cause parsing issues in some ATS systems"
            ))

    # Check for excessive caps (yelling)
    caps_words = re.findall(r"\b[A-Z]{4,}\b", text)
    if len(caps_words) > 10:
        flags.append(ATSFlag(
            severity="info",
            category="format",
            message=f"Found {len(caps_words)} words in all caps",
            details="Consider using title case for better readability"
        ))

    # Check text length
    word_count = len(text.split())
    if word_count < 100:
        flags.append(ATSFlag(
            severity="warning",
            category="content",
            message="CV seems too short",
            details=f"Only {word_count} words found. Consider adding more detail."
        ))
    elif word_count > 1500:
        flags.append(ATSFlag(
            severity="warning",
            category="content",
            message="CV may be too long",
            details=f"{word_count} words found. Consider condensing for ATS compatibility."
        ))

    return flags


def simulateATS(
    cv_data: CVData,
    job_description: Optional[str] = None,
    public_url: Optional[str] = None,
) -> ATSResult:
    """
    Simulate ATS parsing of a CV.

    Args:
        cv_data: The CV data to analyze
        job_description: Optional job description for keyword matching
        public_url: Optional public URL of the CV (for additional checks)

    Returns:
        ATSResult with score and detailed flags
    """
    flags: list[ATSFlag] = []

    # Step 1: Extract plain text
    extracted_text = _extractPlainText(cv_data)

    # Step 2: Check section headers
    section_headers, header_flags = _checkSectionHeaders(extracted_text)
    flags.extend(header_flags)

    # Step 3: Check keyword density
    keyword_density, matched_keywords, keyword_flags = _checkKeywordDensity(
        extracted_text, job_description
    )
    flags.extend(keyword_flags)

    # Step 4: Check formatting
    format_flags = _checkFormatting(extracted_text)
    flags.extend(format_flags)

    # Calculate score
    score = 100

    # Deduct for errors (15 points each)
    errors = [f for f in flags if f.severity == "error"]
    score -= len(errors) * 15

    # Deduct for warnings (5 points each)
    warnings = [f for f in flags if f.severity == "warning"]
    score -= len(warnings) * 5

    # Bonus for good keyword match (up to +10)
    if job_description and keyword_density:
        match_rate = len(matched_keywords) / max(len(keyword_density), 1)
        score += int(match_rate * 10)

    # Clamp score to 0-100
    score = max(0, min(100, score))

    # Determine missing keywords
    missing_keywords: list[str] = []
    if job_description:
        job_words = set(re.findall(r"\b[a-zA-Z]{2,}\b", job_description.lower()))
        cv_lower = extracted_text.lower()
        for word in job_words:
            if word not in cv_lower and len(word) > 3:
                missing_keywords.append(word)

    return ATSResult(
        score=score,
        flags=flags,
        extracted_text=extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
        section_headers_found=section_headers,
        keyword_matches=matched_keywords[:20],  # Limit for response size
        keyword_density=dict(list(keyword_density.items())[:20]),
        missing_keywords=missing_keywords[:20],
    )