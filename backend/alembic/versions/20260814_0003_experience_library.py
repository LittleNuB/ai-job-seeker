"""add experience library

Revision ID: 20260814_0003
Revises: 20260811_0002
Create Date: 2026-08-14
"""

from alembic import op
import sqlalchemy as sa


revision = "20260814_0003"
down_revision = "20260811_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experience_library_entries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("organization", sa.String(length=240), nullable=False),
        sa.Column("role", sa.String(length=240), nullable=False),
        sa.Column("date_range", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experience_library_entries_user_id", "experience_library_entries", ["user_id"])

    op.create_table(
        "experience_library_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("entry_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["entry_id"], ["experience_library_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experience_library_items_entry_id", "experience_library_items", ["entry_id"])
    op.create_index("ix_experience_library_items_user_id", "experience_library_items", ["user_id"])

    op.create_table(
        "experience_library_base_facts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("item_id", sa.String(length=36), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source_location", sa.String(length=320), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["experience_library_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experience_library_base_facts_item_id", "experience_library_base_facts", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_experience_library_base_facts_item_id", table_name="experience_library_base_facts")
    op.drop_table("experience_library_base_facts")
    op.drop_index("ix_experience_library_items_user_id", table_name="experience_library_items")
    op.drop_index("ix_experience_library_items_entry_id", table_name="experience_library_items")
    op.drop_table("experience_library_items")
    op.drop_index("ix_experience_library_entries_user_id", table_name="experience_library_entries")
    op.drop_table("experience_library_entries")
