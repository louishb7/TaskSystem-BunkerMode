"""add indexes for soldier loads

Revision ID: 6f7a2c1d9b20
Revises: 23985f127e0d
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6f7a2c1d9b20"
down_revision: Union[str, None] = "23985f127e0d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "idx_missoes_prazo",
        "missoes",
        ["prazo"],
        if_not_exists=True,
        postgresql_where=sa.text("prazo IS NOT NULL"),
    )
    op.create_index(
        "idx_missao_contextos_responsavel_id",
        "missao_contextos",
        ["responsavel_id"],
        if_not_exists=True,
        postgresql_where=sa.text("responsavel_id IS NOT NULL"),
    )
    op.create_index(
        "idx_missao_contextos_operacao_dia",
        "missao_contextos",
        ["operacao_id", "operacao_dia"],
        unique=True,
        if_not_exists=True,
        postgresql_where=sa.text("operacao_id IS NOT NULL AND operacao_dia IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "idx_missao_contextos_operacao_dia",
        table_name="missao_contextos",
        if_exists=True,
    )
    op.drop_index(
        "idx_missao_contextos_responsavel_id",
        table_name="missao_contextos",
        if_exists=True,
    )
    op.drop_index("idx_missoes_prazo", table_name="missoes", if_exists=True)
