"""initial foundation

Revision ID: 5dabf48ed025
Revises: 
Create Date: 2026-09-12 23:51:01.897296
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '5dabf48ed025'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
