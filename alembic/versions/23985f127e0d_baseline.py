"""baseline

Revision ID: 23985f127e0d
Revises: 
Create Date: 2026-06-08 01:27:38.113059

"""
from typing import Sequence, Union

from alembic import op

from backend.database.orm_models import Base


# revision identifiers, used by Alembic.
revision: str = '23985f127e0d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    """Downgrade schema."""
    pass
