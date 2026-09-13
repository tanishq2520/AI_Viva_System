from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .db.session import get_db
from .db.models import Question, User
from .auth import get_current_user

router = APIRouter(prefix="/api/questions", tags=["questions"])

class VivaQuestionResponse(BaseModel):
    id: int
    question: str
    category: str
    difficulty: str
    expectedKeywords: list[str]
    timeLimit: int

class QuestionsListResponse(BaseModel):
    questions: list[VivaQuestionResponse]

@router.get("", response_model=QuestionsListResponse)
def get_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_questions = db.query(Question).filter(Question.status == "active").limit(10).all()
    
    result = []
    for idx, q in enumerate(db_questions, start=1):
        # Generate some expected keywords from the expected answer
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
