"""Authentication and authorization models (ユーザー・ロール管理).

DDL: users, roles, user_roles
All models strictly follow the DDL v2.2 (lot_management_ddl_v2_2_id.sql).

【設計意図】認証・認可モデルの設計判断:

1. なぜ auth_provider を持つのか（L47-49）
   理由: 複数の認証プロバイダーをサポート
   背景:
   - ローカル認証: username + password_hash（開発・テスト用）
   - Azure AD: azure_object_id（本番環境用）
   → 認証方式を切り替え可能にする
   実装:
   - auth_provider: "local" | "azure_ad"
   - password_hash: local 認証時のみ使用
   - azure_object_id: Azure AD 認証時のみ使用
   業務影響:
   - 本番環境: Azure AD で社内ユーザー認証
   - 開発環境: ローカル認証で簡易テスト

2. なぜ azure_object_id をユニークにするのか（L50, L67）
   理由: Azure AD ユーザーの一意性を保証
   背景:
   - Azure AD: object_id でユーザーを一意に識別
   - 例: 同じメールアドレスでも、object_id は異なる
   → object_id をユニークキーにする
   実装:
   - unique=True: データベースレベルで一意性を保証
   - UniqueConstraint("azure_object_id", name="uq_users_azure_object_id")
   業務影響:
   - Azure AD との連携時に、同じユーザーを重複登録しない

3. なぜ partial index を使うのか（L69-73）
   理由: アクティブユーザーのみをインデックス化
   背景:
   - is_active = TRUE のユーザーのみが検索対象
   - 退職者（is_active = FALSE）は検索不要
   → アクティブユーザーのみにインデックスを作成
   実装:
   - postgresql_where=text("is_active = TRUE")
   → アクティブユーザーのみがインデックスに含まれる
   メリット:
   - インデックスサイズの削減（退職者を含まない）
   - 検索パフォーマンスの向上

4. なぜ User と Role の多対多関係にするのか
   理由: 柔軟なロール割り当て
   業務的背景:
   - ユーザーA: 営業 + 管理者
   - ユーザーB: 営業のみ
   → 1ユーザーに複数のロールを割り当て可能
   実装:
   - UserRole: User と Role の中間テーブル
   → 多対多の関係を実現
   業務影響:
   - 営業担当者が管理者権限も持つケースに対応

5. なぜ CASCADE="all, delete-orphan" を使うのか（L77-79, L108-110）
   理由: ユーザー削除時にロール関連も削除
   背景:
   - User 削除時に、UserRole も削除すべき
   → ロール関連だけが残ると、データ不整合
   実装:
   - cascade="all, delete-orphan"
   → User を削除すると、関連する UserRole も自動削除
   業務影響:
   - 退職者の削除時に、ロール関連も一括削除

6. なぜ ondelete="CASCADE" を使うのか（L125-127, L130-132）
   理由: 親削除時に子も削除
   背景:
   - User 削除時に、UserRole も削除すべき
   - Role 削除時に、UserRole も削除すべき
   → データベースレベルで削除伝播
   実装:
   - ondelete="CASCADE": データベース側で削除を伝播
   → SQLAlchemy の cascade とDBレベルのCASCADEの両方を設定
   メリット:
   - データベース側でも整合性を保証（アプリケーション以外からの削除にも対応）

7. なぜ username と email を両方ユニークにするのか（L63-64）
   理由: ビジネスキーの一意性を保証
   背景:
   - username: ログインID（例: "yamada_taro"）
   - email: メールアドレス（例: "yamada@example.com"）
   → 両方とも一意であるべき
   実装:
   - UniqueConstraint("username", name="uq_users_username")
   - UniqueConstraint("email", name="uq_users_email")
   業務影響:
   - 同じ username で複数のユーザーを作成できない
   - 同じ email で複数のユーザーを作成できない

8. なぜ UserRole に assigned_at があるのか（L135-137）
   理由: ロール割り当て日時の記録
   用途:
   - 監査ログ: 「いつ、誰がロールを割り当てたか」を追跡
   - コンプライアンス: 権限変更の履歴を記録
   実装:
   - assigned_at: ロール割り当て日時
   → server_default=func.current_timestamp()
   業務影響:
   - 「ユーザーAが管理者権限を取得した日時」を記録

9. なぜ last_login_at があるのか（L54）
   理由: 最終ログイン日時の記録
   用途:
   - セキュリティ: 長期間ログインしていないユーザーを検出
   - 退職者の検出: 3ヶ月以上ログインなし → 退職者の可能性
   実装:
   - last_login_at: 最終ログイン日時（Nullable）
   → 初回ログイン前は NULL
   業務影響:
   - 休眠ユーザーの自動無効化（セキュリティポリシー）

10. なぜ display_name を持つのか（L52）
    理由: ユーザー表示名の管理
    背景:
    - username: ログインID（英数字）
    - display_name: 画面表示名（日本語）
    → UI での表示は display_name を使用
    実装:
    - display_name: "山田 太郎"
    - username: "yamada_taro"
    用途:
    - フロントエンドでの表示: 「ようこそ、山田 太郎さん」
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


# For type checking only
if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .assignments.assignment_models import UserSupplierAssignment


class User(Base):
    """Users master table (ユーザーマスタ).

    DDL: users
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", name="uq_users_username"),
        UniqueConstraint("email", name="uq_users_email"),
        Index("idx_users_username", "username"),
        Index("idx_users_email", "email"),
        UniqueConstraint("azure_object_id", name="uq_users_azure_object_id"),
        Index("idx_users_auth_provider", "auth_provider"),
        Index(
            "idx_users_active",
            "is_active",
            postgresql_where=text("is_active = TRUE"),
        ),
        {"comment": "ユーザーマスタ：システムユーザー情報を管理"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment="ID（主キー）")
    username: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="ユーザー名（ログインID、ユニーク）"
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="メールアドレス（ユニーク）"
    )
    # Auth fields
    auth_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default=text("'local'"),
        comment="認証プロバイダ（local/azure等）",
    )
    azure_object_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, comment="Azure AD オブジェクトID（ユニーク）"
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="パスワードハッシュ"
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="表示名")
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true"), comment="アクティブフラグ"
    )
    is_system_user: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        comment="システムユーザーフラグ（guest/admin等、削除不可）",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="最終ログイン日時"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), comment="作成日時"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), comment="更新日時"
    )

    # Relationships
    user_roles: Mapped[list[UserRole]] = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    supplier_assignments: Mapped[list[UserSupplierAssignment]] = relationship(
        "UserSupplierAssignment", back_populates="user", cascade="all, delete-orphan"
    )


class Role(Base):
    """Roles master table (ロールマスタ).

    DDL: roles
    Primary key: id (BIGSERIAL)
    """

    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("role_code", name="uq_roles_role_code"),
        {"comment": "ロールマスタ：システムロール（権限グループ）を管理"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment="ID（主キー）")
    role_code: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="ロールコード（admin/user/guest等、ユニーク）"
    )
    role_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="ロール名")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="説明")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), comment="作成日時"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), comment="更新日時"
    )

    # Relationships
    user_roles: Mapped[list[UserRole]] = relationship(
        "UserRole", back_populates="role", cascade="all, delete-orphan"
    )


class UserRole(Base):
    """User-role association table (ユーザーロール関連).

    DDL: user_roles
    Primary key: (user_id, role_id)
    Foreign keys: user_id -> users(id), role_id -> roles(id)
    """

    __tablename__ = "user_roles"
    __table_args__ = (
        Index("idx_user_roles_user", "user_id"),
        Index("idx_user_roles_role", "role_id"),
        {"comment": "ユーザー-ロール関連：ユーザーとロールの多対多関連を管理"},
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        comment="ユーザーID（複合PK）",
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        comment="ロールID（複合PK）",
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), comment="割り当て日時"
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="user_roles")
    role: Mapped[Role] = relationship("Role", back_populates="user_roles")
