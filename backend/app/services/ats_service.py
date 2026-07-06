"""
ATS Simulation Service

Simulates how an ATS (Applicant Tracking System) would parse a CV.
Checks for:
- Parseable section headers
- Tables in critical sections (problematic for many ATS)
- TF-IDF keyword density for a given job description
- ATS vendor-specific compatibility checks (Greenhouse, Lever, Workable, etc.)
- Overall ATS compatibility score
"""
from __future__ import annotations

import math
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

# ATS vendor compatibility rules
# Each vendor has known parsing quirks and format preferences
ATS_VENDORS = {
    "greenhouse": {
        "name": "Greenhouse",
        "url": "greenhouse.io",
        "parsing_quirks": [
            (r"\btable\b", "Uses table-based layout interpreter — PDF tables may merge cell contents"),
            (r"(?<!\S)@(?=\S)", "Maps email and URL fields from specific HTML meta tags; expects visible 'mailto:' links"),
            (r"\bcolou?r\b", "Color/colour variations are normalised — no penalty"),
            (r"\bphotos?\b", "Photos in headers can confuse its coordinate-based parser"),
        ],
        "preferred_format": "Clean sections with standard headers (Experience, Education, Skills)",
        "penalty_triggers": ["tables", "nested_tables", "missing_email_format"],
        "weight": 1.0,
    },
    "lever": {
        "name": "Lever",
        "url": "lever.co",
        "parsing_quirks": [
            (r"\bpage\s*\d+\b", "Page numbers may be treated as content if inline with text"),
            (r"\btwo[- ]?column\b", "Two-column layouts can cause out-of-order extraction"),
            (r"\bicon\b", "Icons or symbols may drop text alignment cues"),
            (r"\binline\s*:\s*\w", "Inline lists (e.g. 'Skills: Python, JS') parse better than multi-column"),
        ],
        "preferred_format": "Single-column layout with inline list formatting",
        "penalty_triggers": ["two_column", "page_numbers_inline"],
        "weight": 0.9,
    },
    "workable": {
        "name": "Workable",
        "url": "workable.com",
        "parsing_quirks": [
            (r"\bbullet\b", "Bullet points are well-supported — use them"),
            (r"\bheader\s*&\s*footer\b", "Headers/footers are often lost during PDF-to-text conversion"),
            (r"\bgraph\b", "Charts/graphs are ignored entirely"),
        ],
        "preferred_format": "Bulleted achievements under each role",
        "penalty_triggers": ["missing_section_headers", "header_footer_content"],
        "weight": 0.85,
    },
    "breezy": {
        "name": "Breezy HR",
        "url": "breezy.hr",
        "parsing_quirks": [
            (r"\bdate\s*range\b", "Expects clear date ranges (MM/YYYY — MM/YYYY) for each role"),
            (r"\bpdf\s*meta\b", "Extracts PDF metadata fields (Author, Subject) into candidate notes"),
        ],
        "preferred_format": "Chronological order with explicit date ranges",
        "penalty_triggers": ["missing_dates"],
        "weight": 0.8,
    },
    "smartrecruiters": {
        "name": "SmartRecruiters",
        "url": "smartrecruiters.com",
        "parsing_quirks": [
            (r"\bunicode\b", "Unicode characters generally parse well but non-ASCII symbols may drop"),
            (r"\baccent\b", "Accented characters are preserved — safe to use non-English names"),
        ],
        "preferred_format": "Standard sections with UTF-8 encoding",
        "penalty_triggers": ["special_chars"],
        "weight": 0.75,
    },
}


@dataclass
class ATSFlag:
    """Represents an issue flagged by the ATS simulator."""
    severity: str  # "error", "warning", "info"
    category: str  # e.g., "structure", "keyword", "format"
    message: str   # Human-readable message
    details: Optional[str] = None


@dataclass
class ATSVendorScore:
    """Compatibility score for a specific ATS vendor."""
    vendor: str
    score: int  # 0-100
    flags: list[ATSFlag] = field(default_factory=list)
    quirks_detected: list[str] = field(default_factory=list)


@dataclass
class ATSResult:
    """Result of ATS simulation analysis."""
    score: int  # 0-100
    flags: list[ATSFlag] = field(default_factory=list)
    extracted_text: str = ""
    section_headers_found: list[str] = field(default_factory=list)
    keyword_matches: list[dict] = field(default_factory=list)  # {keyword, tfidf, count}
    keyword_density: dict[str, float] = field(default_factory=dict)
    missing_keywords: list[str] = field(default_factory=list)
    tfidf_scores: dict[str, float] = field(default_factory=dict)
    vendor_scores: list[ATSVendorScore] = field(default_factory=list)
    vendor_overall: int = 0  # Average vendor compatibility score (0-100)


def _normalizeHeader(header: str) -> str:
    """Normalize a header for matching."""
    return re.sub(r"[^\w\s]", "", header.lower()).strip()


# ─── TF-IDF implementation (pure Python) ────────────────────────────────────

# Common English stop words used across keyword matching functions
STOP_WORDS: set[str] = {
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
    "my", "experience", "work", "job", "role", "team", "company", "including",
    "related", "across", "within", "based", "such", "well", "also", "etc",
    "must", "every", "able", "use", "using", "used", "like", "including",
}

# General-domain corpus for IDF estimation — simulates ~10k docs
# Populated with estimated doc frequencies for common job-description terms
CORPUS_TERMS: dict[str, float] = {
    # Programming languages & tools (appear in many JDs)
    "python": 1500, "javascript": 1400, "java": 1200, "typescript": 800,
    "react": 900, "node": 700, "sql": 1600, "aws": 1000, "docker": 600,
    "git": 1200, "kubernetes": 500, "linux": 800, "api": 1300, "rest": 900,
    "html": 1400, "css": 1300, "sass": 300, "graphql": 400, "mongodb": 500,
    "postgresql": 600, "redis": 300, "kafka": 200, "terraform": 300,
    "ci": 500, "cd": 400, "agile": 800, "scrum": 600, "jira": 500,
    # Business & soft skills
    "leadership": 1200, "management": 1400, "communication": 1500,
    "strategy": 800, "analytics": 900, "collaboration": 1000,
    "problem": 1100, "solving": 900, "critical": 500, "thinking": 700,
    "mentoring": 400, "stakeholder": 600, "negotiation": 300,
    # Common role-specific terms
    "fullstack": 400, "frontend": 500, "backend": 600, "devops": 500,
    "machine": 400, "learning": 500, "data": 1200, "cloud": 800,
    "security": 600, "testing": 700, "deployment": 600, "monitoring": 400,
    "performance": 700, "scalability": 400, "architecture": 600,
    "microservices": 400, "saas": 300, "qa": 400, "sdlc": 300,
    # Domain terms
    "marketing": 600, "sales": 500, "finance": 500, "hr": 400,
    "operations": 500, "product": 700, "design": 800, "research": 500,
    "engineering": 700, "compliance": 300, "regulatory": 200,
}
CORPUS_SIZE = 10_000  # Simulated corpus size


def _tokenize(text: str) -> list[str]:
    """Tokenize text into lowercase words (2+ chars)."""
    return re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())


def _compute_tf(term: str, doc_tokens: list[str]) -> float:
    """Term frequency: count of term in doc / total terms in doc."""
    if not doc_tokens:
        return 0.0
    return doc_tokens.count(term) / len(doc_tokens)


def _compute_idf(term: str) -> float:
    """Inverse document frequency: log(corpus_size / doc_frequency).
    Uses estimated doc frequencies from CORPUS_TERMS when available,
    falls back to a default IDF for unknown terms."""
    doc_freq = CORPUS_TERMS.get(term, 100)  # Default: appears in 100 of 10k docs
    return math.log(CORPUS_SIZE / (1 + doc_freq))


def _compute_tfidf(doc_text: str, query_terms: set[str]) -> dict[str, float]:
    """Compute TF-IDF scores for query terms against the document.
    Returns dict of {term: tfidf_score}."""
    tokens = _tokenize(doc_text)
    if not tokens:
        return {}

    scores = {}
    for term in query_terms:
        tf = _compute_tf(term, tokens)
        idf = _compute_idf(term)
        scores[term] = round(tf * idf, 4)
    return scores


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


def _checkSectionHeaders(cv_data: CVData) -> tuple[list[str], list[ATSFlag]]:
    """Check for populated sections directly from structured CV data."""
    found_headers = []
    flags = []

    section_checks = {
        "profile":        cv_data.summary,
        "experience":     any(e.company or e.role for e in (cv_data.experience or [])),
        "education":      any(e.institution or e.degree for e in (cv_data.education or [])),
        "skills":         bool(cv_data.skills),
        "certifications": any(c.name for c in (cv_data.certifications or [])),
        "projects":       any(p.name for p in (cv_data.projects or [])),
        "awards":         any(a.title for a in (cv_data.awards or [])),
        "languages":      any(l.language for l in (cv_data.languages or [])),
        "volunteer":      any(v.organization for v in (cv_data.volunteer or [])),
    }

    for section, present in section_checks.items():
        if present:
            found_headers.append(section)

    # Flag missing critical sections with correct section name in details
    critical_sections = ["experience", "education", "skills"]
    for section in critical_sections:
        if section not in found_headers:
            label = section.upper()
            flags.append(ATSFlag(
                severity="warning",
                category="structure",
                message=f"Missing '{section.title()}' section",
                details=f"Add content to your {section.title()} section — ATS systems expect a clear '{label}' block"
            ))

    return found_headers, flags


# ─── TF-IDF keyword matching (replaces simple word count) ──────────────────

def _checkKeywordDensity(
    text: str,
    job_description: Optional[str]
) -> tuple[dict[str, float], list[dict], list[str], list[ATSFlag]]:
    """Check keyword density against a job description using TF-IDF scoring.
    Returns (keyword_density, matched_keywords_with_scores, missing_keywords, flags).
    """
    keyword_density: dict[str, float] = {}
    matched_keywords: list[dict] = []
    missing_keywords: list[str] = []
    flags = []

    if not job_description:
        return keyword_density, matched_keywords, missing_keywords, flags

    jd_tokens = _tokenize(job_description)
    # Extract multi-word phrases (2-3 word sequences that repeat)
    jd_bigrams = set()
    for i in range(len(jd_tokens) - 1):
        bigram = f"{jd_tokens[i]} {jd_tokens[i+1]}"
        if jd_tokens[i] not in STOP_WORDS or jd_tokens[i+1] not in STOP_WORDS:
            jd_bigrams.add(bigram)

    unique_jd_terms = set(t for t in jd_tokens if t not in STOP_WORDS and len(t) > 2)

    # Compute TF-IDF scores for each JD keyword against the CV
    tfidf_scores = _compute_tfidf(text, unique_jd_terms)

    # Sort by TF-IDF score descending
    sorted_terms = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)

    cv_lower = text.lower()
    cv_tokens = _tokenize(text)

    for keyword, tfidf in sorted_terms:
        count = cv_tokens.count(keyword)
        density = (count / max(len(cv_tokens), 1)) * 100
        keyword_density[keyword] = round(density, 2)

        entry = {"keyword": keyword, "tfidf": round(tfidf, 4), "count": count}
        if count > 0:
            matched_keywords.append(entry)
        else:
            missing_keywords.append(keyword)

    # Flag missing high-value keywords (those with highest implied TF-IDF in JD)
    high_value_missing = [k for k, s in sorted_terms if s > 0.05 and k in missing_keywords][:8]
    if high_value_missing:
        flags.append(ATSFlag(
            severity="warning",
            category="keyword",
            message=f"Missing {len(high_value_missing)} high-value keywords",
            details=f"Keywords most relevant to this role: {', '.join(high_value_missing)}"
        ))

    # Flag bigrams present in JD but split in CV
    missing_bigrams = []
    for bg in jd_bigrams:
        if bg not in cv_lower:
            missing_bigrams.append(bg)
    if missing_bigrams:
        display = missing_bigrams[:5]
        suffix = f" and {len(missing_bigrams) - 5} more" if len(missing_bigrams) > 5 else ""
        flags.append(ATSFlag(
            severity="info",
            category="keyword",
            message=f"Missing {len(missing_bigrams)} multi-word phrases from JD",
            details=f"Phrases: {', '.join(display)}{suffix}"
        ))

    return keyword_density, matched_keywords, missing_keywords, flags


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


# ─── ATS vendor-specific compatibility checks ───────────────────────────────

def _check_vendor_compatibility(
    extracted_text: str,
    cv_data: CVData,
) -> list[ATSVendorScore]:
    """Run compatibility checks for each known ATS vendor."""
    scores = []
    cv_lower = extracted_text.lower()
    cv_tokens = _tokenize(extracted_text)

    for vendor_key, vendor in ATS_VENDORS.items():
        vendor_flags: list[ATSFlag] = []
        quirks_detected: list[str] = []
        deductions = 0

        for pattern, description in vendor.get("parsing_quirks", []):
            if re.search(pattern, cv_lower):
                quirks_detected.append(description)
                vendor_flags.append(ATSFlag(
                    severity="info",
                    category="vendor_compatibility",
                    message=f"[{vendor['name']}] Possible parsing concern",
                    details=description,
                ))

        # Check penalty triggers
        triggers = vendor.get("penalty_triggers", [])

        # Missing section headers
        if "missing_section_headers" in triggers:
            # Check extracted text for standard section header patterns
            has_experience_header = bool(re.search(
                r"\b(experience|work history|employment|professional experience)\b",
                cv_lower
            ))
            if not has_experience_header:
                deductions += 10
                vendor_flags.append(ATSFlag(
                    severity="warning", category="vendor_compatibility",
                    message=f"[{vendor['name']}] Missing Experience section header",
                    details=vendor["preferred_format"]
                ))

        # Two-column layout issue
        if "two_column" in triggers:
            # Heuristic: check for short lines that might indicate columns
            lines = extracted_text.split("\n")
            short_lines = [l for l in lines if 5 < len(l.strip()) < 40]
            if len(short_lines) > len(lines) * 0.3:
                deductions += 8
                vendor_flags.append(ATSFlag(
                    severity="warning", category="vendor_compatibility",
                    message=f"[{vendor['name']}] Possible two-column layout detected",
                    details=vendor["preferred_format"]
                ))

        # Page numbers inline
        if "page_numbers_inline" in triggers:
            if re.search(r"\bpage\s+\d+\b", cv_lower):
                deductions += 5
                vendor_flags.append(ATSFlag(
                    severity="warning", category="vendor_compatibility",
                    message=f"[{vendor['name']}] Page numbers found inline",
                    details=vendor["preferred_format"]
                ))

        # Missing dates
        if "missing_dates" in triggers:
            has_dates = bool(re.search(r"\b(19|20)\d{2}\b", extracted_text))
            if not has_dates:
                deductions += 10
                vendor_flags.append(ATSFlag(
                    severity="warning", category="vendor_compatibility",
                    message=f"[{vendor['name']}] Date ranges not detected",
                    details=vendor["preferred_format"]
                ))

        # Tables detected
        if "tables" in triggers:
            if re.search(r"\b(table|grid layout|multi[ -]?column)\b", cv_lower):
                deductions += 5

        # Special characters
        if "special_chars" in triggers:
            special = re.findall(r"[^\x20-\x7E\n]", extracted_text)
            if special:
                deductions += min(8, len(special))

        # Score: start at 100, apply deductions
        vendor_score = max(0, min(100, 100 - deductions))
        scores.append(ATSVendorScore(
            vendor=vendor_key,
            score=vendor_score,
            flags=vendor_flags,
            quirks_detected=quirks_detected,
        ))

    return scores


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
    section_headers, header_flags = _checkSectionHeaders(cv_data)
    flags.extend(header_flags)

    # Step 3: Check keyword density with TF-IDF
    keyword_density, matched_keywords, missing_keywords, keyword_flags = _checkKeywordDensity(
        extracted_text, job_description
    )
    flags.extend(keyword_flags)

    # Step 4: Check formatting
    format_flags = _checkFormatting(extracted_text)
    flags.extend(format_flags)

    # Step 5: Check ATS vendor compatibility
    vendor_scores = _check_vendor_compatibility(extracted_text, cv_data)
    for vs in vendor_scores:
        if vs.flags:
            flags.extend(vs.flags)

    # Extract TF-IDF scores for the response
    tfidf_scores = {}
    if job_description:
        jd_tokens = _tokenize(job_description)
        unique_terms = set(t for t in jd_tokens if t not in STOP_WORDS and len(t) > 2)
        tfidf_scores = _compute_tfidf(extracted_text, unique_terms)
        # Keep top 30
        tfidf_scores = dict(sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)[:30])

    # Calculate base score
    score = 100

    # Deduct for errors (15 points each)
    errors = [f for f in flags if f.severity == "error"]
    score -= len(errors) * 15

    # Deduct for warnings (5 points each)
    warnings = [f for f in flags if f.severity == "warning"]
    score -= len(warnings) * 5

    # Bonus for strong TF-IDF keyword match (up to +15)
    if matched_keywords:
        avg_tfidf = sum(m.get("tfidf", 0) for m in matched_keywords) / max(len(matched_keywords), 1)
        score += int(min(15, avg_tfidf * 50))

    # Clamp score to 0-100
    score = max(0, min(100, score))

    # Compute vendor overall average
    vendor_overall = 0
    if vendor_scores:
        vendor_overall = int(sum(vs.score for vs in vendor_scores) / len(vendor_scores))
        # Blend vendor score into final score
        score = int(score * 0.7 + vendor_overall * 0.3)
        score = max(0, min(100, score))

    return ATSResult(
        score=score,
        flags=flags,
        extracted_text=extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
        section_headers_found=section_headers,
        keyword_matches=matched_keywords[:20],
        keyword_density=dict(list(keyword_density.items())[:20]),
        missing_keywords=missing_keywords[:20],
        tfidf_scores=tfidf_scores,
        vendor_scores=vendor_scores,
        vendor_overall=vendor_overall,
    )