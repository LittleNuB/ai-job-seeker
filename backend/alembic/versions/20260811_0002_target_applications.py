"""add target applications

Revision ID: 20260811_0002
Revises: 20260503_0001
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa


revision = "20260811_0002"
down_revision = "20260503_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "target_applications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_json", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_target_applications_user_id",
        "target_applications",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_target_applications_user_id", table_name="target_applications")
    op.drop_table("target_applications")
