import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .session import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('student', 'teacher')", name="ck_users_role"),
        Index("ix_users_role_active", "role", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    student_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    owned_questions: Mapped[list["Question"]] = relationship(back_populates="owner")
    owned_vivas: Mapped[list["Viva"]] = relationship(back_populates="owner")
    assignments: Mapped[list["VivaAssignment"]] = relationship(back_populates="student")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="student")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name="ck_questions_difficulty"),
        CheckConstraint("status IN ('active', 'archived')", name="ck_questions_status"),
        Index("ix_questions_owner_status", "owner_id", "status"),
        Index("ix_questions_subject_topic", "subject", "topic"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str | None] = mapped_column(String(150))
    topic: Mapped[str | None] = mapped_column(String(150))
    difficulty: Mapped[str | None] = mapped_column(String(20))
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="English", server_default="English")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    owner: Mapped[User] = relationship(back_populates="owned_questions")
    viva_questions: Mapped[list["VivaQuestion"]] = relationship(back_populates="question")


class Viva(Base):
    __tablename__ = "vivas"
    __table_args__ = (
        CheckConstraint("duration_seconds > 0", name="ck_vivas_duration_positive"),
        CheckConstraint("status IN ('draft', 'published', 'closed', 'archived')", name="ck_vivas_status"),
        CheckConstraint("version > 0", name="ck_vivas_version_positive"),
        CheckConstraint("available_until IS NULL OR available_from IS NULL OR available_until > available_from", name="ck_vivas_availability_order"),
        Index("ix_vivas_owner_status", "owner_id", "status"),
        Index("ix_vivas_status_availability", "status", "available_from", "available_until"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(150))
    instructions: Mapped[str | None] = mapped_column(Text)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", server_default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    owner: Mapped[User] = relationship(back_populates="owned_vivas")
    viva_questions: Mapped[list["VivaQuestion"]] = relationship(back_populates="viva")
    assignments: Mapped[list["VivaAssignment"]] = relationship(back_populates="viva")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="viva")


class VivaQuestion(Base):
    __tablename__ = "viva_questions"
    __table_args__ = (
        UniqueConstraint("viva_id", "position", name="uq_viva_questions_position"),
        UniqueConstraint("viva_id", "question_id", name="uq_viva_questions_question"),
        CheckConstraint("position > 0", name="ck_viva_questions_position_positive"),
        CheckConstraint("time_limit_seconds IS NULL OR time_limit_seconds > 0", name="ck_viva_questions_time_positive"),
        CheckConstraint("max_score > 0", name="ck_viva_questions_max_score_positive"),
        Index("ix_viva_questions_viva_position", "viva_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    viva_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vivas.id"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    time_limit_seconds: Mapped[int | None] = mapped_column(Integer)
    question_text_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=10, server_default="10")

    viva: Mapped[Viva] = relationship(back_populates="viva_questions")
    question: Mapped[Question] = relationship(back_populates="viva_questions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="viva_question")


class VivaAssignment(Base):
    __tablename__ = "viva_assignments"
    __table_args__ = (
        UniqueConstraint("viva_id", "student_id", name="uq_viva_assignments_student"),
        CheckConstraint("status IN ('available', 'started', 'completed', 'expired')", name="ck_viva_assignments_status"),
        CheckConstraint("available_until IS NULL OR available_from IS NULL OR available_until > available_from", name="ck_viva_assignments_availability_order"),
        Index("ix_viva_assignments_student_status", "student_id", "status"),
        Index("ix_viva_assignments_viva_status", "viva_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    viva_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vivas.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="available", server_default="available")
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    viva: Mapped[Viva] = relationship(back_populates="assignments")
    student: Mapped[User] = relationship(back_populates="assignments")


class Attempt(Base):
    __tablename__ = "attempts"
    __table_args__ = (
        CheckConstraint("status IN ('in_progress', 'submitted', 'evaluating', 'completed', 'failed', 'expired')", name="ck_attempts_status"),
        CheckConstraint("duration_seconds IS NULL OR duration_seconds >= 0", name="ck_attempts_duration_nonnegative"),
        CheckConstraint("total_score IS NULL OR total_score >= 0", name="ck_attempts_total_score_nonnegative"),
        CheckConstraint("max_score IS NULL OR max_score >= 0", name="ck_attempts_max_score_nonnegative"),
        CheckConstraint("percentage IS NULL OR (percentage >= 0 AND percentage <= 100)", name="ck_attempts_percentage_range"),
        Index("ix_attempts_student_created", "student_id", "created_at"),
        Index("ix_attempts_viva_status", "viva_id", "status"),
        Index("ix_attempts_student_viva", "student_id", "viva_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    viva_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vivas.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress", server_default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    total_score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    max_score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    grade: Mapped[str | None] = mapped_column(String(20))
    submission_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    evaluator_version: Mapped[str | None] = mapped_column(String(100))

    viva: Mapped[Viva] = relationship(back_populates="attempts")
    student: Mapped[User] = relationship(back_populates="attempts")
    answers: Mapped[list["Answer"]] = relationship(back_populates="attempt")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "viva_question_id", name="uq_answers_attempt_question"),
        CheckConstraint("answer_status IN ('draft', 'confirmed', 'submitted', 'unanswered')", name="ck_answers_status"),
        Index("ix_answers_attempt", "attempt_id"),
        Index("ix_answers_viva_question", "viva_question_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attempts.id"), nullable=False)
    viva_question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("viva_questions.id"), nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text)
    edited_answer: Mapped[str | None] = mapped_column(Text)
    answer_status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", server_default="draft")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    attempt: Mapped[Attempt] = relationship(back_populates="answers")
    viva_question: Mapped[VivaQuestion] = relationship(back_populates="answers")
    evaluation: Mapped["Evaluation"] = relationship(back_populates="answer", uselist=False)


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint("answer_id", name="uq_evaluations_answer"),
        CheckConstraint("validation_status IN ('valid', 'invalid', 'unanswered', 'error')", name="ck_evaluations_validation_status"),
        CheckConstraint("validation_confidence IS NULL OR (validation_confidence >= 0 AND validation_confidence <= 1)", name="ck_evaluations_validation_confidence_range"),
        CheckConstraint("semantic_similarity IS NULL OR (semantic_similarity >= 0 AND semantic_similarity <= 1)", name="ck_evaluations_similarity_range"),
        CheckConstraint("concept_coverage IS NULL OR (concept_coverage >= 0 AND concept_coverage <= 1)", name="ck_evaluations_coverage_range"),
        CheckConstraint("score >= 0", name="ck_evaluations_score_nonnegative"),
        CheckConstraint("max_score > 0", name="ck_evaluations_max_score_positive"),
        CheckConstraint("score <= max_score", name="ck_evaluations_score_within_max"),
        Index("ix_evaluations_status_created", "validation_status", "created_at"),
        Index("ix_evaluations_method_version", "method", "version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("answers.id"), nullable=False)
    validation_status: Mapped[str] = mapped_column(String(20), nullable=False)
    validation_confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    semantic_similarity: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    concept_coverage: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    max_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    verdict: Mapped[str] = mapped_column(String(30), nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)
    strengths: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    missing_points: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    method: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    answer: Mapped[Answer] = relationship(back_populates="evaluation")
