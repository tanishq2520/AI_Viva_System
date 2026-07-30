from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from pydantic_settings import BaseSettings
from typing import Optional, List
from datetime import datetime


# ─── Config ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"  
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"
        extra = "ignore" 

settings = Settings()


# ─── Database Setup ───────────────────────────────────────────────────────────

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Models ───────────────────────────────────────────────────────────────────

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    question_sets = relationship("QuestionSet", back_populates="teacher")

class QuestionSet(Base):
    __tablename__ = "question_sets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=True)
    original_filename = Column(String(255), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    teacher = relationship("Teacher", back_populates="question_sets")
    questions = relationship("Question", back_populates="question_set", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=False)
    question_set_id = Column(Integer, ForeignKey("question_sets.id"), nullable=False)
    question_set = relationship("QuestionSet", back_populates="questions")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TeacherRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class TeacherLogin(BaseModel):
    email: EmailStr
    password: str

class TeacherOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config: 
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class QuestionOut(BaseModel):
    id: int
    question_number: int
    question_text: str

    class Config: 
        from_attributes = True

class QuestionWithAnswer(QuestionOut):
    answer_text: str

class QuestionSetOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    original_filename: Optional[str]
    created_at: datetime
    question_count: int = 0

    class Config: 
        from_attributes = True

class QuestionSetDetail(QuestionSetOut):
    questions: List[QuestionOut]

class QuestionSetDetailWithAnswers(QuestionSetOut):
    questions: List[QuestionWithAnswer]