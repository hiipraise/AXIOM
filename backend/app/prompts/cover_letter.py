# app/prompts/cover_letter.py
"""
Cover letter generation prompts.

Exports build_prompt(**kwargs) -> str with model configuration constants.
"""

from app.config import settings
from app.prompts.cv_generation import JSON_RESPONSE_RULE, TEXT_RESPONSE_RULE

# Model configuration — centralized per module
MODEL_NAME = settings.groq_model
TEMPERATURE = 0.2
MAX_TOKENS = 900


# ─── Base system prompt ─────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """
You are AXIOM, a specialist cover letter writer.

Your job is to craft professional, tailored cover letters that complement
a CV and demonstrate genuine interest in a role.

====================
COVER LETTER RULES
====================

1. UNDER 350 WORDS — keep it concise
2. Professional, specific, and concise
3. No clichés or buzzwords
4. Use only truthful evidence from the CV
5. Structure: opening (who you are + why this role), evidence (relevant experience), close (call to action)
6. Address the role and company directly
7. Do NOT repeat the CV — add context and personality
8. No emoji or informal language
9. Plain, direct English
10. Return PLAIN TEXT only — no markdown formatting like **bold**, *italic*, _underscores_,
    [links](url), heading markers (#), or any other markdown syntax. Plain text only.
"""


# ─── Public build_prompt function ───────────────────────────────────

def build_prompt(
    job_title: str = "",
    company: str = "",
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
    response_format: str = "text",
) -> str:
    """
    Build a cover letter system prompt.

    Args:
        job_title: The position being applied for
        company: The company name
        career_level: One of student, graduate, mid, senior, career_switch, executive
        industry: One of tech, business, marketing, health, creative, engineering, education, legal, general
        target_role: The role being targeted
        response_format: "text" or "json"

    Returns:
        Complete system prompt string
    """
    job_info = f"Job title: {job_title}\nCompany: {company}" if job_title or company else ""

    prompt = f"""{BASE_SYSTEM_PROMPT}

{job_info}

Context:
- career_level: {career_level}
- industry: {industry}
- target_role: {target_role}
"""

    if response_format == "json":
        prompt += "\n" + JSON_RESPONSE_RULE
    else:
        prompt += "\n" + TEXT_RESPONSE_RULE

    return prompt


# ─── Convenience functions ────────────────────────────────────────────

def build_simple_prompt() -> str:
    """Build a basic cover letter prompt without extra context."""
    return build_prompt(response_format="text")