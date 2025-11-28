"""add_inventory_sync_alert_rule_type

Revision ID: 491487e0a946
Revises: 875526747bb6
Create Date: 2025-11-27 20:30:26.109071

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "491487e0a946"
down_revision = "875526747bb6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend business_rules.rule_type constraint to allow 'inventory_sync_alert'
    op.execute(
        """
        ALTER TABLE business_rules
        DROP CONSTRAINT IF EXISTS chk_business_rules_type
        """
    )
    op.execute(
        """
        ALTER TABLE business_rules
        ADD CONSTRAINT chk_business_rules_type
        CHECK (rule_type IN ('allocation', 'expiry_warning', 'kanban', 'inventory_sync_alert', 'other'))
        """
    )


def downgrade() -> None:
    # Revert to original constraint
    op.execute(
        """
        ALTER TABLE business_rules
        DROP CONSTRAINT IF EXISTS chk_business_rules_type
        """
    )
    op.execute(
        """
        ALTER TABLE business_rules
        ADD CONSTRAINT chk_business_rules_type
        CHECK (rule_type IN ('allocation', 'expiry_warning', 'kanban', 'other'))
        """
    )
