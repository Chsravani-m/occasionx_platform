"""provider registration order id

Revision ID: 0002_registration_order_id
Revises: 0001_baseline
Create Date: 2026-10-13 22:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002_registration_order_id'
down_revision: Union[str, Sequence[str], None] = '0001_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'providers',
        sa.Column('registration_order_id', sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('providers', 'registration_order_id')
