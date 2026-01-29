"""Utilities for handling soft-deleted master records in service layer.

Provides safe access to master attributes with fallback values for deleted records.
"""

from typing import Any


# Default fallback values for deleted masters
DELETED_FALLBACKS = {
    "product": {
        "name": "[削除済み製品]",
        "code": "",
    },
    "customer": {
        "name": "[削除済み得意先]",
        "code": "",
    },
    "supplier": {
        "name": "[削除済み仕入先]",
        "code": "",
    },
    "warehouse": {
        "name": "[削除済み倉庫]",
        "code": "",
    },
    "delivery_place": {
        "name": "[削除済み届け先]",
        "code": "",
    },
    "user": {
        "name": "[削除済みユーザー]",
        "code": "",
    },
}


def is_soft_deleted(obj: Any) -> bool:
    """Check if an object is soft-deleted.

    Args:
        obj: Object with optional is_soft_deleted property

    Returns:
        True if soft-deleted, False otherwise
    """
    if obj is None:
        return False
    return getattr(obj, "is_soft_deleted", False)


def get_master_attr(
    obj: Any,
    attr: str,
    default: Any = None,
    *,
    master_type: str | None = None,
    use_deleted_fallback: bool = True,
) -> Any:
    """Safely get attribute from a master object, with soft-delete handling.

    Args:
        obj: Master object (Product, Customer, etc.) or None
        attr: Attribute name to access
        default: Default value if obj is None or attr doesn't exist
        master_type: Type of master for deleted fallback (product, customer, etc.)
        use_deleted_fallback: If True, return fallback for deleted masters

    Returns:
        Attribute value, fallback value, or default
    """
    if obj is None:
        return default

    # Check if soft-deleted and use fallback
    if use_deleted_fallback and is_soft_deleted(obj):
        if master_type and master_type in DELETED_FALLBACKS:
            fallbacks = DELETED_FALLBACKS[master_type]
            # Map common attribute patterns to fallback keys
            if "name" in attr.lower():
                return fallbacks.get("name", default)
            if "code" in attr.lower():
                return fallbacks.get("code", default)

    return getattr(obj, attr, default)


def get_product_name(product: Any, default: str = "") -> str:
    """Get product name with soft-delete handling."""
    # Phase 2 compatibility: Try display_name first, then product_name
    for attr in ["display_name", "product_name"]:
        val = get_master_attr(product, attr, None, master_type="product")
        if val is not None:
            return str(val)
    return default


def get_product_code(product: Any, default: str = "") -> str:
    """Get product code with soft-delete handling."""
    # Phase 2 compatibility: Try maker_part_no, maker_part_code, product_code
    for attr in ["maker_part_no", "maker_part_code", "product_code"]:
        val = get_master_attr(product, attr, None, master_type="product")
        if val is not None:
            return str(val)
    return default


def get_customer_name(customer: Any, default: str = "") -> str:
    """Get customer name with soft-delete handling."""
    return str(get_master_attr(customer, "customer_name", default, master_type="customer"))


def get_customer_code(customer: Any, default: str = "") -> str:
    """Get customer code with soft-delete handling."""
    return str(get_master_attr(customer, "customer_code", default, master_type="customer"))


def get_supplier_name(supplier: Any, default: str = "") -> str:
    """Get supplier name with soft-delete handling."""
    return str(get_master_attr(supplier, "supplier_name", default, master_type="supplier"))


def get_supplier_code(supplier: Any, default: str = "") -> str:
    """Get supplier code with soft-delete handling."""
    return str(get_master_attr(supplier, "supplier_code", default, master_type="supplier"))


def get_warehouse_name(warehouse: Any, default: str = "") -> str:
    """Get warehouse name with soft-delete handling."""
    return str(get_master_attr(warehouse, "warehouse_name", default, master_type="warehouse"))


def get_warehouse_code(warehouse: Any, default: str = "") -> str:
    """Get warehouse code with soft-delete handling."""
    return str(get_master_attr(warehouse, "warehouse_code", default, master_type="warehouse"))


def get_delivery_place_name(delivery_place: Any, default: str = "") -> str:
    """Get delivery place name with soft-delete handling."""
    return str(
        get_master_attr(
            delivery_place, "delivery_place_name", default, master_type="delivery_place"
        )
    )


def get_delivery_place_code(delivery_place: Any, default: str = "") -> str:
    """Get delivery place code with soft-delete handling."""
    return str(
        get_master_attr(
            delivery_place, "delivery_place_code", default, master_type="delivery_place"
        )
    )
