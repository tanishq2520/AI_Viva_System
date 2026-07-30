import re
from pathlib import Path

from sqlalchemy import create_engine, text

from database import settings, sqlite_connection


QUESTION_MODULE_ROOT = Path(__file__).resolve().parent.parent / "ai_viva_question_module_repo"


def normalize_question(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip().lower())
    cleaned = re.sub(r"[^a-z0-9\s]", "", cleaned)
    return cleaned


def load_question_bank() -> dict[str, dict]:
    """Load expected answers from the question module database or a local export."""
    if settings.QUESTION_MODULE_DATABASE_URL:
        engine = create_engine(settings.QUESTION_MODULE_DATABASE_URL)
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT question_text, answer_text FROM questions ORDER BY id ASC")
            ).fetchall()
    else:
        rows = _load_question_bank_export()

    bank = {}
    for question_text, answer_text in rows:
        bank[normalize_question(question_text)] = {
            "question_text": question_text,
            "answer_text": answer_text,
        }
    return bank


def _load_question_bank_export() -> list[tuple]:
    question_bank_path = QUESTION_MODULE_ROOT / "question_bank.db"
    if not question_bank_path.exists():
        raise FileNotFoundError(
            "question_bank.db was not found in the ai_viva_question_module repo. "
            "Either set QUESTION_MODULE_DATABASE_URL in .env or create a SQLite export "
            "with table question_bank(question_text, answer_text)."
        )

    with sqlite_connection(str(question_bank_path)) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT question_text, answer_text FROM question_bank")
        return cursor.fetchall()


def load_speech_answers() -> list[dict]:
    with sqlite_connection(settings.SPEECH_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, question_text, COALESCE(viva_answers, '')
            FROM viva_questions
            ORDER BY id ASC
            """
        )
        rows = cursor.fetchall()

    return [
        {
            "speech_question_id": row[0],
            "question_text": row[1],
            "student_answer": row[2],
            "normalized_question": normalize_question(row[1]),
        }
        for row in rows
    ]
