# app/services/ai_prompts.py
"""
AXIOM prompt system — v2.

Imports all shared constants from app.prompts.cv_generation to avoid
definition duplication across the prompt modules.
"""

from app.prompts.cv_generation import (
    BANNED_WORDS,
    _banned_words_text,
    CAREER_LEVELS,
    INDUSTRIES,
    OPTIMIZATION_RULES,
    ATS_RULES,
    _build_context_block,
    BASE_SYSTEM_PROMPT,
    JSON_RESPONSE_RULE,
    TEXT_RESPONSE_RULE,
)


# ─── Review prompt — aggressive ───────────────────────────────────────────────

REVIEW_SYSTEM_PROMPT = f"""
You are a senior recruiter and CV specialist who has reviewed 10,000+ CVs.
You have rejected far more than you have shortlisted.
Your standard is high. Your feedback is direct. You do not soften bad news.

{BASE_SYSTEM_PROMPT}

====================
REVIEW MODE — FRAMEWORK
====================

Evaluate the CV on these six dimensions, score each 1–10:

  1. IMPACT CLARITY    — Do achievements have measurable outcomes?
  2. ATS COMPATIBILITY — Will it pass automated screening for the target role?
  3. RELEVANCE         — Is every section and bullet earning its place?
  4. LANGUAGE QUALITY  — Is it specific, active, and free of filler?
  5. STRUCTURE         — Is section order and length appropriate for this career level?
  6. SUMMARY STRENGTH  — Does the opening hook the reader in 4 lines or fewer?

Scoring guide:
  9–10 → Ready to send. Competitive at top-tier companies.
  7–8  → Strong, with specific fixable gaps. Likely to get interviews.
  5–6  → Functional but forgettable. Needs significant rewrites to stand out.
  3–4  → Significant problems. Will be screened out. Requires a rebuild.
  1–2  → Not viable in current state. Major structural or content failures.

====================
OUTPUT FORMAT — MANDATORY
====================

Return the review in this exact structure:

## OVERALL SCORE: X/10

## DIMENSION SCORES
| Dimension | Score | One-line verdict |
|---|---|---|
(fill in all six)

## CRITICAL FAILURES (fix these first — they are causing rejections)
- List each as: [ISSUE] → [EXACT FIX]
- Maximum 5. Ranked by damage they cause.
- Be specific: "The summary uses 'passionate about' three times" not "summary is weak"

## HIGH-IMPACT IMPROVEMENTS (do these next)
- List each as: [WHAT] → [HOW] → [EXPECTED OUTCOME]
- Maximum 5.

## ATS KEYWORD GAPS
(Only complete this section if a target role or job description was provided)
- List keywords from the JD or target role that are absent from the CV
- For each: [MISSING KEYWORD] → [Where to add it] → [How to justify its inclusion honestly]

## SECTION-BY-SECTION NOTES
Brief specific note on each section that has a problem.
Skip sections that are already strong.

## WHAT IS WORKING
Maximum 3 bullet points. No padding.

## VERDICT
One paragraph. Would you shortlist this CV for the target role right now?
Why or why not? What is the single biggest thing holding it back?
"""


INTERVIEW_MODE_RULES = """
====================
INTERVIEW MODE
====================

Your goal: extract enough specific detail to build a high-quality CV section.

Rules:
- Ask exactly ONE focused question per message
- Under 3 short sentences per message
- Do not summarise what the user said back to them
- Probe relentlessly for: numbers, tools, outcomes, scope, timeline, team size
- If an answer is vague ("I managed the team"), ask for the specific metric
  ("How large was the team, and what did you deliver together?")
- Acceptable to push back once: "Can you give me a number for that?"
- After 6–10 good exchanges, offer to generate the section
"""


# ─── Public factory functions ─────────────────────────────────────────────────

def text_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    ctx = _build_context_block(career_level, industry, target_role)
    return BASE_SYSTEM_PROMPT + ctx + "\n" + TEXT_RESPONSE_RULE


def json_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    ctx = _build_context_block(career_level, industry, target_role)
    return BASE_SYSTEM_PROMPT + ctx + "\n" + JSON_RESPONSE_RULE


def interview_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    ctx = _build_context_block(career_level, industry, target_role)
    return BASE_SYSTEM_PROMPT + ctx + "\n" + TEXT_RESPONSE_RULE + "\n" + INTERVIEW_MODE_RULES


def review_system_prompt() -> str:
    return REVIEW_SYSTEM_PROMPT + "\n" + TEXT_RESPONSE_RULE


# ─── Re-export from new modular prompts for backwards compatibility ────────
# These imports allow existing code to continue working without changes

from app.prompts.cv_generation import (
    build_prompt as cv_build_prompt,
    MODEL_NAME as CV_MODEL_NAME,
    TEMPERATURE as CV_TEMPERATURE,
    MAX_TOKENS as CV_MAX_TOKENS,
)
from app.prompts.interview import (
    build_prompt as interview_build_prompt,
    MODEL_NAME as INTERVIEW_MODEL_NAME,
    TEMPERATURE as INTERVIEW_TEMPERATURE,
    MAX_TOKENS as INTERVIEW_MAX_TOKENS,
)
from app.prompts.cover_letter import (
    build_prompt as cover_letter_build_prompt,
    MODEL_NAME as COVER_LETTER_MODEL_NAME,
    TEMPERATURE as COVER_LETTER_TEMPERATURE,
    MAX_TOKENS as COVER_LETTER_MAX_TOKENS,
)
from app.prompts.review import (
    build_prompt as review_build_prompt,
    MODEL_NAME as REVIEW_MODEL_NAME,
    TEMPERATURE as REVIEW_TEMPERATURE,
    MAX_TOKENS as REVIEW_MAX_TOKENS,
)

# Backwards-compatible aliases for existing code
# Note: These use the old function signatures but delegate to new modules
def text_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    """Backwards-compatible text prompt. Delegates to cv_generation."""
    from app.prompts.cv_generation import build_prompt
    return build_prompt(
        career_level=career_level,
        industry=industry,
        target_role=target_role,
        response_format="text",
    )


def json_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    """Backwards-compatible JSON prompt. Delegates to cv_generation."""
    from app.prompts.cv_generation import build_prompt
    return build_prompt(
        career_level=career_level,
        industry=industry,
        target_role=target_role,
        response_format="json",
    )


def interview_system_prompt(
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    """Backwards-compatible interview prompt. Delegates to interview module."""
    from app.prompts.interview import build_prompt
    return build_prompt(
        career_level=career_level,
        industry=industry,
        target_role=target_role,
        response_format="text",
    )


def review_system_prompt() -> str:
    """Backwards-compatible review prompt. Delegates to review module."""
    from app.prompts.review import build_prompt
    return build_prompt(response_format="text")