# backend/app/api/routes/receipts.py
"""
入荷管理のAPIエンドポイント
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.api.deps import get_db
from app.models import (
    ReceiptHeader,
    ReceiptLine,
    Lot,
    LotCurrentStock,
    Product,
    StockMovement,
    StockMovementReason,
    Supplier,
    Warehouse,
)
from app.schemas import (
    ReceiptCreateRequest, ReceiptResponse, ReceiptHeaderResponse,
    ReceiptLineResponse
)

router = APIRouter(prefix="/receipts", tags=["receipts"])


@router.get("", response_model=List[ReceiptHeaderResponse])
def list_receipts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """入荷伝票一覧取得"""
    receipts = db.query(ReceiptHeader).order_by(
        ReceiptHeader.receipt_date.desc()
    ).offset(skip).limit(limit).all()
    return receipts


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db)
):
    """入荷伝票詳細取得(明細含む)"""
    receipt = db.query(ReceiptHeader).filter(ReceiptHeader.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="入荷伝票が見つかりません")
    return receipt


@router.post("", response_model=ReceiptResponse, status_code=201)
def create_receipt(
    receipt: ReceiptCreateRequest,
    db: Session = Depends(get_db)
):
    """
    入荷伝票作成(一括登録)
    
    処理フロー:
    1. 入荷ヘッダ作成
    2. 各明細について:
       - 入荷明細作成
       - 在庫変動(receipt)記録
       - 現在在庫更新
    """
    # 重複チェック
    existing = db.query(ReceiptHeader).filter(
        ReceiptHeader.receipt_no == receipt.receipt_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="入荷伝票番号が既に存在します")
    
    # マスタ存在チェック
    supplier = db.query(Supplier).filter(
        Supplier.supplier_code == receipt.supplier_code
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="仕入先が見つかりません")
    
    warehouse = db.query(Warehouse).filter(
        Warehouse.warehouse_code == receipt.warehouse_code
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="倉庫が見つかりません")
    
    # ヘッダ作成
    db_header = ReceiptHeader(
        receipt_no=receipt.receipt_no,
        supplier_code=receipt.supplier_code,
        warehouse_code=receipt.warehouse_code,
        receipt_date=receipt.receipt_date,
        created_by=receipt.created_by,
        notes=receipt.notes,
    )
    db.add(db_header)
    db.flush()
    
    # 明細作成
    for line in receipt.lines:
        # 製品チェック
        product = db.query(Product).filter(
            Product.product_code == line.product_code
        ).first()
        if not product:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail=f"製品コード '{line.product_code}' が見つかりません"
            )
        
        # ロットチェック (lot_id または lot_number)
        lot_id = line.lot_id
        lot = None
        if lot_id is not None:
            lot = db.query(Lot).filter(Lot.id == lot_id).first()
        else:
            lot_number = getattr(line, "lot_number", None)
            if lot_number:
                lot = (
                    db.query(Lot)
                    .filter(
                        Lot.product_code == line.product_code,
                        Lot.lot_number == lot_number,
                    )
                    .first()
                )
                if lot:
                    lot_id = lot.id

        if not lot or lot_id is None:
            db.rollback()
            identifier = (
                f"ロット番号 '{getattr(line, 'lot_number', None)}'"
                if getattr(line, "lot_number", None)
                else f"ロットID {line.lot_id}"
            )
            raise HTTPException(
                status_code=404,
                detail=f"{identifier} が見つかりません",
            )

        # 入荷明細作成
        db_line = ReceiptLine(
            header_id=db_header.id,
            line_no=line.line_no,
            product_code=line.product_code,
            lot_id=lot_id,
            quantity=line.quantity,
            unit=line.unit,
            notes=line.notes,
        )
        db.add(db_line)
        db.flush()

        # 在庫変動記録(受入)
        warehouse_id = lot.warehouse_id or lot.warehouse_code
        if not warehouse_id:
            fallback_warehouse = db.query(Warehouse).first()
            warehouse_id = (
                fallback_warehouse.warehouse_code if fallback_warehouse else "WH-DEFAULT"
            )
        movement = StockMovement(
            product_id=line.product_code,
            warehouse_id=warehouse_id,
            lot_id=lot_id,
            quantity_delta=line.quantity,
            reason=StockMovementReason.RECEIPT,
            source_table="receipt_lines",
            source_id=db_line.id,
            batch_id=f"receipt_{db_header.id}",
            created_by=db_header.created_by or "system",
        )
        db.add(movement)

        # 現在在庫更新
        current_stock = db.query(LotCurrentStock).filter(
            LotCurrentStock.lot_id == lot_id
        ).first()

        if current_stock:
            current_stock.current_quantity += line.quantity
            current_stock.last_updated = datetime.now()
        else:
            current_stock = LotCurrentStock(
                lot_id=lot_id,
                current_quantity=line.quantity
            )
            db.add(current_stock)
    
    db.commit()
    db.refresh(db_header)
    return db_header


@router.delete("/{receipt_id}", status_code=204)
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db)
):
    """
    入荷伝票削除
    
    注意: CASCADE削除により明細も削除されるが、
    在庫変動は手動で逆仕訳する必要がある
    """
    receipt = db.query(ReceiptHeader).filter(ReceiptHeader.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="入荷伝票が見つかりません")
    
    # 在庫逆仕訳(簡易実装)
    # 実運用では在庫変動を取り消す処理が必要
    for line in receipt.lines:
        # 在庫変動取消(マイナス)
        lot_obj = line.lot if hasattr(line, "lot") else None
        warehouse_id = (
            lot_obj.warehouse_id if lot_obj else receipt.warehouse_code
        )
        if not warehouse_id:
            fallback_warehouse = db.query(Warehouse).first()
            warehouse_id = (
                fallback_warehouse.warehouse_code if fallback_warehouse else "WH-DEFAULT"
            )
        movement = StockMovement(
            product_id=line.product_code,
            warehouse_id=warehouse_id,
            lot_id=line.lot_id,
            quantity_delta=-line.quantity,
            reason=StockMovementReason.ADJUSTMENT,
            source_table="receipt_lines",
            source_id=line.id,
            batch_id=f"cancel_receipt_{receipt_id}",
            created_by=receipt.created_by or "system",
        )
        db.add(movement)
        
        # 現在在庫更新
        current_stock = db.query(LotCurrentStock).filter(
            LotCurrentStock.lot_id == line.lot_id
        ).first()
        if current_stock:
            current_stock.current_quantity -= line.quantity
            current_stock.last_updated = datetime.now()
    
    db.delete(receipt)
    db.commit()
    return None
