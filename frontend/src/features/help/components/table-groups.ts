/**
 * table-groups.ts
 *
 * データベーステーブルのグループ定義
 */

export const TABLE_GROUPS = {
  core: {
    label: "コア（在庫・受注）",
    tables: [
      {
        name: "lot_receipts",
        label: "ロット入荷実体",
        description: "個別の入荷記録を管理。在庫の単一ソース",
      },
      {
        name: "lot_master",
        label: "ロットマスタ",
        description: "ロット番号の重複排除用マスタ",
      },
      {
        name: "orders",
        label: "受注ヘッダ",
        description: "受注の基本情報",
      },
      {
        name: "order_lines",
        label: "受注明細",
        description: "受注の商品明細",
      },
      {
        name: "lot_reservations",
        label: "ロット引当",
        description: "ロットと受注の引当関係",
      },
    ],
  },
  masters: {
    label: "マスタ",
    tables: [
      {
        name: "supplier_items",
        label: "仕入先品目",
        description: "メーカー品番マスタ（在庫実体の業務キー）",
      },
      {
        name: "customer_items",
        label: "得意先品番",
        description: "先方品番からメーカー品番への変換マスタ",
      },
      {
        name: "suppliers",
        label: "仕入先",
        description: "仕入先マスタ",
      },
      {
        name: "customers",
        label: "得意先",
        description: "得意先マスタ",
      },
      {
        name: "warehouses",
        label: "倉庫",
        description: "倉庫マスタ",
      },
    ],
  },
  inbound: {
    label: "入荷計画",
    tables: [
      {
        name: "inbound_plans",
        label: "入荷計画ヘッダ",
        description: "入荷計画の基本情報",
      },
      {
        name: "inbound_plan_lines",
        label: "入荷計画明細",
        description: "入荷計画の商品明細",
      },
      {
        name: "expected_lots",
        label: "入荷予定ロット",
        description: "入荷予定ロット情報",
      },
    ],
  },
  rpa: {
    label: "RPA・OCR",
    tables: [
      {
        name: "ocr_results",
        label: "OCR結果",
        description: "OCRで読み取った受注データ",
      },
      {
        name: "cloud_flow_jobs",
        label: "RPAジョブ",
        description: "Power Automate Cloud Flowジョブ管理",
      },
      {
        name: "smartread_jobs",
        label: "SmartReadジョブ",
        description: "SmartRead OCRジョブ管理",
      },
    ],
  },
  system: {
    label: "システム",
    tables: [
      {
        name: "users",
        label: "ユーザー",
        description: "システムユーザー",
      },
      {
        name: "stock_history",
        label: "在庫履歴",
        description: "在庫変動の不変イベントログ",
      },
      {
        name: "batch_jobs",
        label: "バッチジョブ",
        description: "バッチ処理の実行管理",
      },
    ],
  },
} as const;
