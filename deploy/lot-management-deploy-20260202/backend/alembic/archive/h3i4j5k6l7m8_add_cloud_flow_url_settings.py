"""add_cloud_flow_url_settings

Revision ID: h3i4j5k6l7m8
Revises: 7a50c98d743e
Create Date: 2025-12-21

Power Automate Cloud Flow URLなどのシステム設定を初期投入。
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "h3i4j5k6l7m8"
down_revision = "7a50c98d743e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """初期設定データを投入."""
    op.execute(
        """
        INSERT INTO system_configs (config_key, config_value, description, created_at, updated_at)
        VALUES
            ('cloud_flow_url_material_delivery', '', 'Power Automate Cloud Flow URL: 素材納品書発行', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('cloud_flow_url_progress_download', '', 'Power Automate Cloud Flow URL: 進度実績ダウンロード', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (config_key) DO NOTHING
        """
    )


def downgrade() -> None:
    """設定データを削除."""
    op.execute(
        """
        DELETE FROM system_configs
        WHERE config_key IN ('cloud_flow_url_material_delivery', 'cloud_flow_url_progress_download')
        """
    )
