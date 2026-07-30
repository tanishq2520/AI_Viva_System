import sqlite3
from contextlib import contextmanager

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5.6"
    SPEECH_DB_PATH: str = "../Viva-speech-Module/viva.db"
    RESULTS_DB_PATH: str = "evaluation_results.db"
    QUESTION_MODULE_DATABASE_URL: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


@contextmanager
def sqlite_connection(db_path: str):
    conn = sqlite3.connect(db_path)
    try:
        yield conn
    finally:
        conn.close()


def init_results_db():
    with sqlite_connection(settings.RESULTS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                speech_question_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                expected_answer TEXT NOT NULL,
                student_answer TEXT NOT NULL,
                score INTEGER NOT NULL,
                verdict TEXT NOT NULL,
                strengths TEXT NOT NULL,
                missing_points TEXT NOT NULL,
                feedback TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def save_result(result: dict):
    with sqlite_connection(settings.RESULTS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO evaluation_results (
                speech_question_id,
                question_text,
                expected_answer,
                student_answer,
                score,
                verdict,
                strengths,
                missing_points,
                feedback
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result["speech_question_id"],
                result["question_text"],
                result["expected_answer"],
                result["student_answer"],
                result["score"],
                result["verdict"],
                "\n".join(result["strengths"]),
                "\n".join(result["missing_points"]),
                result["feedback"],
            ),
        )
        conn.commit()
