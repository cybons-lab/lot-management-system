"""Business rules service (業務ルールサービス)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.logs_models import BusinessRule
from app.schemas.system.business_rules_schema import BusinessRuleCreate, BusinessRuleUpdate


class BusinessRuleService:
    """Service for business rules (業務ルール)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        rule_type: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[BusinessRule], int]:
        """
        Get all business rules with filtering and pagination.

        Returns:
            tuple: (list of rules, total count)
        """
        query = self.db.query(BusinessRule)

        # Apply filters
        if rule_type:
            query = query.filter(BusinessRule.rule_type == rule_type)

        if is_active is not None:
            query = query.filter(BusinessRule.is_active == is_active)

        # Get total count
        total = query.count()

        # Apply pagination and order
        rules = query.order_by(BusinessRule.rule_code).offset(skip).limit(limit).all()

        return rules, total

    def get_by_id(self, rule_id: int) -> BusinessRule | None:
        """Get business rule by ID."""
        return self.db.query(BusinessRule).filter(BusinessRule.rule_id == rule_id).first()

    def get_by_code(self, rule_code: str) -> BusinessRule | None:
        """Get business rule by code."""
        return self.db.query(BusinessRule).filter(BusinessRule.rule_code == rule_code).first()

    def create(self, rule: BusinessRuleCreate) -> BusinessRule:
        """Create a new business rule."""
        db_rule = BusinessRule(**rule.model_dump())
        self.db.add(db_rule)
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule

    def update(self, rule_id: int, rule: BusinessRuleUpdate) -> BusinessRule | None:
        """Update an existing business rule."""
        db_rule = self.get_by_id(rule_id)
        if not db_rule:
            return None

        update_data = rule.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(db_rule, key, value)

        db_rule.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule

    def update_by_code(self, rule_code: str, rule: BusinessRuleUpdate) -> BusinessRule | None:
        """Update an existing business rule by code."""
        db_rule = self.get_by_code(rule_code)
        if not db_rule:
            return None

        update_data = rule.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(db_rule, key, value)

        db_rule.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule

    def delete(self, rule_id: int) -> bool:
        """Delete a business rule (hard delete)."""
        db_rule = self.get_by_id(rule_id)
        if not db_rule:
            return False

        self.db.delete(db_rule)
        self.db.commit()
        return True

    def toggle_active(self, rule_id: int) -> BusinessRule | None:
        """Toggle the active status of a business rule."""
        db_rule = self.get_by_id(rule_id)
        if not db_rule:
            return None

        db_rule.is_active = not db_rule.is_active
        db_rule.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule
