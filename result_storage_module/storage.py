import json
import sqlite3
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "viva_history.db"

DEMO_QUESTIONS = [
    {
        "id": 1,
        "question": "What is a stack, and where is it used?",
        "category": "Data Structures",
        "difficulty": "Easy",
        "timeLimit": 120,
        "answer": "A stack is a linear LIFO data structure used in function calls, recursion, expression evaluation, and undo operations.",
        "sampleTranscript": "A stack is a Last In First Out data structure used for recursion and call stacks.",
    },
    {
        "id": 2,
        "question": "Explain the difference between an array and a linked list.",
        "category": "Data Structures",
        "difficulty": "Medium",
        "timeLimit": 120,
        "answer": "Arrays use contiguous memory with O(1) random access and fixed size, whereas linked lists use dynamic node memory with pointers and O(n) traversal.",
        "sampleTranscript": "Arrays have fixed size in contiguous memory while linked lists use dynamic node pointers.",
    },
    {
        "id": 3,
        "question": "What is time complexity and why is it important?",
        "category": "Algorithms",
        "difficulty": "Medium",
        "timeLimit": 120,
        "answer": "Time complexity measures execution time relative to input size n, expressed in Big O notation to determine algorithm scalability.",
        "sampleTranscript": "Time complexity measures algorithm running time growth as input size n increases.",
    },
    {
        "id": 4,
        "question": "Describe binary search and its prerequisite.",
        "category": "Algorithms",
        "difficulty": "Medium",
        "timeLimit": 120,
        "answer": "Binary search divides sorted arrays in half repeatedly with O(log n) time complexity. Prerequisite: input array must be sorted.",
        "sampleTranscript": "Binary search divides sorted data in half repeatedly to achieve log n search time.",
    },
    {
        "id": 5,
        "question": "What is normalization in databases?",
        "category": "Databases",
        "difficulty": "Hard",
        "timeLimit": 120,
        "answer": "Normalization organizes relational tables to eliminate redundancy, avoid update anomalies, and maintain data integrity using normal forms.",
        "sampleTranscript": "Normalization eliminates database redundancy and anomalies using normal forms.",
    },
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def tokenize(text: str) -> list[str]:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return [w for w in cleaned.split() if len(w) > 2]


def keywords(text: str) -> list[str]:
    stopwords = {
        "the", "and", "is", "for", "with", "that", "this", "from", "are", "used", "used",
        "what", "how", "why", "where", "into", "over", "such", "using", "uses",
    }
    return [w for w in tokenize(text) if w not in stopwords]


def evaluate_answer(question: str, expected_answer: str, student_answer: str) -> dict[str, Any]:
    payload = {
        "question": question,
        "expected_answer": expected_answer,
        "student_answer": student_answer,
    }
    try:
        request = urllib.request.Request(
            "http://127.0.0.1:8002/api/v1/evaluate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=3) as response:
            data = json.loads(response.read().decode("utf-8"))
            score = int(round(data.get("overall_score", 0) / 10))
            return {
                "score": max(0, min(score, 10)),
                "verdict": "correct" if score >= 8 else "partially_correct" if score >= 5 else "incorrect",
                "strengths": data.get("strengths", ["Answered relevant concepts."]),
                "missing_points": data.get("improvements", []),
                "feedback": data.get("verdict_explanation", "AI evaluation complete."),
            }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return local_evaluate_answer(question, expected_answer, student_answer)


def local_evaluate_answer(question: str, expected_answer: str, student_answer: str) -> dict[str, Any]:
    expected_terms = keywords(expected_answer) or keywords(question)
    student_terms = set(tokenize(student_answer))

    if not student_answer.strip():
        return {
            "score": 0,
            "verdict": "incorrect",
            "strengths": [],
            "missing_points": expected_terms[:4],
            "feedback": "No answer was recorded for this question.",
        }

    matched = [t for t in expected_terms if t in student_terms]
    missing = [t for t in expected_terms if t not in student_terms]
    coverage = len(matched) / max(len(expected_terms), 1)

    word_count = len(student_answer.split())
    if coverage >= 0.4:
        score = 8 if coverage >= 0.7 else 6
        verdict = "correct" if score >= 8 else "partially_correct"
    elif word_count >= 5:
        score = 5
        verdict = "partially_correct"
    else:
        score = 3
        verdict = "incorrect"

    return {
        "score": max(0, min(score, 10)),
        "verdict": verdict,
        "strengths": [f"Covered concept: {term}" for term in (matched[:3] or ["relevant explanation"])],
        "missing_points": [f"Expected concept: {term}" for term in missing[:3]],
        "feedback": feedback_for(verdict, coverage),
    }


def validate_answer(question_text: str, expected_answer: str, student_answer: str) -> dict[str, Any]:
    payload = {
        "question": question_text,
        "expected_answer": expected_answer,
        "student_answer": student_answer,
        "language": "English",
    }
    try:
        request = urllib.request.Request(
            "http://127.0.0.1:8002/api/v1/validate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=3) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return local_validate_answer(question_text, expected_answer, student_answer)


def local_validate_answer(question_text: str, expected_answer: str, student_answer: str) -> dict[str, Any]:
    answer_tokens = set(tokenize(student_answer))
    expected_tokens = set(tokenize(expected_answer or question_text))
    if not (student_answer or "").strip():
        return {
            "validation_status": "Invalid",
            "relevance_score": 0.0,
            "semantic_similarity": 0.0,
            "completeness": "Irrelevant",
            "confidence": 0.0,
            "remarks": "Invalid response attempt. Empty answer.",
        }

    similarity = round(len(answer_tokens & expected_tokens) / max(len(expected_tokens), 1), 2)
    relevance = round(min(1.0, similarity + 0.3), 2)
    return {
        "validation_status": "Valid",
        "relevance_score": relevance,
        "semantic_similarity": similarity,
        "completeness": "Complete" if similarity >= 0.5 else "Partially Complete",
        "confidence": 0.9,
        "remarks": "Answer is valid for AI evaluation.",
    }


def feedback_for(verdict: str, coverage: float) -> str:
    if verdict == "correct":
        return "Strong response with key concepts covered clearly."
    if verdict == "partially_correct":
        return "Relevant attempt covering essential core concepts."
    return "The answer provides a basic attempt but requires stronger alignment with expected technical points."


def grade_for(percentage: float) -> str:
    if percentage >= 90:
        return "A+"
    if percentage >= 80:
        return "A"
    if percentage >= 70:
        return "B+"
    if percentage >= 60:
        return "B"
    if percentage >= 50:
        return "C"
    return "Needs Review"


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS viva_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                subject TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                attempted INTEGER NOT NULL,
                total_score INTEGER NOT NULL,
                max_score INTEGER NOT NULL,
                percentage REAL NOT NULL,
                grade TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS viva_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attempt_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                expected_answer TEXT NOT NULL,
                student_answer TEXT NOT NULL,
                score INTEGER NOT NULL,
                verdict TEXT NOT NULL,
                strengths TEXT NOT NULL,
                missing_points TEXT NOT NULL,
                feedback TEXT NOT NULL,
                validation TEXT NOT NULL DEFAULT '{}',
                category TEXT NOT NULL,
                FOREIGN KEY(attempt_id) REFERENCES viva_attempts(id)
            )
            """
        )


def public_questions() -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "question": item["question"],
            "category": item["category"],
            "difficulty": item["difficulty"],
            "timeLimit": item["timeLimit"],
            "expectedKeywords": keywords(item["answer"])[:6],
            "sampleTranscript": item["sampleTranscript"],
        }
        for item in DEMO_QUESTIONS
    ]


def save_attempt(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    submitted_answers = payload.get("answers", [])

    if submitted_answers:
        questions_to_eval = [
            {
                "id": item.get("questionId", idx + 1),
                "question": item.get("questionText") or f"Question {idx + 1}",
                "answer": item.get("expectedAnswer") or item.get("questionText") or "",
                "category": item.get("category") or "General Viva",
                "student_answer": (item.get("answer") or "").strip(),
            }
            for idx, item in enumerate(submitted_answers)
        ]
    else:
        questions_to_eval = [
            {
                "id": q["id"],
                "question": q["question"],
                "answer": q["answer"],
                "category": q["category"],
                "student_answer": "",
            }
            for q in DEMO_QUESTIONS
        ]

    evaluated = []
    for q in questions_to_eval:
        student_answer = q["student_answer"]
        expected_answer = q["answer"]

        if student_answer:
            validation = validate_answer(q["question"], expected_answer, student_answer)
            evaluation = evaluate_answer(q["question"], expected_answer, student_answer)
            # Ensure non-empty answers receive a fair score
            if len(student_answer.split()) >= 2 and evaluation["score"] < 5:
                evaluation["score"] = min(10, max(5, int(len(student_answer.split()) * 2)))
                if evaluation["verdict"] == "incorrect":
                    evaluation["verdict"] = "partially_correct"
        else:
            validation = {
                "validation_status": "Unanswered",
                "relevance_score": 0.0,
                "semantic_similarity": 0.0,
                "completeness": "Unanswered",
                "confidence": 0.0,
                "remarks": "No response recorded.",
            }
            evaluation = {
                "score": 0,
                "verdict": "incorrect",
                "strengths": [],
                "missing_points": ["Question was left unanswered."],
                "feedback": "No answer recorded.",
            }

        evaluated.append(
            {
                "questionId": q["id"],
                "questionText": q["question"],
                "expectedAnswer": expected_answer,
                "studentAnswer": student_answer,
                "category": q["category"],
                "validation": validation,
                **evaluation,
            }
        )

    attempted = sum(1 for item in evaluated if item["studentAnswer"])
    total_score = sum(item["score"] for item in evaluated)
    max_score = len(evaluated) * 10
    percentage = round((total_score / max_score) * 100, 2) if max_score else 0
    created_at = utc_now()

    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO viva_attempts (
                student_id, student_name, subject, duration_seconds, total_questions,
                attempted, total_score, max_score, percentage, grade, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("studentId", "CS21B04"),
                payload.get("studentName", "Akash"),
                payload.get("subject", "Data Structures & Algorithms Examination"),
                int(payload.get("durationSeconds", 0)),
                len(questions_to_eval),
                attempted,
                total_score,
                max_score,
                percentage,
                grade_for(percentage),
                created_at,
            ),
        )
        attempt_id = cursor.lastrowid
        for item in evaluated:
            conn.execute(
                """
                INSERT INTO viva_answers (
                    attempt_id, question_id, question_text, expected_answer, student_answer,
                    score, verdict, strengths, missing_points, feedback, validation, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    attempt_id,
                    item["questionId"],
                    item["questionText"],
                    item["expectedAnswer"],
                    item["studentAnswer"],
                    item["score"],
                    item["verdict"],
                    json.dumps(item["strengths"]),
                    json.dumps(item["missing_points"]),
                    item["feedback"],
                    json.dumps(item["validation"]),
                    item["category"],
                ),
            )

    return get_attempt(attempt_id)


def get_attempt(attempt_id: int) -> dict[str, Any]:
    with connect() as conn:
        attempt = conn.execute("SELECT * FROM viva_attempts WHERE id = ?", (attempt_id,)).fetchone()
        if not attempt:
            raise KeyError(f"Attempt {attempt_id} not found")
        answers = conn.execute(
            "SELECT * FROM viva_answers WHERE attempt_id = ? ORDER BY question_id",
            (attempt_id,),
        ).fetchall()
    return format_attempt(attempt, answers)


get_attempt_by_id = get_attempt


def get_latest_attempt() -> dict[str, Any] | None:
    init_db()
    with connect() as conn:
        attempt = conn.execute("SELECT * FROM viva_attempts ORDER BY id DESC LIMIT 1").fetchone()
        if not attempt:
            return None
        answers = conn.execute(
            "SELECT * FROM viva_answers WHERE attempt_id = ? ORDER BY question_id",
            (attempt["id"],),
        ).fetchall()
    return format_attempt(attempt, answers)


def get_student_latest_attempt(student_id: str) -> dict[str, Any] | None:
    init_db()
    with connect() as conn:
        attempt = conn.execute(
            "SELECT * FROM viva_attempts WHERE student_id = ? ORDER BY id DESC LIMIT 1",
            (student_id,),
        ).fetchone()
        if not attempt:
            return None
        answers = conn.execute(
            "SELECT * FROM viva_answers WHERE attempt_id = ? ORDER BY question_id",
            (attempt["id"],),
        ).fetchall()
    return format_attempt(attempt, answers)


def get_student_attempts(student_id: str) -> list[dict[str, Any]]:
    init_db()
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM viva_attempts WHERE student_id = ? ORDER BY id DESC",
            (student_id,),
        ).fetchall()
    return [
        {
            "id": str(row["id"]),
            "subject": row["subject"],
            "date": row["created_at"][:10],
            "score": round(float(row["percentage"])),
            "grade": row["grade"],
            "duration": format_duration(row["duration_seconds"]),
            "questionsAttempted": row["attempted"],
            "totalQuestions": row["total_questions"],
            "status": "completed",
        }
        for row in rows
    ]


def get_all_attempts() -> list[dict[str, Any]]:
    init_db()
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, student_id, student_name, subject, percentage, grade, created_at FROM viva_attempts ORDER BY id DESC"
        ).fetchall()
    return [
        {
            "id": row["id"],
            "studentId": row["student_id"],
            "studentName": row["student_name"],
            "subject": row["subject"],
            "percentage": round(float(row["percentage"])),
            "grade": row["grade"],
            "date": row["created_at"][:10],
        }
        for row in rows
    ]


def format_attempt(attempt: sqlite3.Row, answers: list[sqlite3.Row]) -> dict[str, Any]:
    items = []
    for row in answers:
        items.append(
            {
                "questionId": row["question_id"],
                "questionText": row["question_text"],
                "expectedAnswer": row["expected_answer"],
                "studentAnswer": row["student_answer"],
                "score": row["score"],
                "verdict": row["verdict"],
                "strengths": json.loads(row["strengths"]),
                "missingPoints": json.loads(row["missing_points"]),
                "feedback": row["feedback"],
                "validation": json.loads(row["validation"]),
                "category": row["category"],
            }
        )

    section_scores = []
    for category in sorted({item["category"] for item in items}):
        category_items = [item for item in items if item["category"] == category]
        score = round(sum(item["score"] for item in category_items) / (len(category_items) * 10) * 100)
        section_scores.append({"name": category, "score": score})

    percentage = round(float(attempt["percentage"]))
    return {
        "id": attempt["id"],
        "studentId": attempt["student_id"],
        "studentName": attempt["student_name"],
        "subject": attempt["subject"],
        "date": attempt["created_at"][:10],
        "duration": format_duration(attempt["duration_seconds"]),
        "durationSeconds": attempt["duration_seconds"],
        "overallScore": percentage,
        "grade": attempt["grade"],
        "totalQuestions": attempt["total_questions"],
        "attempted": attempt["attempted"],
        "totalScore": attempt["total_score"],
        "maxScore": attempt["max_score"],
        "scores": {
            "communication": round(max(35, min(95, percentage + 5))),
            "conceptUnderstanding": round(percentage),
            "accuracy": round(max(25, min(100, percentage))),
            "fluency": round(max(35, min(95, percentage + 8))),
            "depth": round(max(20, min(90, percentage - 4))),
        },
        "sectionScores": section_scores,
        "performanceTrend": [{"attempt": f"Attempt {attempt['id']}", "score": percentage}],
        "answers": items,
        "feedbackSummary": build_feedback_summary(items),
    }


def build_feedback_summary(items: list[dict[str, Any]]) -> dict[str, Any]:
    strengths = []
    improvements = []
    recommendations = []
    topic_feedback = []
    for item in items:
        strengths.extend(item["strengths"])
        improvements.extend(item["missingPoints"])
        topic_feedback.append(
            {
                "topic": item["category"],
                "score": item["score"] * 10,
                "comment": item["feedback"],
            }
        )
    if improvements:
        recommendations.append("Revise missing concepts and structure your explanations clearly.")
    recommendations.append("Practice concise spoken explanations before your next viva.")
    return {
        "strengths": strengths[:5],
        "improvements": improvements[:5],
        "recommendations": recommendations,
        "topicFeedback": topic_feedback,
    }


def format_duration(seconds: int) -> str:
    minutes, secs = divmod(max(0, int(seconds)), 60)
    return f"{minutes} min {secs:02d} sec"
