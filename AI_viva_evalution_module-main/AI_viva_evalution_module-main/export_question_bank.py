from sqlite3 import connect

from sqlalchemy import create_engine, text

from database import settings


def export_question_bank():
    if not settings.QUESTION_MODULE_DATABASE_URL:
        raise ValueError("Set QUESTION_MODULE_DATABASE_URL in .env before exporting.")

    engine = create_engine(settings.QUESTION_MODULE_DATABASE_URL)
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT question_text, answer_text FROM questions ORDER BY id ASC")
        ).fetchall()

    target_path = "../ai_viva_question_module_repo/question_bank.db"
    sqlite_conn = connect(target_path)
    cursor = sqlite_conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS question_bank")
    cursor.execute(
        """
        CREATE TABLE question_bank (
            question_text TEXT NOT NULL,
            answer_text TEXT NOT NULL
        )
        """
    )
    cursor.executemany(
        "INSERT INTO question_bank (question_text, answer_text) VALUES (?, ?)",
        rows,
    )
    sqlite_conn.commit()
    sqlite_conn.close()
    print(f"Exported {len(rows)} questions to {target_path}")


if __name__ == "__main__":
    export_question_bank()
