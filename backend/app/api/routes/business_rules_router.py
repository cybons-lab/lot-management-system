"""Business rules router (業務ルールAPI)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.business_rules_schema import (
    BusinessRuleCreate,
    BusinessRuleListResponse,
    BusinessRuleResponse,
    BusinessRuleUpdate,
)
from app.services.business_rules_service import BusinessRuleService


router = APIRouter(prefix="/business-rules", tags=["business-rules"])


@router.get("", response_model=BusinessRuleListResponse)
def list_business_rules(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    rule_type: str | None = Query(None, description="ルール種別でフィルタ"),
    is_active: bool | None = Query(None, description="有効フラグでフィルタ"),
    db: Session = Depends(get_db),
):
    """
    業務ルール一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        rule_type: ルール種別でフィルタ（オプション）
        is_active: 有効フラグでフィルタ（オプション）
        db: データベースセッション

    Returns:
        業務ルールのリスト
    """
    service = BusinessRuleService(db)
    rules, total = service.get_all(skip=skip, limit=limit, rule_type=rule_type, is_active=is_active)

    return BusinessRuleListResponse(
        rules=[BusinessRuleResponse.model_validate(rule) for rule in rules],
        total=total,
    )


@router.get("/{rule_id}", response_model=BusinessRuleResponse)
def get_business_rule(rule_id: int, db: Session = Depends(get_db)):
    """
    業務ルール詳細取得（ID指定）.

    Args:
        rule_id: ルールID
        db: データベースセッション

    Returns:
        業務ルール詳細

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    rule = service.get_by_id(rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return BusinessRuleResponse.model_validate(rule)


@router.get("/code/{rule_code}", response_model=BusinessRuleResponse)
def get_business_rule_by_code(rule_code: str, db: Session = Depends(get_db)):
    """
    業務ルール詳細取得（コード指定）.

    Args:
        rule_code: ルールコード
        db: データベースセッション

    Returns:
        業務ルール詳細

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    rule = service.get_by_code(rule_code)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return BusinessRuleResponse.model_validate(rule)


@router.post("", response_model=BusinessRuleResponse, status_code=status.HTTP_201_CREATED)
def create_business_rule(rule: BusinessRuleCreate, db: Session = Depends(get_db)):
    """
    業務ルール作成.

    Args:
        rule: 作成する業務ルール情報
        db: データベースセッション

    Returns:
        作成された業務ルール

    Raises:
        HTTPException: ルールコードが重複している場合
    """
    service = BusinessRuleService(db)

    # Check for duplicate rule_code
    existing_rule = service.get_by_code(rule.rule_code)
    if existing_rule:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Business rule with code '{rule.rule_code}' already exists",
        )

    created_rule = service.create(rule)
    return BusinessRuleResponse.model_validate(created_rule)


@router.put("/{rule_id}", response_model=BusinessRuleResponse)
def update_business_rule(
    rule_id: int,
    rule: BusinessRuleUpdate,
    db: Session = Depends(get_db),
):
    """
    業務ルール更新（ID指定）.

    Args:
        rule_id: ルールID
        rule: 更新する業務ルール情報
        db: データベースセッション

    Returns:
        更新された業務ルール

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    updated_rule = service.update(rule_id, rule)
    if not updated_rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return BusinessRuleResponse.model_validate(updated_rule)


@router.put("/code/{rule_code}", response_model=BusinessRuleResponse)
def update_business_rule_by_code(
    rule_code: str,
    rule: BusinessRuleUpdate,
    db: Session = Depends(get_db),
):
    """
    業務ルール更新（コード指定）.

    Args:
        rule_code: ルールコード
        rule: 更新する業務ルール情報
        db: データベースセッション

    Returns:
        更新された業務ルール

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    updated_rule = service.update_by_code(rule_code, rule)
    if not updated_rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return BusinessRuleResponse.model_validate(updated_rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_rule(rule_id: int, db: Session = Depends(get_db)):
    """
    業務ルール削除.

    Args:
        rule_id: ルールID
        db: データベースセッション

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    deleted = service.delete(rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return None


@router.patch("/{rule_id}/toggle", response_model=BusinessRuleResponse)
def toggle_business_rule_active(rule_id: int, db: Session = Depends(get_db)):
    """
    業務ルール有効/無効切り替え.

    Args:
        rule_id: ルールID
        db: データベースセッション

    Returns:
        更新された業務ルール

    Raises:
        HTTPException: ルールが存在しない場合
    """
    service = BusinessRuleService(db)
    updated_rule = service.toggle_active(rule_id)
    if not updated_rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business rule not found")

    return BusinessRuleResponse.model_validate(updated_rule)
