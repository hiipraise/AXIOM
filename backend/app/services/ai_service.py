import anthropic
import json
from typing import Optional
from app.config import settings
from app.models.schemas import CVData

BANNED_WORDS = [
    "versatile", "passionate", "dynamic", "modern", "scalable", "specialize",
    "streamline", "leveraged", "results-driven", "team player", "detail-oriented",
    "innovative", "synergy", "utilize", "leverage", "cutting-edge", "thought leader",
    "game-changer", "disruptive", "holistic", "robust", "seamless", "best-in-class",
    "translating complex", "intuitive solutions", "fast-paced environment",
    "go-getter", "self-starter", "proactive", "solution-oriented",
]

SYSTEM_PROMPT = """You are AXIOM, an expert CV writer. Your job is to produce truthful, 
evidence-based, ATS-safe resume content. 

STRICT RULES:
1. NEVER use these words or phrases: """ + ", ".join(f'"{w}"' for w in BANNED_WORDS) + """
2. Every claim must be specific and concrete — use numbers, outcomes, and named tools/technologies
3. Do NOT fabricate any information not provided by the user
4. Write in plain, direct English — no corporate fluff, no buzzwords
5. Prefer active voice and specific verbs (built, reduced, led, shipped, fixed, cut, grew)
6. For skills: plain text list only, no ratings or bars
7. Keep descriptions concise and factual
8. If the user's input is vague, ask clarifying questions rather than inventing details

When generating JSON, return ONLY valid JSON with no markdown fences or explanations."""


def get_client():
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def chat_with_ai(message: str, cv_data: Optional[dict] = None, context: str = "") -> str:
    client = get_client()
    
    user_content = message
    if cv_data:
        user_content = f"Current CV data:\n{json.dumps(cv_data, indent=2)}\n\nUser message: {message}"
    if context:
        user_content = f"Context: {context}\n\n{user_content}"

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return response.content[0].text


async def generate_summary(cv_data: dict) -> str:
    client = get_client()
    prompt = f"""Based on this person's career data, write a professional summary of 3-4 sentences.
Be specific and concrete. Use their actual job titles, years of experience, and real skills.
Do not use any filler words.

CV Data:
{json.dumps(cv_data, indent=2)}

Return ONLY the summary text, nothing else."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


async def improve_cv_section(instruction: str, cv_data: dict, section: Optional[str] = None) -> dict:
    client = get_client()
    section_hint = f" Focus on the '{section}' section." if section else ""
    prompt = f"""Apply this instruction to the CV and return the updated FULL cv_data JSON.{section_hint}

Instruction: {instruction}

Current CV:
{json.dumps(cv_data, indent=2)}

Return ONLY the updated JSON object matching the exact same schema. No markdown, no explanation."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(text)


async def match_job_description(cv_data: dict, job_description: str) -> dict:
    client = get_client()
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

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(text)


async def extract_cv_from_text(raw_text: str) -> dict:
    client = get_client()
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

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
    return json.loads(text)


async def interview_user(message: str, conversation_history: list) -> str:
    """AI interview mode to gather CV details through natural conversation."""
    client = get_client()
    
    system = SYSTEM_PROMPT + """

You are in INTERVIEW MODE. Your goal is to gather detailed, specific information for a CV.
Ask one clear, focused question at a time. When the user's answer is vague, probe for:
- Specific numbers (how many? what percentage? what timeframe?)
- Named technologies or tools
- Concrete outcomes ("what changed because of your work?")
- Team size and scope

After gathering enough information, offer to generate a CV section.
Never ask more than one question per message."""

    messages = conversation_history + [{"role": "user", "content": message}]
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=system,
        messages=messages,
    )
    return response.content[0].text
