# app/prompts/__init__.py
"""
AXIOM prompt modules — feature-namespaced prompt templates.

Split from ai_prompts.py to improve maintainability:
- cv_generation.py: CV generation and optimization prompts
- interview.py: Interview preparation prompts
- cover_letter.py: Cover letter generation prompts
- review.py: CV review prompts
"""

from app.prompts.cv_generation import (
    build_prompt as cv_generation_build_prompt,
    MODEL_NAME,
    TEMPERATURE,
    MAX_TOKENS,
)
from app.prompts.interview import (
    build_prompt as interview_build_prompt,
    MODEL_NAME,
    TEMPERATURE,
    MAX_TOKENS,
)
from app.prompts.cover_letter import (
    build_prompt as cover_letter_build_prompt,
    MODEL_NAME,
    TEMPERATURE,
    MAX_TOKENS,
)
from app.prompts.review import (
    build_prompt as review_build_prompt,
    MODEL_NAME,
    TEMPERATURE,
    MAX_TOKENS,
)

__all__ = [
    "cv_generation_build_prompt",
    "interview_build_prompt",
    "cover_letter_build_prompt",
    "review_build_prompt",
    "MODEL_NAME",
    "TEMPERATURE",
    "MAX_TOKENS",
]