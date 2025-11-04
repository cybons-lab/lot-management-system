# backend/app/api/routes/orders_refactored.py
"""
受注エンドポイント
I/O整形とHTTP例外変換のみを責務とする
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderDomainError,
    OrderLineNotFoundError,
    OrderNotFoundError,
    OrderValidationError,
)
from app.schemas import (
    OrderCreate,
    OrderResponse,
    OrderUpdate,
    OrderWithLinesResponse,
)
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_code: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """受注一覧取得"""
    service = OrderService(db)
    
    try:
        orders = service.get_orders(
            skip=skip,
            limit=limit,
            status=status,
            customer_code=customer_code,
            date_from=date_from,
            date_to=date_to
        )
        return orders
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    """受注詳細取得(明細含む)"""
    service = OrderService(db)
    
    try:
        order = service.get_order_detail(order_id)
        return order
    
    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("", response_model=OrderWithLinesResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    """受注作成"""
    service = OrderService(db)
    
    try:
        new_order = service.create_order(order)
        
        db.commit()
        
        return new_order
    
    except DuplicateOrderError as e:
        db.rollback()
        # ✅ 409 Conflictを返す
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message
        )
    
    except OrderValidationError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message
        )
    
    except OrderDomainError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    request: dict,
    db: Session = Depends(get_db)
):
    """受注ステータス更新"""
    service = OrderService(db)
    
    try:
        new_status = request.get("status")
        if not new_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="status フィールドは必須です"
            )
        
        updated_order = service.update_order_status(order_id, new_status)
        
        db.commit()
        
        return updated_order
    
    except OrderNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    
    except InvalidOrderStatusError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    except OrderDomainError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/{order_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    """受注キャンセル"""
    service = OrderService(db)
    
    try:
        service.cancel_order(order_id)
        
        db.commit()
        
        return None
    
    except OrderNotFoundError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    
    except InvalidOrderStatusError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    except OrderDomainError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
