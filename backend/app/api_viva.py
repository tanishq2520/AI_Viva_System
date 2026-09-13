from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import secrets

from .db.session import get_db
from .db.models import Question, User, Viva, Attempt, Answer, VivaQuestion
from .auth import get_current_user

router = APIRouter(prefix="/api", tags=["viva"])

class VivaQuestionResponse(BaseModel):
    id: int
    question: str
    category: str
    difficulty: str
    expectedKeywords: list[str]
    timeLimit: int

class QuestionsListResponse(BaseModel):
    questions: list[VivaQuestionResponse]

@router.get("/questions", response_model=QuestionsListResponse)
def get_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_questions = db.query(Question).filter(Question.status == "active").limit(10).all()

    result = []
    for idx, q in enumerate(db_questions, start=1):
        keywords = []
        if q.expected_answer:
            words = q.expected_answer.lower().replace(',', ' ').replace('.', ' ').split()
            keywords = [w for w in words if len(w) > 3][:8]

        result.append(VivaQuestionResponse(
            id=idx,
            question=q.question_text,
            category=q.subject or q.topic or "General",
            difficulty=q.difficulty or "Medium",
            expectedKeywords=keywords,
            timeLimit=120
        ))

    return {"questions": result}

class AnswerSubmit(BaseModel):
    questionId: int
    answer: str
    questionText: str
    category: str
    expectedAnswer: Optional[str] = None

class AttemptSubmit(BaseModel):
    studentId: str
    studentName: str
    subject: str
    durationSeconds: int
    answers: List[AnswerSubmit]

@router.post("/attempts")
def submit_attempt(payload: AttemptSubmit, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Ensure a Viva exists for the subject
    viva = db.query(Viva).filter(Viva.subject == payload.subject).first()
    if not viva:
        teacher = db.query(User).filter(User.role == "teacher").first()
        owner_id = teacher.id if teacher else current_user.id
        viva = Viva(
            owner_id=owner_id,
            title=f"{payload.subject} Viva",
            subject=payload.subject,
            duration_seconds=1800,
            status="published"
        )
        db.add(viva)
        db.flush()

    # 2. Create the Attempt
    attempt = Attempt(
        viva_id=viva.id,
        student_id=current_user.id,
        status="submitted",
        duration_seconds=payload.durationSeconds,
        submission_key=secrets.token_hex(16)
    )
    db.add(attempt)
    db.flush()

    # 3. Handle Answers
    for ans in payload.answers:
        question = db.query(Question).filter(Question.question_text == ans.questionText).first()
        if not question:
            teacher = db.query(User).filter(User.role == "teacher").first()
            owner_id = teacher.id if teacher else current_user.id
            question = Question(
                owner_id=owner_id,
                question_text=ans.questionText,
                expected_answer=ans.expectedAnswer or "",
                subject=payload.subject,
                topic=ans.category
            )
            db.add(question)
            db.flush()

        viva_question = db.query(VivaQuestion).filter(
            VivaQuestion.viva_id == viva.id,
            VivaQuestion.question_id == question.id
        ).first()
        if not viva_question:
            viva_question = VivaQuestion(
                viva_id=viva.id,
                question_id=question.id,
                position=ans.questionId,
                question_text_snapshot=question.question_text,
                expected_answer_snapshot=question.expected_answer
            )
            db.add(viva_question)
            db.flush()

        answer_record = Answer(
            attempt_id=attempt.id,
            viva_question_id=viva_question.id,
            transcript=ans.answer,
            answer_status="submitted"
        )
        db.add(answer_record)

    db.commit()

    return {"result": {"id": str(attempt.id), "status": attempt.status}}
