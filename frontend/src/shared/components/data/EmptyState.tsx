/**
 * 空状態表示コンポーネント
 */

import React from "react";

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, message, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-lg border bg-white p-12 text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}

      {title && <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>}

      <p className="mb-4 text-sm text-gray-600">{message}</p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
