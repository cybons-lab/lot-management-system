"""Authentication service with JWT token management.

【設計意図】認証サービスの設計判断:

1. なぜ JWT（JSON Web Token）を使うのか（L41-50）
   理由: ステートレスな認証機構
   背景:
   - セッションベース認証: サーバー側でセッション情報を保持 → スケールアウト困難
   - JWT: トークン内に認証情報を含める → サーバー側でセッション不要
   メリット:
   - 複数サーバーで認証情報を共有可能（Redis 不要）
   - マイクロサービス間での認証連携が容易
   実装:
   - jose.jwt.encode(): ペイロードを署名して JWT トークン生成
   - settings.secret_key: 署名鍵（環境変数で管理）

2. なぜ有効期限を設定するのか（L44-47）
   理由: トークン盗難時のリスク低減
   問題:
   - 有効期限なし: トークンが一度盗まれると、永久に使用可能
   解決:
   - expires_delta: トークン有効期限（デフォルト15分）
   - exp: JWT の標準クレーム（有効期限）
   業務影響:
   - トークン盗難時: 最大15分後に無効化 → 被害を最小限に

3. なぜ OAuth2PasswordBearer を使うのか（L15-19）
   理由: FastAPI 標準の認証スキーム
   実装:
   - oauth2_scheme: Authorization ヘッダーから JWT トークンを抽出
   - tokenUrl: ログインエンドポイント（Swagger UI で使用）
   メリット:
   - FastAPI の依存性注入と統合
   - Swagger UI で自動的にログインフォーム表示

4. なぜ optional_oauth2_scheme があるのか（L16-19）
   理由: 認証オプショナルなエンドポイント対応
   用途:
   - get_current_user_optional(): 認証済みならユーザー情報取得、未認証なら None
   業務例:
   - 受注一覧: 認証済みなら担当サプライヤー優先表示、未認証なら全件表示
   実装:
   - auto_error=False: トークンなしでもエラーを出さない
   メリット:
   - 同じエンドポイントで認証あり/なし両方に対応

5. なぜ username と sub の両方をチェックするのか（L64-67, L103-106）
   理由: トークンペイロードの後方互換性
   背景:
   - 古いバージョン: sub フィールドにユーザー名を格納
   - 新しいバージョン: username フィールドにユーザー名を格納
   → 両方をチェックして、どちらでも動作するようにする
   実装:
   - username = payload.get("username") or payload.get("sub")
   メリット:
   - システム更新時に古いトークンも使用可能（移行期間の対応）

6. なぜ verify_password でパスワードをチェックするのか（L35-36）
   理由: ハッシュ化されたパスワードの検証
   セキュリティ:
   - データベース: password_hash（ハッシュ化済み）
   - ユーザー入力: password（平文）
   → verify_password(): bcrypt等でハッシュ比較
   実装:
   - UserService.verify_password(password, user.password_hash)
   メリット:
   - 平文パスワードをDBに保存しない → 漏洩時のリスク低減

7. なぜ get_current_user を static method にするのか（L52-75）
   理由: FastAPI の依存性注入での使用
   背景:
   - FastAPI: 依存関数は static method または関数である必要
   - self を持つインスタンスメソッド: 依存性注入で使用不可
   実装:
   - @staticmethod: インスタンス不要で呼び出し可能
   - Depends(oauth2_scheme): Authorization ヘッダーからトークン取得
   - Depends(get_db): DBセッション取得
   用途:
   - エンドポイント: current_user: User = Depends(AuthService.get_current_user)

8. なぜ credentials_exception を定義するのか（L57-61）
   理由: 標準的なHTTPエラーレスポンス
   HTTP仕様:
   - 401 Unauthorized: 認証が必要
   - WWW-Authenticate ヘッダー: 認証方式を指定（Bearer）
   実装:
   - status_code=status.HTTP_401_UNAUTHORIZED
   - headers={"WWW-Authenticate": "Bearer"}
   用途:
   - フロントエンド: 401エラーでログイン画面にリダイレクト

9. なぜ JWTError を catch するのか（L68-69, L107-108）
   理由: 不正なトークンの検出
   問題:
   - 改ざんされたトークン: 署名が一致しない → JWTError
   - 期限切れトークン: exp < 現在時刻 → JWTError
   解決:
   - try-except で JWTError を catch → credentials_exception
   業務影響:
   - 不正なトークンで認証させない → セキュリティ向上

10. なぜ get_current_user_optional は None を返すのか（L78-113）
    理由: エンドポイントで認証状態による分岐処理
    用途例:
    - current_user が None: 全データ表示
    - current_user が存在: ユーザーの担当データを優先表示
    実装:
    - token がない → None
    - JWTError → None（エラーを出さない）
    - ユーザーが見つからない → None
    業務影響:
    - ログインなしでも基本機能を使える（UX向上）
    - ログインすると追加機能・優先表示が有効化
"""

from datetime import UTC, datetime, timedelta

import jwt  # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.application.services.auth.user_service import UserService
from app.core.config import settings
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/login")
# Optional authentication scheme (does not raise error if token is missing)
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/login", auto_error=False
)


class AuthService:
    """Service for authentication and token management."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self.user_service = UserService(db)

    def authenticate_user(self, username: str, password: str) -> User | None:
        """Authenticate a user by username and password."""
        user = self.user_service.get_by_username(username)
        if not user:
            return None
        if not user.password_hash or not self.user_service.verify_password(
            password, user.password_hash
        ):
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        # Use PyJWT consistently
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
        return str(encoded_jwt)

    @staticmethod
    def get_current_user(
        token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
    ) -> User:
        """Get the current authenticated user from the token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            # Use PyJWT
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

            # Implementation alignment:
            # 1. Try "sub" as user ID (current standard in auth_router)
            # 2. Fallback to "username" or "sub" as username (legacy)
            user_id = payload.get("sub")
            username = payload.get("username")

            user: User | None = None
            user_service = UserService(db)

            if user_id and str(user_id).isdigit():
                user = user_service.get_by_id(int(user_id), raise_404=False)

            if user is None and (username or user_id):
                target_username = username or str(user_id)
                user = user_service.get_by_username(username=target_username)

            if user is None:
                raise credentials_exception
            return user

        except (jwt.PyJWTError, ValueError):
            raise credentials_exception

    @staticmethod
    def get_current_user_optional(
        token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)
    ) -> User | None:
        """Get the current user if authenticated, otherwise return None."""
        if not token:
            return None

        try:
            # Use PyJWT
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

            user_id = payload.get("sub")
            username = payload.get("username")

            user: User | None = None
            user_service = UserService(db)

            if user_id and str(user_id).isdigit():
                user = user_service.get_by_id(int(user_id), raise_404=False)

            if user is None and (username or user_id):
                target_username = username or str(user_id)
                user = user_service.get_by_username(username=target_username)

            return user

        except (jwt.PyJWTError, ValueError):
            return None
