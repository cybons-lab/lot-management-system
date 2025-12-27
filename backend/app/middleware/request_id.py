"""リクエストID管理ミドルウェア.

【設計意図】リクエストIDミドルウェアの設計判断:

1. なぜリクエストIDが必要なのか
   理由: 分散ログの追跡とトラブルシューティング
   業務的背景:
   - 自動車部品商社: 営業担当が「受注登録でエラーが出た」と報告
   → どのリクエストか特定できない
   問題:
   - バックエンドログ: 複数リクエストが並行処理
   → どのログ行がどのリクエストに対応するか不明
   解決:
   - 各リクエストに一意のID（UUID）を付与
   → 全ログにリクエストIDを記録
   → ログ検索で特定リクエストの全処理を追跡可能

2. UUID v4 の選択理由（L35）
   理由: 衝突なし、セキュアな一意性
   代替案との比較:
   - 連番（1, 2, 3, ...）:
     × 推測可能、セキュリティリスク
     × 複数サーバーで衝突の可能性
   - タイムスタンプ:
     × 同時リクエストで衝突
   - UUID v4（ランダム生成）:
     ◯ 衝突確率が極めて低い（2^122 通り）
     ◯ 推測不可能
     ◯ 複数サーバーでも安全
   業務的意義:
   - リクエストIDでログ検索
   → 顧客対応時に迅速に問題特定

3. なぜヘッダーから既存IDを読み取るのか（L35）
   理由: フロントエンドからのリクエスト追跡
   シナリオ:
   - フロントエンド: axios インターセプターでリクエストID生成
   → X-Request-ID ヘッダーに設定
   - バックエンド: 既存IDを再利用
   → フロントエンド〜バックエンドで同じIDで追跡
   メリット:
   - ブラウザコンソールのエラーログとバックエンドログを紐付け
   - エンドツーエンドのリクエスト追跡
   フォールバック:
   - ヘッダーがない場合: UUID v4 を新規生成
   → APIクライアントがIDを設定しなくても動作

4. request.state への保存（L38）
   理由: 後続のミドルウェア・ハンドラーで利用可能
   用途:
   - RequestLoggingMiddleware: ログにリクエストIDを含める
   - 例外ハンドラ: エラーレスポンスにリクエストIDを含める
   - ビジネスロジック: 処理トレースでリクエストIDを記録
   実装:
   - request.state: Starlette の仕組み
   → リクエストスコープの変数保存領域
   メリット:
   - グローバル変数不要
   - リクエスト間でデータが混ざらない

5. レスポンスヘッダーへの追加（L44）
   理由: フロントエンドでのエラーレポート
   用途:
   - フロントエンド: エラー発生時にリクエストIDを取得
   → ユーザーに「リクエストID: xxx でエラー発生」と表示
   → サポート問い合わせ時にリクエストIDを提供
   - 管理者: リクエストIDでバックエンドログを検索
   → 問題の根本原因を特定
   業務シナリオ:
   - 営業担当: 「リクエストID: abc-123-def でエラーが出ました」
   → システム管理者: ログ検索「abc-123-def」
   → 該当リクエストの全ログを確認し、原因特定

6. なぜ BaseHTTPMiddleware を使うのか
   理由: FastAPI/Starlette の標準ミドルウェア実装パターン
   メリット:
   - dispatch() メソッドのみ実装すればよい
   - call_next(request) で次のミドルウェア/ハンドラーを呼び出し
   - 前処理（リクエスト処理前）と後処理（レスポンス処理後）を分離可能
   実装:
   - L35-38: 前処理（リクエストID生成・保存）
   - L41: 次の処理を実行
   - L44: 後処理（レスポンスヘッダー追加）
   - L46: レスポンス返却

7. なぜ main.py で最初に登録するのか
   理由: 全ての処理でリクエストIDを利用可能にする
   main.py での登録順:
   - CORS → Metrics → RequestLogging → RequestID
   実行順（逆順）:
   - RequestID → RequestLogging → Metrics → CORS
   影響:
   - RequestID が最初に実行
   → request.state.request_id が全ミドルウェアで利用可能
   - RequestLoggingMiddleware: リクエストIDを含むログ出力
   - MetricsMiddleware: リクエストIDでメトリクス追跡
   重要性:
   - 順序を間違えると、ログにリクエストIDが含まれない
   → トラブルシューティングが困難

8. header_name のカスタマイズ可能性（L14, L19-22）
   理由: 環境や標準に応じた柔軟性
   デフォルト: \"X-Request-ID\"
   カスタマイズ例:
   - \"X-Correlation-ID\" （マイクロサービス環境）
   - \"X-Trace-ID\" （分散トレーシング）
   用途:
   - 既存システムとの統合
   - 社内標準への準拠
   実装:
   - __init__() で header_name を受け取る
   → main.py での初期化時に指定可能

9. セキュリティ考慮事項
   理由: リクエストIDの悪用防止
   設計:
   - フロントエンドからのIDを信頼（L35）
   → しかし、UUID形式のため推測不可能
   - ID自体に機密情報を含めない
   → UUID v4 はランダム値のみ
   リスク:
   - 悪意あるクライアント: 偽のリクエストIDを送信
   → ログ検索で混乱の可能性
   対策:
   - UUID形式の検証（今後の改善案）
   - 不正な形式の場合は新規生成

10. パフォーマンス考慮
    理由: 全リクエストで実行されるため高速化が重要
    実装:
    - uuid.uuid4(): ミリ秒以下で生成（高速）
    - request.state への保存: メモリアクセスのみ（高速）
    - レスポンスヘッダー追加: O(1) 操作（高速）
    影響:
    - レスポンスタイムへの影響: 1ms 未満（無視可能）
    → リクエスト追跡の利便性 >> わずかなオーバーヘッド
"""

import uuid
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RequestIdMiddleware(BaseHTTPMiddleware):
    """リクエストID管理ミドルウェア.

    各リクエストに一意のIDを割り当て、レスポンスヘッダーとリクエスト状態に保存。
    """

    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID"):
        """初期化.

        Args:
            app: ASGIアプリケーション
            header_name: リクエストIDを格納するヘッダー名
        """
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request, call_next: Callable):
        """リクエストIDを生成/取得し、レスポンスに付与.

        Args:
            request: HTTPリクエスト
            call_next: 次のミドルウェア/ハンドラ

        Returns:
            HTTPレスポンス
        """
        # リクエストIDを取得または生成
        req_id = request.headers.get(self.header_name) or str(uuid.uuid4())

        # リクエスト状態に保存（他のミドルウェアやハンドラで使用可能）
        request.state.request_id = req_id

        # リクエストを処理
        response = await call_next(request)

        # レスポンスヘッダーにリクエストIDを追加
        response.headers[self.header_name] = req_id

        return response
