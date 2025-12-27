# backend/app/domain/order/business_rules.py
"""受注ドメインのビジネスルール.

【設計意図】ビジネスルールクラスの設計判断:

1. なぜビジネスルールを独立したクラスに分離するのか
   理由: ドメイン駆動設計（DDD）の原則に従った設計
   分離のメリット:
   - ビジネスロジックがドメイン層に集約される
   - サービス層やリポジトリ層から独立してテスト可能
   - ビジネスルール変更時の影響範囲が明確
   例:
   - 数量バリデーションルールが変更（負数許可 → 正数のみ）
   → OrderBusinessRules のメソッドのみ修正すれば良い
   → サービス層やコントローラー層は無変更

2. 静的メソッドの採用（@staticmethod）
   理由: 状態を持たないユーティリティメソッド
   設計:
   - インスタンス変数を持たない（self を使わない）
   → 静的メソッドとして定義
   使用例:
   ```python
   OrderBusinessRules.validate_quantity(100, "P-001")
   # インスタンス化不要
   ```
   メリット:
   - シンプルな呼び出し
   - メモリ効率が良い（インスタンス生成不要）
   - 関数的プログラミングの原則に準拠（副作用なし）

3. OrderValidationError の使用
   理由: ドメイン固有の例外で詳細なエラー情報を提供
   階層:
   - Exception（Python標準）
   → DomainError（アプリ共通）
   → OrderValidationError（受注ドメイン固有）
   メリット:
   - 呼び出し側で OrderValidationError をキャッチして適切に処理
   - ドメインエラーと技術的エラー（DB接続失敗等）を区別可能
   - エラーメッセージに業務的文脈を含められる
"""

from datetime import date

from .exceptions import OrderValidationError


class OrderBusinessRules:
    """受注のビジネスルール.

    【設計意図】各バリデーションルールの設計判断:

    1. validate_order_no（L13-26）
       理由: 受注番号は必須かつ適切な長さに制限
       業務要件:
       - 空白のみの受注番号は無効（.strip() で検証）
       → データベースに意味のない空白データが入るのを防ぐ
       - 最大50文字: データベース設計との整合性
       → 得意先システムから来る受注番号を想定
       エラーメッセージ:
       - 英語メッセージ: API レスポンス用（国際化対応）
       - フロントエンドで日本語に変換

    2. validate_quantity（L29-42）
       理由: 数量は正の数のみ許可
       業務背景:
       - 自動車部品の受注で負数は業務的に意味がない
       - ゼロも無効（受注がない場合は明細を作成しない）
       例外:
       - 返品処理: 別のエンティティ（ReturnOrder）で管理
       → 受注と返品を明確に分離
       エラーメッセージ:
       - product_code を含めることで、どの製品でエラーか特定可能

    3. validate_due_date（L45-58）
       理由: 納期は受注日以降でなければならない
       業務ロジック:
       - 受注日より前の納期は論理的に矛盾
       - 例: 2024-12-01 に受注して、2024-11-30 納期 → 不可能
       柔軟性:
       - due_date が None の場合はチェックしない
       → 納期未定の受注も許容（見込み生産等）
       運用:
       - 当日納期: 受注日 = 納期は許可（緊急対応）

    4. calculate_progress_percentage（L61-75）
       理由: 進捗率の計算ロジックを一元管理
       計算式:
       - (引当済み数量 / 総数量) * 100
       境界値処理:
       - min(100.0, max(0.0, progress)): 0-100% の範囲に制限
       → 丸め誤差等で 100.01% にならないようにする
       - total_qty <= 0: 進捗率 0%
       → ゼロ除算エラー防止
       業務的意義:
       - ダッシュボードで進捗を可視化
       - 「80%以上引当済み」等のフィルタリングに使用
    """

    @staticmethod
    def validate_order_no(order_no: str) -> None:
        """受注番号のバリデーション.

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
        """数量のバリデーション.

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
    def validate_due_date(due_date: date | None, order_date: date) -> None:
        """納期のバリデーション.

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
    def calculate_progress_percentage(total_qty: float, allocated_qty: float) -> float:
        """進捗率を計算.

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
