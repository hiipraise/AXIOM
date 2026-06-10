# app/services/ai_service.py
import json
from functools import lru_cache
from typing import Optional

from groq import Groq, APIError, AuthenticationError, APIConnectionError, RateLimitError
from fastapi import HTTPException

from app.config import settings
from app.services.ai_prompts import (
    json_system_prompt,
    text_system_prompt,
    interview_system_prompt,
    review_system_prompt,
)

MODEL_NAME = "llama-3.1-8b-instant"


@lru_cache(maxsize=1)
def get_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)


def _create_completion(system_prompt: str, messages: list, max_tokens: int) -> str:
    client = get_client()
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            max_tokens=max_tokens,
            temperature=0.2,
        )
        return (response.choices[0].message.content or "").strip()
    except AuthenticationError:
        # Key is missing or revoked — never surface the key value itself
        raise HTTPException(503, "AI service configuration error. Contact support.")
    except RateLimitError:
        raise HTTPException(429, "AI service rate limit reached. Try again shortly.")
    except APIConnectionError:
        raise HTTPException(503, "AI service unreachable. Try again shortly.")
    except APIError:
        # Catch-all for remaining Groq API errors (5xx, malformed responses, etc.)
        raise HTTPException(503, "AI service temporarily unavailable.")


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

    return _create_completion(
        review_system_prompt(),
        [{"role": "user", "content": prompt}],
        max_tokens=2000,
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

    text = _create_completion(
        json_system_prompt(**ctx),
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

    text = _create_completion(
        json_system_prompt(**ctx),
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

    return _create_completion(
        text_system_prompt(**ctx),
        [{"role": "user", "content": prompt}],
        max_tokens=900,
    )


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
    text = _create_completion(
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
    text = _create_completion(
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
    text = _create_completion(
        _interview_context(cv_data, job_description, mode, use_star),
        [{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    data = _safe_json_object(text)
    data["overall_score"]      = int(data.get("overall_score", 0) or 0)
    data["top_3_improvements"] = list(data.get("top_3_improvements") or [])[:3]
    return data