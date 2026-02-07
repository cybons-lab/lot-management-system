/**
 * types.ts
 *
 * データベーススキーマ用の型定義
 */

export interface TableInfo {
  name: string;
  label: string;
  description: string;
}

export interface TableGroup {
  label: string;
  tables: TableInfo[];
}
