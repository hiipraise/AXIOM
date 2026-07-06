# backend/app/services/skill_market_service.py
"""
Skill market data service — fetches real job listings from Adzuna for a target role
and extracts skill demand scores using TF-IDF keyword extraction.
"""

import json
import hashlib
import logging
import re
import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Course / learning resource catalogue ────────────────────────────────────

# Curated list of free & paid courses mapped to common skill categories.
# Sources: Coursera, edX, Udemy, freeCodeCamp, YouTube, MDN, official docs.
SKILL_COURSES: dict[str, list[dict[str, str]]] = {
    "python": [
        {"title": "Python for Everybody (Coursera)", "url": "https://www.coursera.org/specializations/python", "platform": "Coursera", "cost": "free"},
        {"title": "Automate the Boring Stuff with Python", "url": "https://automatetheboringstuff.com/", "platform": "freeCodeCamp", "cost": "free"},
        {"title": "Complete Python Bootcamp (Udemy)", "url": "https://www.udemy.com/course/complete-python-bootcamp/", "platform": "Udemy", "cost": "paid"},
    ],
    "javascript": [
        {"title": "JavaScript — MDN Web Docs", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript", "platform": "MDN", "cost": "free"},
        {"title": "freeCodeCamp JavaScript Algorithms", "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", "platform": "freeCodeCamp", "cost": "free"},
        {"title": "The Complete JavaScript Course (Udemy)", "url": "https://www.udemy.com/course/the-complete-javascript-course/", "platform": "Udemy", "cost": "paid"},
    ],
    "react": [
        {"title": "React Docs (beta)", "url": "https://react.dev/learn", "platform": "React", "cost": "free"},
        {"title": "Epic React (Kent C. Dodds)", "url": "https://epicreact.dev/", "platform": "Epic React", "cost": "paid"},
        {"title": "React — Full Course (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/tag/react/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "node.js": [
        {"title": "Node.js Official Docs", "url": "https://nodejs.org/en/docs/", "platform": "Node.js", "cost": "free"},
        {"title": "The Complete Node.js Developer Course (Udemy)", "url": "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/", "platform": "Udemy", "cost": "paid"},
    ],
    "typescript": [
        {"title": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html", "platform": "TypeScript", "cost": "free"},
        {"title": "Understanding TypeScript (Udemy)", "url": "https://www.udemy.com/course/understanding-typescript/", "platform": "Udemy", "cost": "paid"},
    ],
    "sql": [
        {"title": "SQL for Data Analysis (Mode)", "url": "https://mode.com/sql-tutorial/", "platform": "Mode", "cost": "free"},
        {"title": "The Complete SQL Bootcamp (Udemy)", "url": "https://www.udemy.com/course/the-complete-sql-bootcamp/", "platform": "Udemy", "cost": "paid"},
    ],
    "aws": [
        {"title": "AWS Cloud Practitioner Essentials", "url": "https://aws.amazon.com/training/course-descriptions/cloud-practitioner-essentials/", "platform": "AWS", "cost": "free"},
        {"title": "AWS Solutions Architect (A Cloud Guru)", "url": "https://learn.acloud.guru/course/aws-certified-solutions-architect-associate/", "platform": "A Cloud Guru", "cost": "paid"},
    ],
    "docker": [
        {"title": "Docker Getting Started", "url": "https://docs.docker.com/get-started/", "platform": "Docker", "cost": "free"},
        {"title": "Docker Mastery (Udemy)", "url": "https://www.udemy.com/course/docker-mastery/", "platform": "Udemy", "cost": "paid"},
    ],
    "kubernetes": [
        {"title": "Kubernetes Basics — Official Docs", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/", "platform": "Kubernetes", "cost": "free"},
        {"title": "Certified Kubernetes Administrator (Udemy)", "url": "https://www.udemy.com/course/certified-kubernetes-administrator/", "platform": "Udemy", "cost": "paid"},
    ],
    "git": [
        {"title": "Pro Git Book", "url": "https://git-scm.com/book/en/v2", "platform": "Git", "cost": "free"},
        {"title": "Git & GitHub Crash Course (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/git-and-github-crash-course/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "machine learning": [
        {"title": "Machine Learning Specialization (Coursera)", "url": "https://www.coursera.org/specializations/machine-learning-introduction", "platform": "Coursera", "cost": "free"},
        {"title": "fast.ai Practical Deep Learning", "url": "https://course.fast.ai/", "platform": "fast.ai", "cost": "free"},
    ],
    "data science": [
        {"title": "Data Science Math Skills (Coursera)", "url": "https://www.coursera.org/learn/datasciencemathskills", "platform": "Coursera", "cost": "free"},
        {"title": "IBM Data Science Professional Certificate", "url": "https://www.coursera.org/professional-certificates/ibm-data-science", "platform": "Coursera", "cost": "paid"},
    ],
    "communication": [
        {"title": "Improving Communication Skills (Coursera)", "url": "https://www.coursera.org/learn/wharton-communication-skills", "platform": "Coursera", "cost": "free"},
    ],
    "leadership": [
        {"title": "Leadership Principles (Harvard Online)", "url": "https://online.hbs.edu/courses/leadership-principles/", "platform": "Harvard", "cost": "paid"},
        {"title": "Inspiring Leadership (Coursera)", "url": "https://www.coursera.org/learn/inspirational-leadership", "platform": "Coursera", "cost": "free"},
    ],
    "project management": [
        {"title": "Google Project Management Certificate", "url": "https://www.coursera.org/professional-certificates/google-project-management", "platform": "Coursera", "cost": "paid"},
        {"title": "PMP Certification Prep (Udemy)", "url": "https://www.udemy.com/course/pmp-certification-exam-prep/", "platform": "Udemy", "cost": "paid"},
    ],
    "agile": [
        {"title": "Agile Fundamentals (Coursera)", "url": "https://www.coursera.org/learn/agile-fundamentals", "platform": "Coursera", "cost": "free"},
        {"title": "CSM Certification Prep (Udemy)", "url": "https://www.udemy.com/course/certified-scrum-master/", "platform": "Udemy", "cost": "paid"},
    ],
    "product management": [
        {"title": "Product Management Specialization (Coursera)", "url": "https://www.coursera.org/specializations/product-management", "platform": "Coursera", "cost": "free"},
        {"title": "Build a Product Management Framework (Udemy)", "url": "https://www.udemy.com/course/build-a-product-management-framework/", "platform": "Udemy", "cost": "paid"},
    ],
    "excel": [
        {"title": "Excel Skills for Business (Coursera)", "url": "https://www.coursera.org/specializations/excel", "platform": "Coursera", "cost": "free"},
    ],
    "tableau": [
        {"title": "Tableau for Beginners (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/tableau-for-beginners/", "platform": "freeCodeCamp", "cost": "free"},
        {"title": "Tableau A-Z (Udemy)", "url": "https://www.udemy.com/course/tableau10/", "platform": "Udemy", "cost": "paid"},
    ],
    "power bi": [
        {"title": "Microsoft Power BI (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/training/powerplatform/power-bi", "platform": "Microsoft", "cost": "free"},
    ],
    "figma": [
        {"title": "Figma 101 (Figma)", "url": "https://www.figma.com/resources/learn-design/", "platform": "Figma", "cost": "free"},
        {"title": "Learn Figma (Udemy)", "url": "https://www.udemy.com/course/learn-figma/", "platform": "Udemy", "cost": "paid"},
    ],
    "ui/ux": [
        {"title": "Google UX Design Certificate", "url": "https://www.coursera.org/professional-certificates/google-ux-design", "platform": "Coursera", "cost": "paid"},
        {"title": "Figma UI/UX Design (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/tag/ui-ux/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "java": [
        {"title": "Java Programming (Coursera)", "url": "https://www.coursera.org/specializations/java-programming", "platform": "Coursera", "cost": "free"},
        {"title": "Java Masterclass (Udemy)", "url": "https://www.udemy.com/course/java-the-complete-java-developer-course/", "platform": "Udemy", "cost": "paid"},
    ],
    "html": [
        {"title": "HTML — MDN Web Docs", "url": "https://developer.mozilla.org/en-US/docs/Web/HTML", "platform": "MDN", "cost": "free"},
        {"title": "freeCodeCamp Responsive Web Design", "url": "https://www.freecodecamp.org/learn/responsive-web-design/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "css": [
        {"title": "CSS — MDN Web Docs", "url": "https://developer.mozilla.org/en-US/docs/Web/CSS", "platform": "MDN", "cost": "free"},
        {"title": "CSS Complete Course (Udemy)", "url": "https://www.udemy.com/course/css-complete-course/", "platform": "Udemy", "cost": "paid"},
    ],
    "postgresql": [
        {"title": "PostgreSQL Tutorial (PostgresSQLTutorial)", "url": "https://www.postgresqltutorial.com/", "platform": "PostgreSQL", "cost": "free"},
        {"title": "SQL & PostgreSQL (Udemy)", "url": "https://www.udemy.com/course/sql-and-postgresql/", "platform": "Udemy", "cost": "paid"},
    ],
    "mongodb": [
        {"title": "MongoDB University", "url": "https://university.mongodb.com/", "platform": "MongoDB", "cost": "free"},
        {"title": "MongoDB — The Complete Guide (Udemy)", "url": "https://www.udemy.com/course/mongodb-the-complete-developers-guide/", "platform": "Udemy", "cost": "paid"},
    ],
    "redis": [
        {"title": "Redis University", "url": "https://university.redis.com/", "platform": "Redis", "cost": "free"},
    ],
    "rest api": [
        {"title": "REST API Tutorial", "url": "https://restfulapi.net/", "platform": "REST API", "cost": "free"},
        {"title": "REST API Design (Udemy)", "url": "https://www.udemy.com/course/rest-api-design/", "platform": "Udemy", "cost": "paid"},
    ],
    "graphql": [
        {"title": "GraphQL Official Tutorial", "url": "https://graphql.org/learn/", "platform": "GraphQL", "cost": "free"},
        {"title": "GraphQL with React (Udemy)", "url": "https://www.udemy.com/course/graphql-with-react-course/", "platform": "Udemy", "cost": "paid"},
    ],
    "go": [
        {"title": "Go by Example", "url": "https://gobyexample.com/", "platform": "Go", "cost": "free"},
        {"title": "Go — The Complete Guide (Udemy)", "url": "https://www.udemy.com/course/go-the-complete-guide/", "platform": "Udemy", "cost": "paid"},
    ],
    "rust": [
        {"title": "Rust Book", "url": "https://doc.rust-lang.org/book/", "platform": "Rust", "cost": "free"},
        {"title": "Rust Programming (Udemy)", "url": "https://www.udemy.com/course/rust-programming/", "platform": "Udemy", "cost": "paid"},
    ],
    "c++": [
        {"title": "C++ Tutorial (learncpp)", "url": "https://www.learncpp.com/", "platform": "LearnCpp", "cost": "free"},
        {"title": "C++ Programming (Udemy)", "url": "https://www.udemy.com/course/beginner-cpp-programming/", "platform": "Udemy", "cost": "paid"},
    ],
    "c#": [
        {"title": "C# Fundamentals (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/dotnet/csharp/", "platform": "Microsoft", "cost": "free"},
    ],
    "swift": [
        {"title": "Swift Programming (Apple)", "url": "https://docs.swift.org/swift-book/", "platform": "Apple", "cost": "free"},
    ],
    "kotlin": [
        {"title": "Kotlin Playground", "url": "https://play.kotlinlang.org/", "platform": "JetBrains", "cost": "free"},
    ],
    "flutter": [
        {"title": "Flutter Docs", "url": "https://docs.flutter.dev/", "platform": "Flutter", "cost": "free"},
    ],
    "tensorflow": [
        {"title": "TensorFlow Core Tutorials", "url": "https://www.tensorflow.org/tutorials", "platform": "Google", "cost": "free"},
    ],
    "pytorch": [
        {"title": "PyTorch Tutorials", "url": "https://pytorch.org/tutorials/", "platform": "PyTorch", "cost": "free"},
    ],
    "next.js": [
        {"title": "Next.js Learn", "url": "https://nextjs.org/learn", "platform": "Vercel", "cost": "free"},
    ],
    "tailwind css": [
        {"title": "Tailwind CSS Docs", "url": "https://tailwindcss.com/docs", "platform": "Tailwind", "cost": "free"},
    ],
    "django": [
        {"title": "Django Girls Tutorial", "url": "https://tutorial.djangogirls.org/", "platform": "Django", "cost": "free"},
        {"title": "Django for Everybody (Coursera)", "url": "https://www.coursera.org/specializations/django", "platform": "Coursera", "cost": "free"},
    ],
    "fastapi": [
        {"title": "FastAPI Official Docs", "url": "https://fastapi.tiangolo.com/learn/", "platform": "FastAPI", "cost": "free"},
    ],
    "spring": [
        {"title": "Spring Quickstart Guide", "url": "https://spring.io/quickstart", "platform": "Spring", "cost": "free"},
    ],
    "linux": [
        {"title": "Linux Command Line (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/linux-command-line-basics/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "terraform": [
        {"title": "Terraform Learn", "url": "https://learn.hashicorp.com/terraform", "platform": "HashiCorp", "cost": "free"},
    ],
    "ci/cd": [
        {"title": "CI/CD Pipeline (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/ci-cd-pipeline/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "testing": [
        {"title": "Test-Driven Development (Udemy)", "url": "https://www.udemy.com/course/test-driven-development/", "platform": "Udemy", "cost": "paid"},
    ],
    "cypress": [
        {"title": "Cypress Testing (freeCodeCamp)", "url": "https://www.freecodecamp.org/news/cypress-testing/", "platform": "freeCodeCamp", "cost": "free"},
    ],
    "data analysis": [
        {"title": "Google Data Analytics Certificate", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "platform": "Coursera", "cost": "paid"},
    ],
    "digital marketing": [
        {"title": "Google Digital Marketing Certificate", "url": "https://www.coursera.org/professional-certificates/google-digital-marketing", "platform": "Coursera", "cost": "paid"},
    ],
    "seo": [
        {"title": "SEO Fundamentals (Moz)", "url": "https://moz.com/beginners-guide-to-seo", "platform": "Moz", "cost": "free"},
    ],
    "public speaking": [
        {"title": "Dynamic Public Speaking (Coursera)", "url": "https://www.coursera.org/specializations/public-speaking", "platform": "Coursera", "cost": "free"},
    ],
    "negotiation": [
        {"title": "Negotiation Fundamentals (Coursera)", "url": "https://www.coursera.org/learn/negotiation", "platform": "Coursera", "cost": "free"},
    ],
}

# Default fallback courses for unrecognized skills
DEFAULT_COURSES = [
    {"title": "Search on Coursera", "url": "https://www.coursera.org/", "platform": "Coursera", "cost": "free"},
    {"title": "Search on Udemy", "url": "https://www.udemy.com/", "platform": "Udemy", "cost": "paid"},
    {"title": "Search on freeCodeCamp", "url": "https://www.freecodecamp.org/", "platform": "freeCodeCamp", "cost": "free"},
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "by", "with", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "able", "about", "above", "across", "after", "again", "against",
    "all", "almost", "along", "also", "among", "another", "any", "anyone",
    "anything", "around", "because", "before", "behind", "below", "beneath",
    "between", "beyond", "both", "but", "cannot", "cause", "certain", "each",
    "either", "else", "enough", "every", "everyone", "everything", "few",
    "following", "for", "further", "get", "gets", "getting", "give", "given",
    "gives", "going", "got", "had", "hardly", "here", "how", "however", "into",
    "its", "itself", "just", "keep", "keeps", "kept", "kind", "know", "known",
    "knows", "large", "largely", "last", "later", "latter", "least", "less",
    "let", "lets", "like", "likely", "long", "longer", "longest", "made",
    "make", "makes", "making", "man", "many", "may", "maybe", "mean", "means",
    "meant", "men", "might", "more", "most", "mostly", "much", "must", "name",
    "named", "names", "namely", "near", "nearby", "nearly", "necessarily",
    "necessary", "need", "needed", "needing", "needs", "neither", "never",
    "nevertheless", "new", "newer", "newest", "next", "no", "nobody", "none",
    "nor", "normally", "not", "nothing", "now", "nowhere", "number", "numbers",
    "off", "often", "old", "older", "oldest", "once", "one", "only", "onto",
    "open", "opened", "opening", "opens", "other", "others", "otherwise",
    "our", "ours", "ourselves", "out", "over", "own", "part", "particular",
    "particularly", "parts", "per", "perhaps", "place", "places", "point",
    "points", "possible", "possibly", "present", "presented", "presenting",
    "presents", "problem", "problems", "put", "puts", "quite", "rather",
    "really", "reason", "reasons", "regarding", "regardless", "regards",
    "right", "rights", "said", "same", "saw", "say", "saying", "says",
    "second", "seconds", "see", "seem", "seemed", "seeming", "seems", "seen",
    "sees", "several", "shall", "she", "should", "show", "showed", "showing",
    "shows", "side", "sides", "since", "small", "smaller", "smallest", "some",
    "somebody", "somehow", "someone", "something", "sometime", "sometimes",
    "somewhat", "somewhere", "soon", "special", "still", "stop", "such",
    "sure", "take", "taken", "takes", "taking", "tell", "tells", "than",
    "that", "the", "their", "them", "themselves", "then", "there", "thereby",
    "therefore", "therein", "thereof", "thereon", "thereto", "thereupon",
    "these", "they", "thing", "things", "think", "thinks", "third", "this",
    "those", "though", "thought", "thoughts", "three", "through", "throughout",
    "thru", "thus", "to", "today", "together", "too", "top", "toward",
    "towards", "try", "tried", "tries", "trying", "turn", "turned", "turning",
    "turns", "two", "under", "unless", "until", "up", "upon", "us", "use",
    "used", "uses", "using", "usually", "value", "values", "various", "very",
    "via", "view", "views", "want", "wants", "way", "ways", "well", "wells",
    "went", "were", "what", "whatever", "when", "whenever", "where",
    "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever",
    "whether", "which", "while", "who", "whoever", "whole", "whom", "whose",
    "why", "will", "with", "within", "without", "work", "worked", "working",
    "works", "would", "year", "years", "yes", "yet",
    # Role-specific filler
    "looking", "hiring", "join", "team", "role", "position", "job", "candidate",
    "company", "client", "customer", "experience", "skills", "qualifications",
    "responsibilities", "requirements", "preferred", "minimum", "including",
    "including", "etc", "also", "well", "able", "within", "using", "across",
    "per", "via", "along", "among", "throughout", "etc",
}


def _tokenize(text: str) -> list[str]:
    """Lowercase, split on non-alpha, filter stop words and short tokens."""
    text = text.lower()
    tokens = re.findall(r"[a-z]+(?:[.#+/-][a-z0-9]+)*", text)
    return [t for t in tokens if len(t) > 1 and t not in STOP_WORDS and not t.isdigit()]


def _compute_tf(tokens: list[str]) -> dict[str, float]:
    """Term frequency: raw count normalized by total tokens."""
    total = len(tokens)
    if total == 0:
        return {}
    counts: Counter = Counter(tokens)
    return {word: round(count / total, 5) for word, count in counts.items()}


def _extract_skill_keywords(
    job_descriptions: list[str],
    top_n: int = 50,
) -> dict[str, float]:
    """
    Extract skill-frequency scores from a list of job description texts.
    Uses TF-IDF where IDF is computed across job postings.
    Returns dict of {keyword: relevance_score} sorted by score descending.
    """
    num_docs = len(job_descriptions)
    if num_docs == 0:
        return {}

    # Tokenize each document
    doc_tokens = [_tokenize(doc) for doc in job_descriptions]

    # Compute TF per document, aggregate IDF
    doc_freq: Counter = Counter()
    all_tfs: list[dict[str, float]] = []

    for tokens in doc_tokens:
        unique = set(tokens)
        doc_freq.update(unique)
        all_tfs.append(_compute_tf(tokens))

    # Compute TF-IDF: sum(tf * idf) across documents
    tfidf_scores: dict[str, float] = {}
    for tf_dict in all_tfs:
        for word, tf in tf_dict.items():
            idf = math.log(num_docs / (1 + doc_freq.get(word, 0)))
            tfidf_scores[word] = tfidf_scores.get(word, 0) + (tf * idf)

    # Sort by score descending and take top_n
    sorted_scores = sorted(tfidf_scores.items(), key=lambda x: -x[1])
    top = dict(sorted_scores[:top_n])

    # Normalize to 0-100 scale
    max_score = max(top.values()) if top else 1
    return {word: round((score / max_score) * 100, 1) for word, score in top.items()}


def find_courses(skill_name: str) -> list[dict[str, str]]:
    """Find matching courses for a skill name (case-insensitive fuzzy match)."""
    skill_lower = skill_name.lower().strip()

    # Direct match
    if skill_lower in SKILL_COURSES:
        return SKILL_COURSES[skill_lower]

    # Partial match: check if skill name contains a known key or vice versa
    for key, courses in SKILL_COURSES.items():
        if key in skill_lower or skill_lower in key:
            return courses

    return DEFAULT_COURSES


# ─── Main entry point ─────────────────────────────────────────────────────────

async def fetch_market_data(
    target_role: str,
    db: Any,
    max_jobs: int = 30,
) -> dict:
    """
    Fetch real job market data for a target role.
    
    1. Search Adzuna for active job postings matching the target role
    2. Extract skill frequencies from job descriptions
    3. Return demand scores for each detected skill
    4. Cache results for 1 hour to avoid hitting API limits
    
    Returns: {
        "skill_demand": {"python": 85.3, "react": 72.1, ...},
        "total_jobs_analyzed": 25,
        "sample_titles": ["Senior Python Developer", ...],
        "source": "adzuna",
        "target_role": target_role,
    }
    """
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        logger.info("Adzuna not configured — cannot fetch market data")
        return {"skill_demand": {}, "total_jobs_analyzed": 0, "sample_titles": [], "source": "none", "target_role": target_role}

    # Check cache first
    cache_key = hashlib.sha256(f"market:{target_role.lower()}".encode()).hexdigest()[:16]
    cached = await db.skill_market_cache.find_one({"cache_key": cache_key}) if db is not None else None
    if cached:
        expires_at = cached.get("expires_at")
        if expires_at and expires_at > datetime.now(timezone.utc):
            logger.info(f"Market data cache hit for '{target_role}'")
            cached["_source"] = "cache"
            return {k: v for k, v in cached.items() if k != "_id"}

    # Fetch job postings from Adzuna
    descriptions: list[str] = []
    titles: list[str] = []

    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": min(max_jobs, 50),
        "what": target_role,
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.adzuna.com/v1/api/jobs/gb/search/1",
                params=params,
            )
            response.raise_for_status()
            payload = response.json()
            for item in payload.get("results", []):
                desc = item.get("description", "")
                title = item.get("title", "")
                if desc and title:
                    descriptions.append(desc)
                    titles.append(title)
    except Exception as e:
        logger.warning(f"Adzuna fetch failed for '{target_role}': {e}")
        return {"skill_demand": {}, "total_jobs_analyzed": 0, "sample_titles": [], "source": "error", "target_role": target_role}

    if not descriptions:
        return {"skill_demand": {}, "total_jobs_analyzed": 0, "sample_titles": [], "source": "no_results", "target_role": target_role}

    # Extract skill frequencies
    skill_demand = _extract_skill_keywords(descriptions, top_n=50)
    total = len(descriptions)
    unique_titles = list(dict.fromkeys(titles))[:10]  # deduplicate, max 10

    result = {
        "skill_demand": skill_demand,
        "total_jobs_analyzed": total,
        "sample_titles": unique_titles,
        "source": "adzuna",
        "target_role": target_role,
        "cache_key": cache_key,
    }

    # Cache for 1 hour
    try:
        now = datetime.now(timezone.utc)
        await db.skill_market_cache.update_one(
            {"cache_key": cache_key},
            {"$set": {
                "cache_key": cache_key,
                **result,
                "fetched_at": now,
                "expires_at": now + timedelta(hours=1),
            }},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Failed to cache market data: {e}")

    return result
