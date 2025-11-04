# backend/app/domain/order/business_rules.py
"""
受注ドメインのビジネスルール
"""

from datetime import date
from typing import Optional

from .exceptions import OrderValidationError


class OrderBusinessRules:
    """受注のビジネスルール"""
    
    @staticmethod
    def validate_order_no(order_no: str) -> None:
        """
        受注番号のバリデーション
        
        Args:
            order_no: 受注番号
            
        Raises:
            OrderValidationError: バリデーションエラー
        """
        if not order_no or not order_no.strip():
            raise OrderValidationError("Order number is required")
        
        if len(order_no) > 50:
            raise OrderValidationError("Order number is too long (max 50 characters)")
    
    @staticmethod
    def validate_quantity(quantity: float, product_code: str) -> None:
        """
        数量のバリデーション
        
        Args:
            quantity: 数量
            product_code: 製品コード
            
        Raises:
            OrderValidationError: バリデーションエラー
        """
        if quantity <= 0:
            raise OrderValidationError(
                f"Quantity must be positive for product {product_code}: {quantity}"
            )
    
    @staticmethod
    def validate_due_date(due_date: Optional[date], order_date: date) -> None:
        """
        納期のバリデーション
        
        Args:
            due_date: 納期
            order_date: 受注日
            
        Raises:
            OrderValidationError: バリデーションエラー
        """
        if due_date and due_date < order_date:
            raise OrderValidationError(
                f"Due date {due_date} cannot be earlier than order date {order_date}"
            )
    
    @staticmethod
    def calculate_progress_percentage(
        total_qty: float,
        allocated_qty: float
    ) -> float:
        """
        進捗率を計算
        
        Args:
            total_qty: 総数量
            allocated_qty: 引当済み数量
            
        Returns:
            進捗率（0-100%）
        """
        if total_qty <= 0:
            return 0.0
        
        progress = (allocated_qty / total_qty) * 100
        return min(100.0, max(0.0, progress))
