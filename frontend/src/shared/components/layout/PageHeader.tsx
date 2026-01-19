/**
 * ページヘッダーコンポーネント
 *
 * ページのタイトルとアクションボタンを表示
 */

import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  /** ページタイトル */
  title: string;
  /** サブタイトル */
  subtitle?: string;
  /** 右側のアクションボタン */
  actions?: React.ReactNode;
  /** 戻りリンク（リンク先とラベル） */
  backLink?: {
    to: string;
    label: string;
  };
  /** 追加のクラス名 */
  className?: string;
}

/**
 * ページヘッダーコンポーネント
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="ロット管理"
 *   subtitle="在庫ロットの一覧と登録"
 *   backLink={{ to: "/masters", label: "マスタ管理" }}
 *   actions={
 *     <button onClick={handleCreate}>新規登録</button>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  backLink,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={className}>
      {backLink && (
        <Link
          to={backLink.to}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      )}
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>
    </div>
  );
}
