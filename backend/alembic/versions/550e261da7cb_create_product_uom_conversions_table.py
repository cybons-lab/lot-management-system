"""create_product_uom_conversions_table

Revision ID: 550e261da7cb
Revises: 2dca571dcd33
Create Date: 2025-11-23 07:42:42.537975

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '550e261da7cb'
down_revision = '2dca571dcd33'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE product_uom_conversions (
            conversion_id BIGSERIAL PRIMARY KEY,
            product_id BIGINT NOT NULL,
            external_unit VARCHAR(20) NOT NULL,
            factor DECIMAL(15,3) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_uom_conversions_product FOREIGN KEY (product_id) 
                REFERENCES products(id) ON DELETE CASCADE,
            CONSTRAINT uq_uom_conversions_product_unit UNIQUE (product_id, external_unit)
        );
    """)


def downgrade() -> None:
    op.drop_table('product_uom_conversions')
