"""add writing preference profile

Revision ID: 20260815_0004
Revises: 20260814_0003
Create Date: 2026-08-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260815_0004"
down_revision = "20260814_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "writing_preference_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("profile_version", sa.String(length=80), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("source", sa.String(length=24), nullable=False),
        sa.Column("sentence_length", sa.String(length=24), nullable=False),
        sa.Column("information_density", sa.String(length=24), nullable=False),
        sa.Column("technical_detail", sa.String(length=24), nullable=False),
        sa.Column("result_placement", sa.String(length=24), nullable=False),
        sa.Column("learned_from_saved_edits", sa.Integer(), nullable=False),
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
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "writing_preference_edit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("application_id", sa.String(length=36), nullable=False),
        sa.Column("claim_id", sa.String(length=36), nullable=False),
        sa.Column("learned_dimensions_json", sa.Text(), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["target_applications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "fingerprint",
            name="uq_writing_preference_event_fingerprint",
        ),
    )
    op.create_index(
        "ix_writing_preference_edit_events_application_id",
        "writing_preference_edit_events",
        ["application_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_writing_preference_edit_events_application_id",
        table_name="writing_preference_edit_events",
    )
    op.drop_table("writing_preference_edit_events")
    op.drop_table("writing_preference_profiles")
