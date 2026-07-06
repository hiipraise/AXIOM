# app/prompts/interview.py
"""
Interview preparation prompts.

Exports build_prompt(**kwargs) -> str with model configuration constants.
"""

from app.config import settings
from app.prompts.cv_generation import JSON_RESPONSE_RULE, TEXT_RESPONSE_RULE

# Model configuration — centralized per module
MODEL_NAME = settings.groq_model
TEMPERATURE = 0.3
MAX_TOKENS = 800


# ─── Base system prompt ─────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """
You are AXIOM Interview Prep, a practical recruiter-style mock interviewer.

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


# ─── Interview core prompt ──────────────────────────────────────────────

INTERVIEW_CORE_PROMPT = """
You are AXIOM Interview Prep, a practical recruiter-style mock interviewer.
Create role-specific interview practice from the submitted CV and job description.

Question mix rules:
- behavioural: ask behavioural and situational questions grounded in the JD.
- technical: ask technical or role-specific questions based on required skills.
- full: mix behavioural, situational, technical/role-specific, and CV-probing questions.
- Always include CV-probing questions when the CV contains projects or quantified achievements.
- Ask one concise question at a time. Do not answer for the user.
- Never invent facts about the candidate.
"""


# ─── Public build_prompt function ───────────────────────────────────

def build_prompt(
    mode: str = "full",
    career_level: str = "",
    industry: str = "",
    target_role: str = "",
    use_star: bool = True,
    response_format: str = "text",
) -> str:
    """
    Build an interview preparation system prompt.

    Args:
        mode: One of behavioural, technical, full
        career_level: One of student, graduate, mid, senior, career_switch, executive
        industry: One of tech, business, marketing, health, creative, engineering, education, legal, general
        target_role: The role being targeted
        use_star: Whether to prompt for STAR structure
        response_format: "text" or "json"

    Returns:
        Complete system prompt string
    """
    star_line = "Prompt for STAR structure where useful." if use_star else "Do not force STAR structure."

    prompt = f"""{INTERVIEW_CORE_PROMPT}

Mode: {mode}
STAR setting: {star_line}

CV context (provided separately):
- target_role: {target_role}
- career_level: {career_level}
- industry: {industry}
"""

    if response_format == "json":
        prompt += "\n" + JSON_RESPONSE_RULE
    else:
        prompt += "\n" + TEXT_RESPONSE_RULE

    return prompt


def build_question_gen_prompt(
    mode: str = "full",
    use_star: bool = True,
) -> str:
    """Build prompt for generating interview questions."""
    return build_prompt(mode=mode, use_star=use_star, response_format="json")


def build_answer_eval_prompt(
    mode: str = "full",
    use_star: bool = True,
) -> str:
    """Build prompt for evaluating interview answers."""
    return build_prompt(mode=mode, use_star=use_star, response_format="json")


def build_session_summary_prompt(
    mode: str = "full",
    use_star: bool = True,
) -> str:
    """Build prompt for summarizing interview sessions."""
    return build_prompt(mode=mode, use_star=use_star, response_format="json")