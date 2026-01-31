/**
 * types.ts
 *
 * データベーススキーマ用の型定義
 */

export type TableInfo = {
  name: string;
  label: string;
  description: string;
};

export type TableGroup = {
  label: string;
  tables: TableInfo[];
};
