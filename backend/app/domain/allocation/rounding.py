# backend/app/domain/allocation/rounding.py
"""
数量丸めポリシー
既存の丸めロジックを再現し、挙動を変更しない
"""

from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from enum import Enum


class RoundingMode(Enum):
    """丸めモード"""
    CEIL = "CEIL"              # 切り上げ
    FLOOR = "FLOOR"            # 切り捨て
    ROUND_HALF_UP = "HALF_UP"  # 四捨五入


class RoundingPolicy:
    """数量丸めポリシー"""
    
    @staticmethod
    def round_quantity(
        value: float,
        mode: RoundingMode = RoundingMode.ROUND_HALF_UP,
        precision: int = 2
    ) -> float:
        """
        数量を指定されたモードで丸める
        
        Args:
            value: 丸める値
            mode: 丸めモード
            precision: 小数点以下の桁数
            
        Returns:
            丸められた値
        """
        if value is None:
            return 0.0
            
        decimal_value = Decimal(str(value))
        
        if mode == RoundingMode.CEIL:
            rounded = decimal_value.quantize(
                Decimal(10) ** -precision,
                rounding=ROUND_CEILING
            )
        elif mode == RoundingMode.FLOOR:
            rounded = decimal_value.quantize(
                Decimal(10) ** -precision,
                rounding=ROUND_FLOOR
            )
        else:  # ROUND_HALF_UP
            rounded = decimal_value.quantize(
                Decimal(10) ** -precision,
                rounding=ROUND_HALF_UP
            )
        
        return float(rounded)
    
    @classmethod
    def round_allocation_qty(cls, qty: float) -> float:
        """
        引当数量の丸め（既存挙動を再現）
        デフォルト: 四捨五入、小数点以下2桁
        """
        return cls.round_quantity(qty, RoundingMode.ROUND_HALF_UP, precision=2)
    
    @classmethod
    def round_stock_qty(cls, qty: float) -> float:
        """
        在庫数量の丸め（既存挙動を再現）
        デフォルト: 四捨五入、小数点以下2桁
        """
        return cls.round_quantity(qty, RoundingMode.ROUND_HALF_UP, precision=2)
