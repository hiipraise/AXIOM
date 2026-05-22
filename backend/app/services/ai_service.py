# app/services/ai_service.py
import json
from typing import Optional

from groq import Groq

from app.config import settings
from app.services.ai_prompts import (
    json_system_prompt,
    text_system_prompt,
    interview_system_prompt,
    review_system_prompt,
)

MODEL_NAME = "llama-3.1-8b-instant"


def get_client():
    return Groq(api_key=settings.groq_api_key)


def _create_completion(system_prompt: str, messages: list, max_tokens: int) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "system", "content": system_prompt}, *messages],
        max_tokens=max_tokens,
        temperature=0.2,
    )
    return (response.choices[0].message.content or "").strip()


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
) -> str:
    ctx = _cv_context(cv_data) if cv_data else {}
    user_content = message
    if cv_data:
        user_content = (
            f"Current CV data:\n{json.dumps(cv_data, indent=2)}\n\n"
            f"User message: {message}"
        )
    if context:
        user_content = f"Context: {context}\n\n{user_content}"

    return _create_completion(
        text_system_prompt(**ctx),
        [{"role": "user", "content": user_content}],
        max_tokens=2000,
    )


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

    return _create_completion(
        text_system_prompt(**ctx),
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

    text = _create_completion(
        json_system_prompt(**ctx),
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

    text = _create_completion(
        json_system_prompt(**ctx),
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

    text = _create_completion(
        json_system_prompt(),
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

    return _create_completion(
        interview_system_prompt(career_level, industry, target_role),
        messages,
        max_tokens=800,
    )


# ─── CV review — aggressive ───────────────────────────────────────────────────

async def review_cv(
    cv_data: dict,
    job_description: str = "",
) -> str:
    ctx = _cv_context(cv_data)
    target_line = f"\nTarget role: {ctx['target_role']}" if ctx.get("target_role") else ""
    career_line = f"\nCareer level: {ctx['career_level']}" if ctx.get("career_level") else ""
    industry_line = f"\nIndustry: {ctx['industry']}" if ctx.get("industry") else ""
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

    return _create_completion(
        review_system_prompt(),
        [{"role": "user", "content": prompt}],
        max_tokens=2000,
    )


# ─── Targeted optimisation pass ───────────────────────────────────────────────

async def optimize_bullets(cv_data: dict, experience_index: int) -> dict:
    """
    Focused optimisation of a single experience entry's bullets.
    Stronger verbs, metrics placeholders, ATS alignment.
    """
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

    text = _create_completion(
        json_system_prompt(**ctx),
        [{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    updated_exp = json.loads(_strip_fences(text))
    cv_data["experience"][experience_index] = updated_exp
    return cv_data


async def keyword_gap_analysis(cv_data: dict, job_description: str) -> dict:
    """
    Returns a structured gap report: present keywords, missing keywords,
    and suggested placements — without modifying the CV.
    """
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

    text = _create_completion(
        json_system_prompt(**ctx),
        [{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    return json.loads(_strip_fences(text))