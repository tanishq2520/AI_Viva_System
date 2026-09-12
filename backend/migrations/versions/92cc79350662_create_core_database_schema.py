"""create core database schema

Revision ID: 92cc79350662
Revises: 5dabf48ed025
Create Date: 2026-09-13 00:01:52.774614
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '92cc79350662'
down_revision: Union[str, Sequence[str], None] = '5dabf48ed025'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("student_number", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("role IN ('student', 'teacher')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("student_number"),
    )
    op.create_index("ix_users_role_active", "users", ["role", "is_active"])

    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("expected_answer", sa.Text(), nullable=False),
        sa.Column("subject", sa.String(length=150), nullable=True),
        sa.Column("topic", sa.String(length=150), nullable=True),
        sa.Column("difficulty", sa.String(length=20), nullable=True),
        sa.Column("language", sa.String(length=50), server_default="English", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name="ck_questions_difficulty"),
        sa.CheckConstraint("status IN ('active', 'archived')", name="ck_questions_status"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_questions_owner_status", "questions", ["owner_id", "status"])
    op.create_index("ix_questions_subject_topic", "questions", ["subject", "topic"])

    op.create_table(
        "vivas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("subject", sa.String(length=150), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("duration_seconds > 0", name="ck_vivas_duration_positive"),
        sa.CheckConstraint("status IN ('draft', 'published', 'closed', 'archived')", name="ck_vivas_status"),
        sa.CheckConstraint("version > 0", name="ck_vivas_version_positive"),
        sa.CheckConstraint("available_until IS NULL OR available_from IS NULL OR available_until > available_from", name="ck_vivas_availability_order"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vivas_owner_status", "vivas", ["owner_id", "status"])
    op.create_index("ix_vivas_status_availability", "vivas", ["status", "available_from", "available_until"])

    op.create_table(
        "viva_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viva_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=True),
        sa.Column("question_text_snapshot", sa.Text(), nullable=False),
        sa.Column("expected_answer_snapshot", sa.Text(), nullable=False),
        sa.Column("max_score", sa.Integer(), server_default="10", nullable=False),
        sa.CheckConstraint("position > 0", name="ck_viva_questions_position_positive"),
        sa.CheckConstraint("time_limit_seconds IS NULL OR time_limit_seconds > 0", name="ck_viva_questions_time_positive"),
        sa.CheckConstraint("max_score > 0", name="ck_viva_questions_max_score_positive"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.ForeignKeyConstraint(["viva_id"], ["vivas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("viva_id", "position", name="uq_viva_questions_position"),
        sa.UniqueConstraint("viva_id", "question_id", name="uq_viva_questions_question"),
    )
    op.create_index("ix_viva_questions_viva_position", "viva_questions", ["viva_id", "position"])

    op.create_table(
        "viva_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viva_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="available", nullable=False),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("status IN ('available', 'started', 'completed', 'expired')", name="ck_viva_assignments_status"),
        sa.CheckConstraint("available_until IS NULL OR available_from IS NULL OR available_until > available_from", name="ck_viva_assignments_availability_order"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["viva_id"], ["vivas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("viva_id", "student_id", name="uq_viva_assignments_student"),
    )
    op.create_index("ix_viva_assignments_student_status", "viva_assignments", ["student_id", "status"])
    op.create_index("ix_viva_assignments_viva_status", "viva_assignments", ["viva_id", "status"])

    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viva_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="in_progress", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("total_score", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("max_score", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("percentage", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("grade", sa.String(length=20), nullable=True),
        sa.Column("submission_key", sa.String(length=128), nullable=False),
        sa.Column("evaluator_version", sa.String(length=100), nullable=True),
        sa.CheckConstraint("status IN ('in_progress', 'submitted', 'evaluating', 'completed', 'failed', 'expired')", name="ck_attempts_status"),
        sa.CheckConstraint("duration_seconds IS NULL OR duration_seconds >= 0", name="ck_attempts_duration_nonnegative"),
        sa.CheckConstraint("total_score IS NULL OR total_score >= 0", name="ck_attempts_total_score_nonnegative"),
        sa.CheckConstraint("max_score IS NULL OR max_score >= 0", name="ck_attempts_max_score_nonnegative"),
        sa.CheckConstraint("percentage IS NULL OR (percentage >= 0 AND percentage <= 100)", name="ck_attempts_percentage_range"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["viva_id"], ["vivas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_key"),
    )
    op.create_index("ix_attempts_student_created", "attempts", ["student_id", "created_at"])
    op.create_index("ix_attempts_viva_status", "attempts", ["viva_id", "status"])
    op.create_index("ix_attempts_student_viva", "attempts", ["student_id", "viva_id"])

    op.create_table(
        "answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viva_question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("edited_answer", sa.Text(), nullable=True),
        sa.Column("answer_status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("answer_status IN ('draft', 'confirmed', 'submitted', 'unanswered')", name="ck_answers_status"),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"]),
        sa.ForeignKeyConstraint(["viva_question_id"], ["viva_questions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "viva_question_id", name="uq_answers_attempt_question"),
    )
    op.create_index("ix_answers_attempt", "answers", ["attempt_id"])
    op.create_index("ix_answers_viva_question", "answers", ["viva_question_id"])

    op.create_table(
        "evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("validation_status", sa.String(length=20), nullable=False),
        sa.Column("validation_confidence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("semantic_similarity", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("concept_coverage", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("score", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("max_score", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("verdict", sa.String(length=30), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("strengths", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("missing_points", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("method", sa.String(length=100), nullable=False),
        sa.Column("version", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("validation_status IN ('valid', 'invalid', 'unanswered', 'error')", name="ck_evaluations_validation_status"),
        sa.CheckConstraint("validation_confidence IS NULL OR (validation_confidence >= 0 AND validation_confidence <= 1)", name="ck_evaluations_validation_confidence_range"),
        sa.CheckConstraint("semantic_similarity IS NULL OR (semantic_similarity >= 0 AND semantic_similarity <= 1)", name="ck_evaluations_similarity_range"),
        sa.CheckConstraint("concept_coverage IS NULL OR (concept_coverage >= 0 AND concept_coverage <= 1)", name="ck_evaluations_coverage_range"),
        sa.CheckConstraint("score >= 0", name="ck_evaluations_score_nonnegative"),
        sa.CheckConstraint("max_score > 0", name="ck_evaluations_max_score_positive"),
        sa.CheckConstraint("score <= max_score", name="ck_evaluations_score_within_max"),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id", name="uq_evaluations_answer"),
    )
    op.create_index("ix_evaluations_status_created", "evaluations", ["validation_status", "created_at"])
    op.create_index("ix_evaluations_method_version", "evaluations", ["method", "version"])


def downgrade() -> None:
    op.drop_index("ix_evaluations_method_version", table_name="evaluations")
    op.drop_index("ix_evaluations_status_created", table_name="evaluations")
    op.drop_table("evaluations")
    op.drop_index("ix_answers_viva_question", table_name="answers")
    op.drop_index("ix_answers_attempt", table_name="answers")
    op.drop_table("answers")
    op.drop_index("ix_attempts_student_viva", table_name="attempts")
    op.drop_index("ix_attempts_viva_status", table_name="attempts")
    op.drop_index("ix_attempts_student_created", table_name="attempts")
    op.drop_table("attempts")
    op.drop_index("ix_viva_assignments_viva_status", table_name="viva_assignments")
    op.drop_index("ix_viva_assignments_student_status", table_name="viva_assignments")
    op.drop_table("viva_assignments")
    op.drop_index("ix_viva_questions_viva_position", table_name="viva_questions")
    op.drop_table("viva_questions")
    op.drop_index("ix_vivas_status_availability", table_name="vivas")
    op.drop_index("ix_vivas_owner_status", table_name="vivas")
    op.drop_table("vivas")
    op.drop_index("ix_questions_subject_topic", table_name="questions")
    op.drop_index("ix_questions_owner_status", table_name="questions")
    op.drop_table("questions")
    op.drop_index("ix_users_role_active", table_name="users")
    op.drop_table("users")
