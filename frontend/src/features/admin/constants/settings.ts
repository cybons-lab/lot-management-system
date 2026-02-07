import type { SettingConfig } from "../types";

export const SETTING_CONFIGS: Record<string, SettingConfig> = {
    enable_db_browser: {
        label: "DBブラウザの有効化",
        type: "boolean",
        category: "debug",
        description: "DBの中身を直接ブラウザで確認できるようにします。",
    },
    maintenance_mode: {
        label: "メンテナンスモード",
        type: "boolean",
        category: "system",
        description: "有効にすると、管理者以外のアクセスを遮断しメンテナンス画面を表示します。",
    },
    log_level: {
        label: "ログレベル",
        type: "select",
        category: "system",
        description: "バックエンドのログ出力レベルを変更します。",
        options: [
            { label: "DEBUG", value: "DEBUG" },
            { label: "INFO", value: "INFO" },
            { label: "WARNING", value: "WARNING" },
            { label: "ERROR", value: "ERROR" },
        ],
    },
    page_visibility: {
        label: "ページ表示制御",
        type: "json",
        category: "security",
        description:
            "一般ユーザーに対する機能ごとの表示/非表示を制御します。ゲストユーザーの権限は固定されており変更できません。管理者は常にすべての機能にアクセス可能です。",
    },
    // SQL Profiler
    sql_profiler_enabled: {
        label: "SQLプロファイラ有効化",
        type: "boolean",
        category: "debug",
        description: "API毎のSQL実行数・時間を計測し、ログに出力します。",
    },
    sql_profiler_threshold_count: {
        label: "SQL実行数・警告しきい値",
        type: "number",
        category: "debug",
        description: "1リクエストでこの回数を超えると警告ログを出します（デフォルト: 10）。",
    },
    sql_profiler_threshold_time: {
        label: "SQL実行時間・警告しきい値(ms)",
        type: "number",
        category: "debug",
        description: "1リクエストでこの時間を超えると警告ログを出します（デフォルト: 500ms）。",
    },
    sql_profiler_n_plus_one_threshold: {
        label: "N+1検知・重複しきい値",
        type: "number",
        category: "debug",
        description:
            "同一形状のSQLがこの回数を超えて実行されるとN+1として警告します（デフォルト: 5）。",
    },
    sql_profiler_normalize_literals: {
        label: "SQLリテラル正規化",
        type: "boolean",
        category: "debug",
        description: "N+1検知時に数値や文字列リテラルを同一視するかどうか（デフォルト: 有効）。",
    },
};
