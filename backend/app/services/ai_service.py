# app/services/ai_service.py
import json
from typing import Optional

from groq import Groq

from app.config import settings
from app.services.ai_prompts import json_system_prompt, text_system_prompt, interview_system_prompt

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
    """Remove markdown code fences if the model wraps JSON in them."""
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


async def chat_with_ai(message: str, cv_data: Optional[dict] = None, context: str = "") -> str:
    user_content = message
    if cv_data:
        user_content = f"Current CV data:\n{json.dumps(cv_data, indent=2)}\n\nUser message: {message}"
    if context:
        user_content = f"Context: {context}\n\n{user_content}"

    return _create_completion(
        text_system_prompt(),
        [{"role": "user", "content": user_content}],
        max_tokens=2000,
    )


async def generate_summary(cv_data: dict) -> str:
    prompt = f"""Based on this person's career data, write a professional summary of 3-4 sentences.
Be specific and concrete. Use their actual job titles, years of experience, and real skills.
Do not use any filler words.

CV Data:
{json.dumps(cv_data, indent=2)}

Return ONLY the summary text, nothing else."""

    return _create_completion(
        text_system_prompt(),
        [{"role": "user", "content": prompt}],
        max_tokens=500,
    )


async def improve_cv_section(instruction: str, cv_data: dict, section: Optional[str] = None) -> dict:
    section_hint = f" Focus on the '{section}' section." if section else ""
    prompt = f"""Apply this instruction to the CV and return the updated FULL cv_data JSON.{section_hint}

Instruction: {instruction}

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY the updated JSON object matching the exact same schema. No markdown, no explanation."""

    text = _create_completion(
        json_system_prompt(),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
    )
    return json.loads(_strip_fences(text))


async def match_job_description(cv_data: dict, job_description: str) -> dict:
    prompt = f"""Align this CV's language and emphasis to match the job description below.
Rules:
- Do NOT fabricate experience or skills
- Do NOT add technologies the person hasn't used
- Reorder and reword existing content to better match the role's priorities
- Use keywords from the job description where they accurately apply
- Return the full updated cv_data JSON

Job Description:
{job_description}

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY the updated JSON object. No markdown, no explanation."""

    text = _create_completion(
        json_system_prompt(),
        [{"role": "user", "content": prompt}],
        max_tokens=3000,
    )
    return json.loads(_strip_fences(text))


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
  "job_description": ""
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


async def interview_user(message: str, conversation_history: list) -> str:
    """AI interview mode — gathers CV details through focused, single-question conversation."""
    messages = conversation_history + [{"role": "user", "content": message}]
    return _create_completion(
        interview_system_prompt(),
        messages,
        max_tokens=800,
    )