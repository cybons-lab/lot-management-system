# backend/app/schemas/base.py
"""Pydantic Base Schemas 共通の基底スキーマ.

【設計意図】スキーマ基底クラスの設計判断:

1. なぜ共通の基底スキーマを作るのか
   理由: 全スキーマで共通の設定を一元管理
   背景:
   - Pydantic v2.x: model_config で設定を管理
   - from_attributes=True: ORMモデルから直接データを取得可能
   → 全スキーマで同じ設定を繰り返すのは非効率
   解決:
   - BaseSchema を継承することで、設定を1箇所で管理
   メリット:
   - 設定変更時の影響範囲を最小化
   - コードの重複排除

2. from_attributes=True の意義（L12）
   理由: ORMモデルから Pydantic スキーマへの自動変換
   動作:
   - Pydantic v1.x: orm_mode=True
   - Pydantic v2.x: from_attributes=True（新仕様）
   使用例:
   ```python
   # ORMモデル
   lot = db.query(Lot).first()  # SQLAlchemy model

   # Pydantic スキーマへ変換
   schema = LotResponse.model_validate(lot)  # from_attributes で自動変換
   ```
   メリット:
   - 手動でdict変換不要
   - タイプセーフな変換

3. TimestampMixin の設計（L15-19）
   理由: タイムスタンプフィールドの再利用
   フィールド:
   - created_at: 作成日時（必須）
   - updated_at: 更新日時（オプション）
   使用例:
   ```python
   class LotResponse(BaseSchema, TimestampMixin):
       id: int
       lot_number: str
       # created_at, updated_at は TimestampMixin から継承
   ```
   メリット:
   - 全エンティティで同じタイムスタンプフィールド定義を共有
   - DRY（Don't Repeat Yourself）原則

4. なぜ updated_at は Optional なのか（L19）
   理由: 作成直後はまだ更新されていない
   業務ルール:
   - 新規作成時: created_at のみ設定、updated_at は None
   - 更新時: updated_at を現在時刻に更新
   実装:
   - datetime | None = None
   → デフォルト値 None、更新時に値を設定

5. ResponseBase の設計（L22-27）
   理由: API レスポンスの統一フォーマット
   フィールド:
   - success: bool → 成功/失敗の明示
   - message: str | None → エラーメッセージ or 成功メッセージ
   - data: dict | None → レスポンスデータ（任意）
   使用例:
   ```python
   # 成功レスポンス
   return ResponseBase(success=True, message="作成しました", data={"id": 123})

   # エラーレスポンス
   return ResponseBase(success=False, message="在庫が不足しています")
   ```
   メリット:
   - フロントエンドで統一的なエラーハンドリング
   - success フラグで成功/失敗を明確に判定

6. なぜ message と data は Optional なのか（L26-27）
   理由: 用途によって不要な場合がある
   使い分け:
   - message のみ: エラー通知（data 不要）
   - data のみ: 成功時のデータ返却（message 不要）
   - 両方: 成功メッセージ + データ
   柔軟性:
   - 必須フィールドを最小限にすることで、様々なケースに対応

7. BaseModel 継承の階層設計
   理由: Pydantic の基本機能を全て利用
   継承階層:
   - Pydantic BaseModel（Pydantic提供）
   → BaseSchema（プロジェクト共通設定）
   → 個別スキーマ（LotResponse等）
   メリット:
   - Pydantic の全機能（バリデーション、シリアライズ等）を利用
   - プロジェクト固有の設定を BaseSchema に集約

8. なぜ Mixin パターンを使うのか（L15）
   理由: 多重継承による柔軟な組み合わせ
   使用例:
   ```python
   # タイムスタンプあり
   class LotResponse(BaseSchema, TimestampMixin): ...

   # タイムスタンプなし
   class LotCreateRequest(BaseSchema): ...
   ```
   メリット:
   - 必要な機能のみを選択的に継承
   - 単一継承の制約を回避

9. ConfigDict の使用理由（L12）
   理由: Pydantic v2.x の新しい設定方式
   変更点:
   - Pydantic v1.x: class Config 内部クラスで設定
   - Pydantic v2.x: model_config = ConfigDict(...) で設定
   メリット:
   - 型安全な設定（IDE補完が効く）
   - 設定の可視性向上

10. シンプルな設計の意図
    理由: 基底クラスは最小限の機能のみ
    設計原則:
    - YAGNI: 必要になるまで機能を追加しない
    - 現在必要な機能: from_attributes, タイムスタンプ, 共通レスポンス
    → 将来的に必要になれば追加
    メリット:
    - 理解しやすい、保守しやすい
    - 過度な抽象化を避ける
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """共通基底スキーマ."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TimestampMixin(BaseModel):
    """タイムスタンプミックスイン."""

    created_at: datetime
    updated_at: datetime | None = None


class ResponseBase(BaseModel):
    """API共通レスポンス."""

    success: bool
    message: str | None = None
    data: dict | None = None
