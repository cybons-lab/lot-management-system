/**
 * Logger ユーティリティ
 *
 * フロントエンドのログをサーバーに送信するユーティリティ。
 * サーバーに送信できない場合はコンソールにフォールバック。
 */

import { http } from "@/shared/api/http-client";

export type LogLevel = "info" | "warning" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  user_agent: string;
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
    };

    http.post("system/logs/client", payload).catch((e) => {
      // サーバー送信失敗時はコンソールに出力するのみ（無限ループ防止）
      console.warn("Failed to send log to server:", e);
    });
  }
}
