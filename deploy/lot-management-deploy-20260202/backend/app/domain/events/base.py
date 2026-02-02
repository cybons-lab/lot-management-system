# backend/app/domain/events/base.py
"""Base class for domain events.

【設計意図】ドメインイベントパターンの設計判断:

1. なぜドメインイベントパターンを採用したのか
   理由: ビジネスロジックの疎結合化と監査ログの実現
   業務要件:
   - 在庫変動時に複数の処理が連鎖する
     例: ロット入庫 → 在庫数更新 → 引当候補に追加 → 通知送信
   → 各処理を直接呼び出すと、密結合で変更が困難
   → イベント駆動にすると、各ハンドラーが独立して処理可能

   監査要件:
   - 自動車部品業界では、トレーサビリティが法的要件
   - 「いつ、誰が、何を、どう変更したか」の記録が必須
   → ドメインイベントを永続化することで、完全な監査ログを実現

2. なぜ dataclass(frozen=True) を使うのか（L11）
   理由: イベントの不変性保証（Event Sourcing の原則）
   設計原則:
   - イベントは「発生した事実」を表す
   - 事実は変更不可能（過去の歴史は書き換えられない）
   → frozen=True で、イベント作成後の変更を禁止
   メリット:
   - 誤ってイベントを変更するバグを防止
   - マルチスレッド環境でも安全（不変オブジェクトはスレッドセーフ）

3. event_id に UUID を使う理由（L23）
   理由: グローバルに一意なIDの生成
   業務シナリオ:
   - 複数のサーバーで同時にイベントが発生
   - 各サーバーで独立してIDを生成しても、衝突しない
   → UUID は統計的に一意性が保証される
   代替案との比較:
   - 連番ID: データベースのシーケンス依存、分散環境で衝突
   - UUID: データベース不要、分散環境でも安全

4. occurred_at に UTC を使う理由（L24）
   理由: タイムゾーンによる混乱を防ぐ
   業務背景:
   - 自動車部品商社は、日本国内の複数拠点で運用
   - 将来的に海外拠点も視野に入れる
   → サーバータイムゾーンに依存せず、UTC で統一
   運用:
   - データベースに UTC で保存
   - 表示時にユーザーのタイムゾーンに変換（フロントエンド）

5. to_dict() の設計（L26-33）
   理由: イベントのシリアライズ（永続化・メッセージング用）
   用途:
   - データベースに JSON 形式で保存
   - メッセージキュー（将来的に RabbitMQ 等）に送信
   - ログファイルに出力
   実装:
   - event_type を自動的に追加（クラス名から取得）
   → デシリアライズ時にどのイベントクラスか判別可能
   - 全フィールドを展開（**{k: v ...}）
   → サブクラスの独自フィールドも自動的に含まれる

6. event_type プロパティの存在理由（L35-38）
   理由: イベントの種類を文字列で取得
   用途:
   - イベントハンドラーのルーティング
   例:
   ```python
   if event.event_type == "StockAdjusted":
       handle_stock_adjusted(event)
   ```
   - ログ出力やメトリクス収集
   → "StockAdjusted イベントが100回発生" など

7. dataclass のメリット
   理由: ボイラープレートコード削減
   dataclass が自動生成するもの:
   - __init__(): コンストラクタ
   - __repr__(): デバッグ用の文字列表現
   - __eq__(): 同値比較
   → 手動で書くと数十行のコードが、@dataclass 一行で済む
   可読性:
   - フィールド定義が明確（型ヒント付き）
   - ビジネスロジックに集中できる

8. default_factory の使用理由（L23-24）
   理由: インスタンスごとに異なる値を生成
   誤り:
   ```python
   event_id: str = str(uuid4())  # クラス定義時に1回だけ実行
   ```
   → 全インスタンスが同じ UUID を持つ（バグ）
   正解:
   ```python
   event_id: str = field(default_factory=lambda: str(uuid4()))
   ```
   → インスタンス作成時に毎回実行され、異なる UUID が生成される
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4


@dataclass(frozen=True)
class DomainEvent:
    """ドメインイベントの基底クラス.

    全てのドメインイベントはこのクラスを継承する。
    イミュータブル（frozen=True）で、発生した事実を表現する。

    Attributes:
        event_id: イベントの一意識別子
        occurred_at: イベント発生日時（UTC）
    """

    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict:
        """イベントを辞書形式に変換."""
        return {
            "event_id": self.event_id,
            "event_type": self.__class__.__name__,
            "occurred_at": self.occurred_at.isoformat(),
            **{k: v for k, v in self.__dict__.items() if k not in ("event_id", "occurred_at")},
        }

    @property
    def event_type(self) -> str:
        """イベントタイプ名を返す."""
        return self.__class__.__name__
