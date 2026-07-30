import json
from functools import lru_cache

from openai import OpenAI

from database import settings


SYSTEM_PROMPT = """You are an academic viva examiner.
Compare the student's transcribed spoken answer with the expected answer.
Evaluate conceptual correctness, completeness, clarity, and relevance.
Return JSON only with this exact structure:
{
  "score": integer from 0 to 10,
  "verdict": "correct" | "partially_correct" | "incorrect",
  "strengths": ["short point"],
  "missing_points": ["short point"],
  "feedback": "short teacher-facing feedback"
}"""


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def evaluate_answer(question_text: str, expected_answer: str, student_answer: str) -> dict:
    if not (student_answer or "").strip() or student_answer.strip() == "[No response]":
        return {
            "score": 0,
            "verdict": "incorrect",
            "strengths": [],
            "missing_points": ["No meaningful spoken answer was captured."],
            "feedback": "The student did not provide a usable answer.",
        }

    client = get_client()
    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Question: {question_text}\n"
                    f"Expected answer: {expected_answer}\n"
                    f"Student transcribed answer: {student_answer}\n"
                    "Return JSON only."
                ),
            },
        ],
    )
    return parse_response(response.output_text)


def parse_response(raw_text: str) -> dict:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    data = json.loads(cleaned)
    return {
        "score": max(0, min(int(data.get("score", 0)), 10)),
        "verdict": str(data.get("verdict", "incorrect")),
        "strengths": [str(item) for item in data.get("strengths", [])],
        "missing_points": [str(item) for item in data.get("missing_points", [])],
        "feedback": str(data.get("feedback", "")).strip(),
    }
