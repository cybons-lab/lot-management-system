"""add system settings for maintenance log page dict

Revision ID: 85aaf971a93f
Revises: 7b2ae6b36a5b
Create Date: 2026-01-26 21:16:48.041483

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "85aaf971a93f"
down_revision = "7b2ae6b36a5b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insert default values for new settings
    op.execute(
        """
        INSERT INTO system_configs (config_key, config_value, description)
        VALUES 
        ('maintenance_mode', 'false', 'メンテナンスモード（true: 有効, false: 無効）'),
        ('log_level', 'INFO', 'ログレベル（DEBUG, INFO, WARNING, ERROR）'),
        ('page_visibility', '{"inventory": {"guest": true, "user": true}, "forecasts": {"guest": true, "user": true}, "masters": {"guest": false, "user": false}}', 'ページ表示制御（機能ごとのロール別表示設定）')
        ON CONFLICT (config_key) DO NOTHING;
        """
    )


def downgrade() -> None:
    # Remove added settings
    op.execute(
        """
        DELETE FROM system_configs 
        WHERE config_key IN ('maintenance_mode', 'log_level', 'page_visibility');
        """
    )
