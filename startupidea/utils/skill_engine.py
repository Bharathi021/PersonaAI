from typing import Dict, List

from models.role_catalog import ROLE_SKILLS

try:
    import spacy
except ImportError:
    spacy = None


KEYWORD_SKILLS = sorted(
    {
        item
        for skills in ROLE_SKILLS.values()
        for item in skills
    }.union(
        {
            "javascript",
            "react",
            "node",
            "kubernetes",
            "aws",
            "azure",
            "communication",
            "problem solving",
            "data structures",
        }
    )
)


def _load_nlp():
    if spacy is None:
        return None
    try:
        return spacy.load("en_core_web_sm")
    except Exception:
        return spacy.blank("en")


NLP = _load_nlp()


def extract_skills(resume_text: str) -> List[str]:
    text = resume_text.lower()
    found = {skill for skill in KEYWORD_SKILLS if skill in text}

    if NLP is not None:
        doc = NLP(resume_text)
        for chunk in doc.noun_chunks if doc.has_annotation("DEP") else []:
            chunk_text = chunk.text.strip().lower()
            if chunk_text in KEYWORD_SKILLS:
                found.add(chunk_text)

    return sorted(found)


def match_role(role: str, extracted_skills: List[str]) -> Dict[str, object]:
    required = ROLE_SKILLS.get(role, [])
    extracted_set = set(extracted_skills)
    matched = [skill for skill in required if skill in extracted_set]
    missing = [skill for skill in required if skill not in extracted_set]

    percent = round((len(matched) / len(required)) * 100, 2) if required else 0.0

    return {
        "role_required_skills": required,
        "missing_skills": missing,
        "skill_match_percent": percent,
    }
