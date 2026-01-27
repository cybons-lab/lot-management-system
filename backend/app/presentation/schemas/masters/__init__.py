"""Masters schemas subpackage."""

from app.presentation.schemas.masters.customer_items_schema import *  # noqa: F403
from app.presentation.schemas.masters.masters_schema import *  # noqa: F403
from app.presentation.schemas.masters.product_groups_schema import *  # noqa: F403
from app.presentation.schemas.masters.product_suppliers_schema import *  # noqa: F403

# Note: products_schema.py is deprecated, use product_groups_schema.py instead
# The backward compatibility aliases are defined in product_groups_schema.py
from app.presentation.schemas.masters.warehouses_schema import *  # noqa: F403
