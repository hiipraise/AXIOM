# app/services/ai_service.py
import json
import logging
import asyncio
from functools import lru_cache
from typing import Optional

from groq import Groq, APIError, AuthenticationError, APIConnectionError, RateLimitError
from fastapi import HTTPException

from app.utils.errors import service_unavailable, bad_request

from app.config import settings
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

logger = logging.getLogger(__name__)
MODEL_NAME = settings.groq_model

# Retry configuration
MAX_RETRIES = 3
BASE_DELAY = 1.0  # seconds


@lru_cache(maxsize=1)
def get_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)


def _log_failure(error_type: str, prompt_length: int, attempt: int = 0):
    """Log failure with structured info for troubleshooting."""
    logger.warning(
        "AI service error",
        extra={
            "error_type": error_type,
            "model": MODEL_NAME,
            "prompt_length": prompt_length,
            "attempt": attempt + 1,
            "max_retries": MAX_RETRIES,
        },
    )


async def _create_completion_with_retry(
    system_prompt: str,
    messages: list,
    max_tokens: int,
    temperature: float = 0.2,
) -> str:
    """
    Create a completion with exponential backoff retry.
    Returns the response text or raises a structured HTTPException on final failure.
    """
    client = get_client()
    prompt_len = len(system_prompt) + sum(len(m.get("content", "")) for m in messages)

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "system", "content": system_prompt}, *messages],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return (response.choices[0].message.content or "").strip()

        except AuthenticationError:
            # Key is missing or revoked — never surface the key value itself
            _log_failure("AuthenticationError", prompt_len, attempt)
            raise service_unavailable("AI service configuration error. Contact support.")

        except RateLimitError as e:
            # 429 — might succeed after backoff
            _log_failure("RateLimitError", prompt_len, attempt)
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                logger.info(
                    "AI rate limited, retrying",
                    extra={"delay_seconds": delay, "attempt": attempt + 1},
                )
                await asyncio.sleep(delay)
                continue
            raise HTTPException(
                status_code=429,
                detail="AI service rate limit reached. Please try again shortly.",
            )

        except APIConnectionError as e:
            # Network/transient errors — retry with backoff
            _log_failure("APIConnectionError", prompt_len, attempt)
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                logger.info(
                    "AI connection error, retrying",
                    extra={"delay_seconds": delay, "attempt": attempt + 1},
                )
                await asyncio.sleep(delay)
                continue
            raise service_unavailable("AI service temporarily unavailable. Please try again later.")

        except APIError as e:
            # Catch-all for remaining Groq API errors (5xx, malformed responses, etc.)
            _log_failure("APIError", prompt_len, attempt)
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                logger.info(
                    "AI API error, retrying",
                    extra={"delay_seconds": delay, "attempt": attempt + 1},
                )
                await asyncio.sleep(delay)
                continue
            raise service_unavailable("AI service temporarily unavailable. Please try again later.")

    # Exhausted retries — should not reach here but handle gracefully
    _log_failure("ExhaustedRetries", prompt_len)
    raise service_unavailable("AI service unavailable after multiple attempts. Please try again later.")


async def _create_completion_async(
    system_prompt: str,
    messages: list,
    max_tokens: int,
    temperature: float = 0.2,
) -> str:
    """
    Async version that can be awaited directly. Use this from async functions.
    """
    return await _create_completion_with_retry(system_prompt, messages, max_tokens, temperature)


def _strip_fences(text: str) -> str:
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


def _cv_context(cv_data: dict) -> str:
    """Pull career_level, industry, target_role out of cv_data safely."""
    return {
        "career_level": cv_data.get("career_level", ""),
        "industry":     cv_data.get("industry", ""),
        "target_role":  cv_data.get("target_role", ""),
    }


# ─── Chat ─────────────────────────────────────────────────────────────────────

async def chat_with_ai(
    message: str,
    cv_data: Optional[dict] = None,
    context: str = "",
) -> dict:
    """Chat with AI — returns {"response": str, "usage": {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int}}."""
    ctx = _cv_context(cv_data) if cv_data else {}
    user_content = message
    if cv_data:
        user_content = (
            f"Current CV data:\n{json.dumps(cv_data, indent=2)}\n\n"
            f"User message: {message}"
        )
    if context:
        user_content = f"Context: {context}\n\n{user_content}"

    system_prompt = cv_build_prompt(**ctx, response_format="text")
    text = await _create_completion_with_retry(
        system_prompt,
        [{"role": "user", "content": user_content}],
        max_tokens=CV_MAX_TOKENS,
    )

    # Get usage from a non-streaming call (already done in _create_completion_with_retry)
    # We don't have usage from the retry helper, so estimate or return 0
    return {
        "response": text,
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def chat_with_ai_stream(
    message: str,
    cv_data: Optional[dict] = None,
    context: str = "",
):
    """
    Sync generator that yields SSE-formatted chunks for streaming chat.
    Run via asyncio.to_thread to bridge into async contexts.
    Yields {"token": str} events and a final {"done": true, "usage": {...}} event.
    """
    ctx = _cv_context(cv_data) if cv_data else {}
    user_content = message
    if cv_data:
        user_content = (
            f"Current CV data:\n{json.dumps(cv_data, indent=2)}\n\n"
            f"User message: {message}"
        )
    if context:
        user_content = f"Context: {context}\n\n{user_content}"

    system_prompt = cv_build_prompt(**ctx, response_format="text")
    client = get_client()

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_tokens=CV_MAX_TOKENS,
        stream=True,
    )

    total_tokens = 0
    for chunk in response:
        delta = chunk.choices[0].delta if chunk.choices else None
        content = delta.content if delta else ""
        if content:
            total_tokens += 1
            yield f"data: {json.dumps({'token': content})}\n\n"

    usage_info = {"prompt_tokens": 0, "completion_tokens": total_tokens, "total_tokens": total_tokens}
    yield f"data: {json.dumps({'done': True, 'usage': usage_info})}\n\n"


# ─── Summary generation ───────────────────────────────────────────────────────

async def generate_summary(cv_data: dict) -> str:
    ctx = _cv_context(cv_data)
    target_hint = (
        f"\nTarget role: {ctx['target_role']}" if ctx.get("target_role") else ""
    )
    career_hint = (
        f"\nCareer level: {ctx['career_level']}" if ctx.get("career_level") else ""
    )
    prompt = f"""Optimise or write a professional summary for this CV.
{career_hint}{target_hint}

Rules:
- 3–5 lines depending on career level
- Answer: who / specialty / biggest proof point / what they are targeting
- Do NOT repeat content already visible in the experience section
- No banned words. No filler. No generic claims.
- Use exact language a recruiter for this role would respond to.

CV Data:
{json.dumps(cv_data, indent=2)}

Return ONLY the summary text."""

    return await _create_completion_with_retry(
        cv_build_prompt(**ctx, response_format="text"),
        [{"role": "user", "content": prompt}],
        max_tokens=500,
    )


# ─── Section improvement ──────────────────────────────────────────────────────

async def improve_cv_section(
    instruction: str,
    cv_data: dict,
    section: Optional[str] = None,
) -> dict:
    ctx = _cv_context(cv_data)
    section_hint = f" Focus on the '{section}' section." if section else ""
    target_hint = (
        f"\nOptimise toward target role: {ctx['target_role']}"
        if ctx.get("target_role") else ""
    )
    prompt = f"""Apply this instruction to the CV and return the updated FULL cv_data JSON.{section_hint}{target_hint}

Instruction: {instruction}

Optimisation priority:
- Strengthen weak verbs first
- Add missing metrics — if you cannot infer them, leave a [METRIC NEEDED] placeholder
- Remove or compress anything that does not serve the target role
- Ensure ATS keyword alignment if a target role is set

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY the updated JSON object matching the exact same schema. No markdown, no explanation."""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
    )
    return json.loads(_strip_fences(text))


# ─── Job description match ────────────────────────────────────────────────────

async def match_job_description(cv_data: dict, job_description: str) -> dict:
    ctx = _cv_context(cv_data)
    prompt = f"""Optimise this CV for the job description below.

Rules — in priority order:
1. Extract every keyword and requirement from the JD
2. For each keyword the person genuinely qualifies for: ensure it appears in the CV
   using the exact phrasing from the JD
3. Reorder experience bullets so the most JD-relevant ones lead each role
4. Rewrite the summary to directly address the JD's core requirements
5. Flag any JD requirement not present in the CV with [GAP: description]
6. Do NOT fabricate experience or skills
7. Do NOT add technologies the person has not used

Job Description:
{job_description}

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY the updated JSON object. No markdown, no explanation."""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
    )
    return json.loads(_strip_fences(text))


# ─── CV extraction from PDF text ─────────────────────────────────────────────

async def extract_cv_from_text(raw_text: str) -> dict:
    prompt = f"""Extract structured CV data from the following text and return it as JSON.
Match this exact schema:
{{
  "personal_info": {{"full_name":"","job_title":"","email":"","phone":"","location":"","linkedin":"","github":"","portfolio":"","website":""}},
  "summary": "",
  "skills": [],
  "experience": [{{"company":"","role":"","start_date":"","end_date":"","current":false,"description":"","achievements":[]}}],
  "education": [{{"institution":"","degree":"","field":"","start_date":"","end_date":"","grade":"","description":""}}],
  "certifications": [{{"name":"","issuer":"","date":"","expiry":"","credential_id":"","url":""}}],
  "projects": [{{"name":"","description":"","technologies":[],"url":"","start_date":"","end_date":""}}],
  "awards": [{{"title":"","issuer":"","date":"","description":""}}],
  "languages": [{{"language":"","proficiency":""}}],
  "volunteer": [{{"organization":"","role":"","start_date":"","end_date":"","description":""}}],
  "job_description": "",
  "career_level": "",
  "industry": "",
  "target_role": ""
}}

CV Text:
{raw_text}

Return ONLY valid JSON. No markdown, no explanation."""

    text = await _create_completion_async(
        cv_build_prompt(response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=4000,
    )
    return json.loads(_strip_fences(text))


# ─── Interview mode ───────────────────────────────────────────────────────────

async def interview_user(
    message: str,
    conversation_history: list,
    cv_data: Optional[dict] = None,
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
) -> str:
    messages = conversation_history + [{"role": "user", "content": message}]

    if cv_data:
        messages = [
            {
                "role": "system",
                "content": (
                    "Interview context:\n"
                    f"{json.dumps(cv_data, indent=2)}"
                ),
            },
            *messages,
        ]

    return await _create_completion_with_retry(
        interview_build_prompt(
            career_level=career_level,
            industry=industry,
            target_role=target_role,
            response_format="text",
        ),
        messages,
        max_tokens=INTERVIEW_MAX_TOKENS,
    )


# ─── CV review — aggressive ───────────────────────────────────────────────────

async def review_cv(
    cv_data: dict,
    job_description: str = "",
) -> str:
    ctx = _cv_context(cv_data)
    target_line   = f"\nTarget role: {ctx['target_role']}"   if ctx.get("target_role")   else ""
    career_line   = f"\nCareer level: {ctx['career_level']}" if ctx.get("career_level")  else ""
    industry_line = f"\nIndustry: {ctx['industry']}"         if ctx.get("industry")       else ""
    jd_block = (
        f"\n\nJob Description (treat as ground truth for ATS keywords):\n{job_description}"
        if job_description else ""
    )

    prompt = f"""Review this CV aggressively and provide structured, specific feedback.
{career_line}{target_line}{industry_line}{jd_block}

CV Data:
{json.dumps(cv_data, indent=2)}

Score it hard, identify every failure, and tell the person exactly what to fix.
Do not soften criticism. Prioritise optimisation, relevance, ATS alignment, and evidence."""

    return await _create_completion_with_retry(
        review_build_prompt(
            career_level=ctx.get("career_level", ""),
            industry=ctx.get("industry", ""),
            target_role=ctx.get("target_role", ""),
            job_description=job_description,
            response_format="text",
        ),
        [{"role": "user", "content": prompt}],
        max_tokens=REVIEW_MAX_TOKENS,
    )


# ─── Targeted optimisation pass ───────────────────────────────────────────────

async def optimize_bullets(cv_data: dict, experience_index: int) -> dict:
    ctx = _cv_context(cv_data)
    target_hint = (
        f"Target role: {ctx['target_role']}\n" if ctx.get("target_role") else ""
    )
    try:
        exp = cv_data["experience"][experience_index]
    except (IndexError, KeyError):
        return cv_data

    prompt = f"""{target_hint}Optimise ONLY the achievements and description for this experience entry.

Current entry:
{json.dumps(exp, indent=2)}

Rules:
1. Kill weak verbs — replace every instance of: managed, worked on, helped, assisted,
   was responsible for, involved in, participated in
2. Add [METRIC NEEDED] placeholder wherever a number would strengthen the bullet
   but is not available
3. Lead each bullet with the strongest possible verb for this seniority level
4. Maximum 5 bullets — cut the weakest if there are more
5. Each bullet max 20 words

Return the updated experience entry as JSON only. Same schema, no extra keys."""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    updated_exp = json.loads(_strip_fences(text))
    cv_data["experience"][experience_index] = updated_exp
    return cv_data


async def keyword_gap_analysis(cv_data: dict, job_description: str) -> dict:
    ctx = _cv_context(cv_data)
    prompt = f"""Perform a keyword gap analysis between this CV and job description.

Context:
Career level: {ctx.get('career_level', '')}
Industry: {ctx.get('industry', '')}
Target role: {ctx.get('target_role', '')}

Job Description:
{job_description}

CV Skills and Experience (summarised):
Skills: {", ".join(cv_data.get("skills", []))}
Roles: {", ".join([e.get("role", "") for e in cv_data.get("experience", [])])}

Return JSON in this exact format:
{{
  "present_keywords": ["keyword1", "keyword2"],
  "missing_keywords": [
    {{"keyword": "React", "priority": "high", "suggested_placement": "skills or experience bullet"}},
    {{"keyword": "Agile", "priority": "medium", "suggested_placement": "experience description"}}
  ],
  "ats_score_estimate": 0,
  "notes": "one sentence summary"
}}

Priority levels: high (will fail ATS without it), medium (differentiator), low (nice to have).
Return ONLY the JSON."""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    return json.loads(_strip_fences(text))


async def generate_cover_letter(
    cv_data: dict,
    job_title: str,
    company: str,
    job_description: str,
) -> str:
    ctx = _cv_context(cv_data)
    prompt = f"""Write a tailored cover letter for this job.

Rules:
- Under 350 words
- Professional, specific, and concise
- No clichés or buzzwords
- Use only truthful evidence from the CV
- Structure: opening, evidence, close
- Address the role and company directly

Job title: {job_title}
Company: {company}

Job description:
{job_description}

CV data:
{json.dumps(cv_data, indent=2)}

Return only the cover letter text."""

    return await _create_completion_with_retry(
        cover_letter_build_prompt(
            job_title=job_title,
            company=company,
            career_level=ctx.get("career_level", ""),
            industry=ctx.get("industry", ""),
            target_role=ctx.get("target_role", ""),
            response_format="text",
        ),
        [{"role": "user", "content": prompt}],
        max_tokens=COVER_LETTER_MAX_TOKENS,
    )


# ─── Section suggestions based on job description ──────────────────────────────

async def generate_section_suggestions(
    cv_data: dict,
    job_description: str,
) -> list[dict]:
    """Generate per-section suggestions to better align the CV to a job description."""
    ctx = _cv_context(cv_data)
    target_hint = f"\nTarget role: {ctx['target_role']}" if ctx.get("target_role") else ""

    prompt = f"""Analyse this CV against the provided job description and return specific, actionable suggestions per section.

{target_hint}

For each section of the CV, provide:
- section: the section identifier (summary, skills, experience, education, etc.)
- field: optional subfield within the section
- title: short title for the suggestion
- description: detailed explanation of what to change and why
- suggested_change: optional concrete text to use as replacement or addition
- priority: high | medium | low

Rules:
1. Only suggest changes that are truthful to the candidate's actual experience
2. Flag keywords from the JD that are missing from the CV
3. Suggest rewording bullets to use stronger verbs and match JD language
4. Recommend section reordering or compressing if relevant
5. Never fabricate experience or skills

Job Description:
{job_description}

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY a JSON array of suggestion objects. No markdown, no explanation.
Format: [{{"section": "skills", "field": "", "title": "Add Python", "description": "Python is required in 4 of 5 JD requirements", "suggested_change": "Python", "priority": "high"}}]"""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
        temperature=0.3,
    )
    try:
        suggestions = json.loads(_strip_fences(text))
        if isinstance(suggestions, list):
            return suggestions
        if isinstance(suggestions, dict) and "suggestions" in suggestions:
            return suggestions["suggestions"]
        return []
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse section suggestions JSON")
        return []


# ─── Tone/style adjustment per section ────────────────────────────────────────

async def adjust_section_tone(
    cv_data: dict,
    section: str,
    tone: str,
    custom_instruction: str = "",
) -> dict:
    """
    Adjust the tone/style of a specific CV section.
    Returns {"original": "...", "adjusted": "...", "section": "...", "tone": "..."}
    """
    ctx = _cv_context(cv_data)

    tone_definitions = {
        "professional": "Use polished, formal business language. Avoid casual expressions. Use precise terminology.",
        "concise": "Cut every unnecessary word. Maximum 15 words per bullet. Remove adverbs, filler, and redundancy. Keep only what proves the point.",
        "assertive": "Lead with strong action verbs. State accomplishments as facts. Remove hedging language like 'helped', 'assisted', 'contributed to'.",
        "confident": "Use definitive statements. Remove qualifiers like 'some', 'various', 'multiple'. State achievements without apology or understatement.",
        "moderate": "Balanced tone — factual and clear. Avoid extreme language or hyperbole. Focus on substantive description.",
        "enthusiastic": "Add energy with dynamic verbs. Emphasise impact and initiative. Slightly warmer language while staying professional.",
    }

    tone_instruction = tone_definitions.get(tone, tone_definitions["professional"])
    if custom_instruction:
        tone_instruction += f"\nAdditional custom instruction: {custom_instruction}"

    # Extract the relevant section data from CV
    section_content = ""
    if section == "summary":
        section_content = cv_data.get("summary", "")
    elif section == "skills":
        section_content = json.dumps(cv_data.get("skills", []))
    elif section == "experience":
        section_content = json.dumps(cv_data.get("experience", []), indent=2)
    elif section == "education":
        section_content = json.dumps(cv_data.get("education", []), indent=2)
    elif section == "certifications":
        section_content = json.dumps(cv_data.get("certifications", []), indent=2)
    elif section == "projects":
        section_content = json.dumps(cv_data.get("projects", []), indent=2)
    elif section == "languages":
        section_content = json.dumps(cv_data.get("languages", []))
    elif section == "volunteer":
        section_content = json.dumps(cv_data.get("volunteer", []), indent=2)
    elif section in ("awards", "certifications"):
        section_content = json.dumps(cv_data.get(section, []), indent=2)
    else:
        section_content = json.dumps(cv_data.get(section, ""))

    prompt = f"""Rewrite this CV section to match the specified tone/style.

Section: {section}

Tone instructions:
{tone_instruction}

Section content:
{section_content}

Full CV context (career level: {ctx.get('career_level', '')}, industry: {ctx.get('industry', '')}, target role: {ctx.get('target_role', '')}):

Return ONLY valid JSON with the adjusted content, preserving the exact same structure/format as the original.
Format: {{"adjusted": "the rewritten content (string or array matching original format)"}}

Rules:
- Do NOT add information not present in the original
- Do NOT change factual content — only adjust tone, word choice, and sentence structure
- Maintain the same section structure (if it's an array of objects, return an array of objects)
- No markdown, no explanation"""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
        temperature=0.5,  # Slightly higher temp for creative tone variation
    )

    try:
        result = json.loads(_strip_fences(text))
        adjusted = result.get("adjusted", "")
    except (json.JSONDecodeError, TypeError):
        # Fallback: try to extract anything that looks like adjusted content
        stripped = _strip_fences(text)
        if stripped.startswith("{") and "adjusted" in stripped:
            try:
                adjusted = json.loads(stripped).get("adjusted", section_content)
            except json.JSONDecodeError:
                adjusted = section_content
        else:
            adjusted = section_content

    # Serialize back to string if adjusted is a complex type
    if isinstance(adjusted, (list, dict)):
        adjusted = json.dumps(adjusted, indent=2) if isinstance(adjusted, list) else adjusted

    return {
        "original": section_content if isinstance(section_content, str) else json.dumps(section_content),
        "adjusted": adjusted if isinstance(adjusted, str) else json.dumps(adjusted),
        "section": section,
        "tone": tone,
    }


# ─── Interview preparation sessions ───────────────────────────────────────────

def _safe_json_object(text: str) -> dict:
    """Best-effort JSON object parsing for model responses."""
    stripped = _strip_fences(text)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end   = stripped.rfind("}")
        if start >= 0 and end > start:
            return json.loads(stripped[start : end + 1])
        raise


def _interview_context(cv_data: dict, job_description: str, mode: str, use_star: bool) -> str:
    cv_bits = {
        "target_role":  cv_data.get("target_role", ""),
        "summary":      cv_data.get("summary", ""),
        "skills":       cv_data.get("skills", []),
        "experience":   cv_data.get("experience", []),
        "projects":     cv_data.get("projects", []),
        "career_level": cv_data.get("career_level", ""),
        "industry":     cv_data.get("industry", ""),
    }
    star_line = "Prompt for STAR structure where useful." if use_star else "Do not force STAR structure."
    return f"""You are AXIOM Interview Prep, a practical recruiter-style mock interviewer.
Create role-specific interview practice from the submitted CV and job description.

Mode: {mode}
STAR setting: {star_line}

Question mix rules:
- behavioural: ask behavioural and situational questions grounded in the JD.
- technical: ask technical or role-specific questions based on required skills.
- full: mix behavioural, situational, technical/role-specific, and CV-probing questions.
- Always include CV-probing questions when the CV contains projects or quantified achievements.
- Ask one concise question at a time. Do not answer for the user.
- Never invent facts about the candidate.

CV context:
{json.dumps(cv_bits, indent=2)}

Job description:
{job_description or cv_data.get('job_description', '')}
"""


async def generate_interview_question(
    cv_data: dict,
    job_description: str,
    mode: str,
    asked_questions: list[str],
    use_star: bool = True,
) -> str:
    prompt = f"""Generate the next mock interview question.

Already asked:
{json.dumps(asked_questions, indent=2)}

Return JSON only in this exact shape:
{{"question":"one tailored question"}}"""
    text = await _create_completion_async(
        _interview_context(cv_data, job_description, mode, use_star),
        [{"role": "user", "content": prompt}],
        max_tokens=400,
    )
    data = _safe_json_object(text)
    return str(data.get("question", "")).strip() or "Tell me about a relevant achievement for this role."


async def evaluate_interview_answer(
    cv_data: dict,
    job_description: str,
    mode: str,
    question: str,
    answer: str,
    use_star: bool = True,
) -> dict:
    prompt = f"""Evaluate this interview answer as a recruiter would hear it.

Question: {question}
Answer: {answer}

Score strictly. Reward concrete evidence, role relevance, and clear structure. Penalise vague claims, missing examples, rambling, or answers that ignore the question.

Return JSON only in this exact shape:
{{
  "score": {{"clarity": 0, "specificity": 0, "evidence": 0, "length": 0}},
  "overall_score": 0,
  "what_was_strong": "one sentence",
  "what_was_vague": "one sentence",
  "recruiter_takeaway": "one sentence about what a recruiter would infer",
  "suggested_improvement": "one actionable rewrite instruction"
}}"""
    text = await _create_completion_async(
        _interview_context(cv_data, job_description, mode, use_star),
        [{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    data = _safe_json_object(text)
    score = data.get("score") or {}
    data["score"] = {
        "clarity":     int(score.get("clarity",     0) or 0),
        "specificity": int(score.get("specificity", 0) or 0),
        "evidence":    int(score.get("evidence",    0) or 0),
        "length":      int(score.get("length",      0) or 0),
    }
    data["overall_score"] = int(data.get("overall_score", 0) or 0)
    return data


# ─── Spaced-repetition review questions ──────────────────────────────────────

async def generate_review_questions(
    transcript: list[dict],
    count: int = 5,
) -> list[dict]:
    """Generate spaced-repetition review cards from a completed interview transcript.
    Returns a list of {"question": str, "topic": str, "difficulty": str}."""
    prompt = f"""Extract the most important practice questions from this interview transcript.
Turn each one into a concise review card suitable for quick recall practice.

Rules:
- Focus on questions the user struggled with (low scores) or that cover core topics
- Rephrase each as a standalone flashcard-style question
- Assign a topic label: behavioural, technical, situational, cv-probing, or general
- Assign a difficulty: easy, medium, or hard based on how well the user answered

Transcript:
{json.dumps(transcript, indent=2)}

Return a JSON array where each item has:
{{
  "question": "concise question text",
  "topic": "behavioural|technical|situational|cv-probing|general",
  "difficulty": "easy|medium|hard"
}}

Return ONLY the JSON array (max {count} items)."""

    text = await _create_completion_async(
        "You generate concise interview review cards from transcripts.",
        [{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.3,
    )
    try:
        cards = json.loads(_strip_fences(text))
        if isinstance(cards, list):
            return cards[:count]
        if isinstance(cards, dict) and "cards" in cards:
            return cards["cards"][:count]
        return []
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse review cards JSON")
        return []


# ─── Topic extraction from transcript ─────────────────────────────────────────

async def extract_interview_topics(
    sessions: list[dict],
) -> list[dict]:
    """Extract topic breakdown across multiple interview sessions.
    Returns a list of {"name": str, "count": int, "avg_score": float, "trend": str}."""
    if not sessions:
        return []

    prompt = f"""Analyse these interview sessions and produce a topic breakdown.

For each distinct question topic, determine:
- name: short topic label (e.g. "teamwork", "system design", "conflict resolution")
- count: how many questions on this topic across all sessions
- avg_score: the average overall score for answers on this topic (0-100)
- trend: "improving" if scores increased over time, "declining" if they decreased, "stable" if flat

Sessions data:
{json.dumps(sessions, indent=2)}

Return ONLY a JSON array of topic objects.
Format: [{{"name": "system design", "count": 3, "avg_score": 72.5, "trend": "improving"}}]"""

    text = await _create_completion_async(
        "You extract interview topic heatmap data from session transcripts.",
        [{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.2,
    )
    try:
        topics = json.loads(_strip_fences(text))
        if isinstance(topics, list):
            return topics
        if isinstance(topics, dict) and "topics" in topics:
            return topics["topics"]
        return []
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse interview topics JSON")
        return []


# ─── Difficulty scaling based on past performance ─────────────────────────────

async def adjust_interview_difficulty(
    recent_scores: list[int],
    mode: str = "behavioural",
) -> dict:
    """Determine interview difficulty level based on recent performance scores.
    Returns {"level": str, "max_questions": int, "description": str}."""
    if not recent_scores:
        return {
            "level": "intermediate",
            "max_questions": 5,
            "description": "Standard difficulty. No prior session data.",
        }

    avg_score = sum(recent_scores) / len(recent_scores)

    if avg_score >= 75:
        return {
            "level": "advanced",
            "max_questions": 7,
            "description": f"Advanced level ({avg_score:.0f}/100 average). Expect deeper, more nuanced questions with less prompting.",
        }
    elif avg_score >= 50:
        return {
            "level": "intermediate",
            "max_questions": 6,
            "description": f"Intermediate level ({avg_score:.0f}/100 average). Questions will challenge you while reinforcing fundamentals.",
        }
    else:
        return {
            "level": "beginner",
            "max_questions": 5,
            "description": f"Beginner level ({avg_score:.0f}/100 average). More structured questions with STAR guidance.",
        }


async def analyze_skill_gaps(
    cv_data: dict,
    target_role: str,
    market_data: Optional[dict] = None,
) -> dict:
    """Analyze skill gaps for a target role and generate learning roadmap.
    
    Args:
        cv_data: The user's CV data
        target_role: The target role to analyze against
        market_data: Optional real job market data from Adzuna (skill demand scores)
    """
    ctx = _cv_context(cv_data)
    user_skills = [s.lower().strip() for s in cv_data.get("skills", [])]
    user_roles = [e.get("role", "").lower().strip() for e in cv_data.get("experience", [])]

    market_block = ""
    if market_data and market_data.get("skill_demand"):
        demand_sorted = sorted(
            market_data["skill_demand"].items(),
            key=lambda x: -x[1]
        )[:20]
        market_block = f"""Real market data from active job postings (skill demand scores 0-100):
{chr(10).join(f'  {skill}: {score}/100' for skill, score in demand_sorted)}
Total job postings analyzed: {market_data.get('total_jobs_analyzed', 0)}
Sample job titles: {", ".join(market_data.get('sample_titles', []))[:200]}
"""

    prompt = f"""Analyze skill gaps for someone targeting this role and generate a learning roadmap.

Target role: {target_role}

Current profile:
Skills: {", ".join(user_skills)}
Experience: {", ".join([r for r in user_roles if r])}
Career level: {ctx.get("career_level", "mid")}
Industry: {ctx.get("industry", "general")}

{market_block}

Return JSON in this exact format:
{{
  "target_role": "the target role",
  "readiness_score": 0-100 based on current skills vs role requirements,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": [
    {{"skill": "React", "priority": "high", "reason": "why it's critical (consider market demand)", "current_evidence": "what they have that relates"}},
    {{"skill": "Team Leadership", "priority": "medium", "reason": "needed for senior roles", "current_evidence": ""}}
  ],
  "roadmap": [
    {{
      "phase": "Month 1-2",
      "focus": "Core skills foundation",
      "skills": ["skill1", "skill2"],
      "actions": ["action1", "action2"],
      "project": "portfolio project idea",
      "outcome": "demonstrable evidence"
    }}
  ],
  "notes": "one sentence assessment"
}}

Priority: high (critical for role), medium (accelerator), low (nice-to-have).
Readiness score: weighted by high > medium > low priority matches.

Use the real market data (if provided) to inform priority levels:
- Skills with high market demand should be prioritized higher
- Missing skills that appear in many job postings should be flagged "high" priority
- If no market data is available, use your best judgment based on the target role

Return ONLY the JSON."""

    text = await _create_completion_async(
        cv_build_prompt(**ctx, response_format="json"),
        [{"role": "user", "content": prompt}],
        max_tokens=2500,
    )
    result = _safe_json_object(text)

    # Merge market data into the result (for frontend display)
    if market_data:
        result["skill_demand"] = market_data.get("skill_demand", {})
        result["total_jobs_analyzed"] = market_data.get("total_jobs_analyzed", 0)
        result["sample_titles"] = market_data.get("sample_titles", [])
    else:
        result["skill_demand"] = {}
        result["total_jobs_analyzed"] = 0
        result["sample_titles"] = []

    return result


async def summarize_interview_session(
    cv_data: dict,
    job_description: str,
    mode: str,
    transcript: list[dict],
    use_star: bool = True,
) -> dict:
    prompt = f"""Summarise this completed mock interview session.

Transcript:
{json.dumps(transcript, indent=2)}

Return JSON only in this exact shape:
{{
  "overall_score": 0,
  "weakest_area": "short label",
  "top_3_improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "summary": "short paragraph"
}}"""
    text = await _create_completion_async(
        _interview_context(cv_data, job_description, mode, use_star),
        [{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    data = _safe_json_object(text)
    data["overall_score"]      = int(data.get("overall_score", 0) or 0)
    data["top_3_improvements"] = list(data.get("top_3_improvements") or [])[:3]
    return data