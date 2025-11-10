"""Products API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.common_schema import Page, PageQuery
from app.schemas.products_schema import ProductCreate, ProductOut, ProductUpdate
from app.services.products_service import ProductService


router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=Page[ProductOut])
def list_products(
    params: Annotated[PageQuery, Depends()],
    session: Session = Depends(get_db),
) -> Page[ProductOut]:
    """List products with pagination and optional fuzzy search."""
    service = ProductService(session)
    items, total = service.list_products(page=params.page, per_page=params.per_page, q=params.q)
    return Page[ProductOut](
        items=items,
        total=total,
        page=params.page,
        per_page=params.per_page,
    )


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, session: Session = Depends(get_db)) -> ProductOut:
    """Retrieve a single product."""
    service = ProductService(session)
    return service.get_product(product_id)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    session: Session = Depends(get_db),
) -> ProductOut:
    """Create a new product."""
    service = ProductService(session)
    return service.create_product(payload)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    session: Session = Depends(get_db),
) -> ProductOut:
    """Partially update a product."""
    service = ProductService(session)
    return service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, session: Session = Depends(get_db)) -> Response:
    """Delete a product."""
    service = ProductService(session)
    service.delete_product(product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
