/**
 * Logger ユーティリティ
 *
 * フロントエンドのログをサーバーに送信するユーティリティ。
 * サーバーに送信できない場合はコンソールにフォールバック。
 *
 * 【設計意図】フロントエンドロガーの設計判断:
 *
 * 1. なぜフロントエンドのログをサーバーに送信するのか
 *    理由: 本番環境でのデバッグとエラー追跡
 *    業務背景:
 *    - 営業担当者が現場で使用中にエラーが発生
 *    - ブラウザのコンソールログは見られない（技術知識がない）
 *    → サーバーにログを集約し、管理者が後から確認可能
 *    メリット:
 *    - ユーザーの操作履歴を追跡可能
 *    - エラー発生時の状況（ユーザーエージェント、タイミング）を記録
 *    - 統計分析（どのエラーが多いか）でUI改善につなげる
 *
 * 2. 静的メソッドの採用（L22-38）
 *    理由: グローバルに利用可能なシングルトンロガー
 *    設計:
 *    - インスタンス化不要: Logger.info("message")
 *    - クラスレベルのメソッド → 状態を持たない
 *    代替案との比較:
 *    - インスタンス化: const logger = new Logger() → 冗長
 *    - グローバル関数: logInfo() → 名前空間がない、衝突の可能性
 *    - 静的メソッド: Logger.info() → 明確な名前空間、IDE補完
 *
 * 3. コンソール出力を残す理由（L44-47）
 *    理由: 開発時のデバッグ効率化とサーバー送信失敗時のフォールバック
 *    用途:
 *    - 開発環境: ブラウザコンソールでリアルタイム確認
 *    - 本番環境: サーバー送信失敗時もローカルに記録
 *    実装:
 *    - level に応じて console.error/warn/log を切り替え
 *    → ブラウザDevToolsで色分け表示される
 *
 * 4. ログレベルの3段階設計（L10）
 *    理由: 重要度に応じたログの分類
 *    レベル定義:
 *    - info: 通常の操作ログ（例: ページ遷移、データ取得成功）
 *    - warning: 異常だが続行可能（例: APIレスポンス遅延、非推奨機能の使用）
 *    - error: エラー発生（例: API呼び出し失敗、想定外の状態）
 *    運用:
 *    - サーバー側で error のみアラート通知
 *    - warning は日次レポートで確認
 *    - info は長期保存（分析用）
 *
 * 5. user_agent の送信理由（L53）
 *    理由: ブラウザ固有のバグ追跡
 *    業務シナリオ:
 *    - 「Chrome では動くが、Edge では動かない」
 *    → user_agent でブラウザ種類・バージョンを特定
 *    - 「Androidタブレットで表示崩れ」
 *    → モバイルデバイスの情報を取得
 *    メリット:
 *    - ブラウザ互換性問題の早期発見
 *    - 特定環境でのみ発生するバグを再現可能
 *
 * 6. 非同期送信（Promise.catch）の設計（L56-59）
 *    理由: ログ送信失敗がアプリケーションの動作を妨げないようにする
 *    動作:
 *    - http.post() は非同期で実行（await しない）
 *    → ログ送信を待たずに次の処理に進む
 *    - catch() でエラーをキャッチ → 無限ループ防止
 *    問題:
 *    - ログ送信に失敗 → サーバーにエラーログを送信しようとする
 *    → さらに失敗 → 無限ループ
 *    解決:
 *    - catch() 内では console.warn のみ（サーバー送信しない）
 *
 * 7. なぜ private static send() なのか（L43）
 *    理由: 内部実装の隠蔽とコードの重複排除
 *    設計:
 *    - public メソッド（info/warning/error）は薄いラッパー
 *    → 内部で send() を呼び出し
 *    - send() は private → 外部から直接呼べない
 *    メリット:
 *    - 共通ロジック（コンソール出力、HTTP送信）を一箇所に集約
 *    - 将来的にログフォーマット変更時、send() だけ修正すれば良い
 *
 * 8. 将来的な拡張の方向性
 *    検討中の機能:
 *    - ローカルバッファリング: オフライン時にログを溜めて、オンライン復帰時に送信
 *    - サンプリング: info ログは10%のみ送信（トラフィック削減）
 *    - コンテキスト情報: ユーザーID、現在のURL、セッション時間等を自動付与
 *    - Sentry連携: エラーログを自動的に Sentry に送信
 */

import { http } from "@/shared/api/http-client";
import { getRequestId } from "@/shared/utils/request-id";

export type LogLevel = "info" | "warning" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  user_agent: string;
  request_id?: string | null;
}

export class Logger {
  /**
   * INFOレベルのログを送信
   */
  static info(message: string): void {
    this.send("info", message);
  }

  /**
   * WARNINGレベルのログを送信
   */
  static warning(message: string): void {
    this.send("warning", message);
  }

  /**
   * ERRORレベルのログを送信
   */
  static error(message: string): void {
    this.send("error", message);
  }

  /**
   * ログをサーバーに送信
   */
  private static send(level: LogLevel, message: string): void {
    // コンソールにも出力
    const consoleMethod =
      level === "error" ? console.error : level === "warning" ? console.warn : console.log;
    consoleMethod(`[Logger][${level}]`, message);

    // サーバーに送信（非同期、失敗しても続行）
    const payload: LogPayload = {
      level,
      message,
      user_agent: navigator.userAgent,
      request_id: getRequestId(),
    };

    http.post("system/logs/client", payload).catch((e) => {
      // サーバー送信失敗時はコンソールに出力するのみ（無限ループ防止）
      console.warn("Failed to send log to server:", e);
    });
  }
}
